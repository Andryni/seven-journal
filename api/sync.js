import https from 'https';

export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    try {
        console.log('[SYNC] Starting global synchronization...');
        
        // 1. Fetch MetaApi accounts
        const metaAccountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const metaAccounts = await metaAccountsRes.json();

        // 2. Fetch Myfxbook accounts
        const mfAccountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?myfxbook_account_id=not.is.null&select=*`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const mfAccounts = await mfAccountsRes.json();

        const report = [];
        const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        // --- Process MetaApi ---
        for (const acc of metaAccounts) {
            const accReport = { accountId: acc.id, method: 'metaapi', status: 'monitoring', dealsFound: 0, error: null };
            try {
                let accountInfo = await callApi('mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai', `/users/current/accounts/${acc.metaapi_account_id}`, { 'auth-token': metaToken });
                
                if (accountInfo.state === 'UNDEPLOYED') {
                    await callApi('mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai', `/users/current/accounts/${acc.metaapi_account_id}/deploy`, { 'auth-token': metaToken }, 'POST');
                    accountInfo = await callApi('mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai', `/users/current/accounts/${acc.metaapi_account_id}`, { 'auth-token': metaToken });
                }

                if (accountInfo.state === 'DEPLOYED') {
                    const region = accountInfo.region || 'agiliumtrade';
                    const host = `mt-client-api-v1.${region === 'agiliumtrade' ? 'agiliumtrade' : region}.agiliumtrade.ai`;
                    const history = await callApi(host, `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`, { 'auth-token': metaToken });
                    
                    if (Array.isArray(history) && history.length > 0) {
                        accReport.dealsFound = history.length;
                        await processAndSaveMetaTrades(history, acc, supabaseUrl, supabaseKey);
                    }
                }
                accReport.status = accountInfo.state || 'OK';
            } catch (e) { accReport.error = e.message; }
            report.push(accReport);
        }

        // --- Process Myfxbook ---
        for (const acc of mfAccounts) {
            const accReport = { accountId: acc.id, method: 'myfxbook', status: 'monitoring', dealsFound: 0, error: null };
            try {
                if (!acc.myfxbook_email || !acc.myfxbook_password) throw new Error('Missing Myfxbook credentials');

                // Login
                const loginData = await callApi('www.myfxbook.com', `/api/login.json?email=${encodeURIComponent(acc.myfxbook_email)}&password=${encodeURIComponent(acc.myfxbook_password)}`);
                if (loginData.error === 'true' || !loginData.session) throw new Error(loginData.message || 'Login failed');

                // Fetch History
                const historyData = await callApi('www.myfxbook.com', `/api/get-history.json?session=${loginData.session}&id=${acc.myfxbook_account_id}`);
                if (historyData.error === 'true') throw new Error(historyData.message || 'Fetch failed');

                const trades = historyData.history || [];
                accReport.dealsFound = trades.length;

                if (trades.length > 0) {
                    await processAndSaveMfTrades(trades, acc, supabaseUrl, supabaseKey);
                }
                accReport.status = 'OK';
            } catch (e) { accReport.error = e.message; }
            report.push(accReport);
        }

        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callApi(hostname, path, headers = {}, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = { hostname, path, method, headers: { 'User-Agent': 'SevenJournal/1.0', ...headers }, timeout: 30000 };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { resolve(body); }
            });
        });
        req.on('error', e => reject(e));
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}

async function processAndSaveMetaTrades(deals, acc, supabaseUrl, supabaseKey) {
    const positions = {};
    deals.forEach(deal => {
        if (!deal.positionId) return;
        if (!positions[deal.positionId]) positions[deal.positionId] = { d: [], p: 0, c: 0, s: 0 };
        positions[deal.positionId].d.push(deal);
        positions[deal.positionId].p += (deal.profit || 0);
        positions[deal.positionId].c += (deal.commission || 0);
        positions[deal.positionId].s += (deal.swap || 0);
    });

    for (const pid in positions) {
        const p = positions[pid];
        const exit = p.d.find(d => d.entryType.includes('OUT'));
        const entry = p.d.find(d => d.entryType.includes('IN')) || p.d[0];
        if (exit) {
            const trade = {
                account_id: acc.id, user_id: acc.user_id,
                pair: exit.symbol, position: entry.type.includes('BUY') ? 'BUY' : 'SELL',
                entry_price: entry.price, exit_price: exit.price, lot_size: entry.volume,
                result: p.p >= 0 ? 'TP' : 'SL', pnl: p.p, commission: p.c, swap: p.s,
                net_pnl: (p.p + p.c + p.s).toFixed(2), opened_at: entry.time, closed_at: exit.time,
                external_id: `metaapi_pos_${pid}`, tags: ['Automated']
            };
            await upsertTrade(trade, supabaseUrl, supabaseKey);
        }
    }
}

async function processAndSaveMfTrades(trades, acc, supabaseUrl, supabaseKey) {
    for (const trade of trades) {
        const externalId = `mf_${acc.myfxbook_account_id}_${trade.openTime}_${trade.symbol}_${trade.profit}`;
        const pnl = parseFloat(trade.profit);
        const comm = parseFloat(trade.commission || 0);
        const swap = parseFloat(trade.interest || 0);
        
        const payload = {
            account_id: acc.id, user_id: acc.user_id,
            pair: trade.symbol, position: trade.action?.toUpperCase().includes('BUY') ? 'BUY' : 'SELL',
            entry_price: trade.openPrice, exit_price: trade.closePrice, lot_size: trade.lots || 0.01,
            result: pnl >= 0 ? 'TP' : 'SL', pnl: pnl, commission: comm, swap: swap,
            net_pnl: (pnl + comm + swap).toFixed(2),
            opened_at: new Date(trade.openTime).toISOString(),
            closed_at: new Date(trade.closeTime).toISOString(),
            external_id: externalId, tags: ['Automated', 'Myfxbook']
        };
        await upsertTrade(payload, supabaseUrl, supabaseKey);
    }
}

async function upsertTrade(trade, supabaseUrl, supabaseKey) {
    await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(trade)
    });
}
