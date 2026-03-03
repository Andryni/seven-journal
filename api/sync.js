import https from 'https';

export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    try {
        const accountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const accounts = await accountsRes.json();

        const report = [];
        const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        for (const acc of accounts) {
            const accReport = {
                accountId: acc.id,
                metaStatus: 'unknown',
                action: 'monitoring',
                dealsFound: 0,
                error: null
            };

            try {
                // 1. Get current status
                let accountInfo = await callMetaApi(
                    'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}`,
                    metaToken, 'GET'
                );

                accReport.metaStatus = accountInfo?.state || 'N/A';

                // 2. CRITICAL: If UNDEPLOYED, try to Deploy it!
                if (accReport.metaStatus === 'UNDEPLOYED') {
                    accReport.action = 'deploying_started';
                    await callMetaApi(
                        'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
                        `/users/current/accounts/${acc.metaapi_account_id}/deploy`,
                        metaToken, 'POST'
                    );
                    // Refresh status after deploy command
                    accountInfo = await callMetaApi(
                        'mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai',
                        `/users/current/accounts/${acc.metaapi_account_id}`,
                        metaToken, 'GET'
                    );
                    accReport.metaStatus = accountInfo?.state || 'DEPLOYING';
                }

                // 3. Fetch History only if DEPLOYED
                if (accReport.metaStatus === 'DEPLOYED') {
                    const historyData = await callMetaApi(
                        'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
                        `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`,
                        metaToken, 'GET'
                    );
                    accReport.dealsFound = Array.isArray(historyData) ? historyData.length : 0;

                    // Reconstruction & Save logic...
                    if (accReport.dealsFound > 0) {
                        const positions = {};
                        historyData.forEach(deal => {
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
                                    result: p.p >= 0 ? 'TP' : 'SL', pnl: p.p, commission: p.c,
                                    net_pnl: (p.p + p.c + p.s).toFixed(2), opened_at: entry.time, closed_at: exit.time,
                                    external_id: `metaapi_pos_${pid}`, tags: ['Automated']
                                };
                                await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'resolution=merge-duplicates' },
                                    body: JSON.stringify(trade)
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                accReport.error = e.message;
            }
            report.push(accReport);
        }
        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function callMetaApi(hostname, path, token, method = 'GET') {
    return new Promise((resolve) => {
        const options = {
            hostname, path, method,
            headers: { 'auth-token': token, 'User-Agent': 'SevenJournal/1.0', 'Content-Length': 0 },
            timeout: 20000
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ success: true }); }
            });
        });
        req.on('error', e => resolve({ error: e.message }));
        req.end();
    });
}
