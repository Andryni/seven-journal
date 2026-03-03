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
        // Look back 90 days to be absolutely sure we don't miss anything
        const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        for (const acc of accounts) {
            const accReport = {
                accountId: acc.id,
                metaId: acc.metaapi_account_id,
                dealsFound: 0,
                openFound: 0,
                savedInDB: 0,
                error: null
            };

            try {
                // 1. Fetch History
                const historyData = await callMetaApi(
                    'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`,
                    metaToken
                );

                if (historyData?.error) {
                    accReport.error = historyData.error;
                } else {
                    accReport.dealsFound = Array.isArray(historyData) ? historyData.length : 0;

                    // Reconstruction logic
                    const positions = {};
                    (historyData || []).forEach(deal => {
                        if (!deal.positionId) return;
                        if (!positions[deal.positionId]) positions[deal.positionId] = { deals: [], p: 0, c: 0, s: 0 };
                        positions[deal.positionId].deals.push(deal);
                        positions[deal.positionId].p += (deal.profit || 0);
                        positions[deal.positionId].c += (deal.commission || 0);
                        positions[deal.positionId].s += (deal.swap || 0);
                    });

                    for (const pid in positions) {
                        const p = positions[pid];
                        const exit = p.deals.find(d => d.entryType.includes('OUT'));
                        const entry = p.deals.find(d => d.entryType.includes('IN')) || p.deals[0];
                        if (exit) {
                            const trade = {
                                account_id: acc.id,
                                user_id: acc.user_id,
                                pair: exit.symbol,
                                position: entry.type.includes('BUY') ? 'BUY' : 'SELL',
                                entry_price: entry.price,
                                exit_price: exit.price,
                                lot_size: entry.volume,
                                result: p.p >= 0 ? 'TP' : 'SL',
                                pnl: p.p,
                                commission: p.c,
                                net_pnl: (p.p + p.c + p.s).toFixed(2),
                                opened_at: entry.time,
                                closed_at: exit.time,
                                external_id: `metaapi_pos_${pid}`,
                                tags: ['Automated']
                            };
                            const up = await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': supabaseKey,
                                    'Authorization': `Bearer ${supabaseKey}`,
                                    'Prefer': 'resolution=merge-duplicates'
                                },
                                body: JSON.stringify(trade)
                            });
                            if (up.ok) accReport.savedInDB++;
                        }
                    }
                }

                // 2. Fetch Open Positions
                const openData = await callMetaApi(
                    'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}/positions`,
                    metaToken
                );
                if (Array.isArray(openData)) {
                    accReport.openFound = openData.length;
                    for (const pos of openData) {
                        const trade = {
                            account_id: acc.id,
                            user_id: acc.user_id,
                            pair: pos.symbol,
                            position: pos.type.includes('BUY') ? 'BUY' : 'SELL',
                            entry_price: pos.openPrice,
                            lot_size: pos.volume,
                            result: 'Running',
                            pnl: pos.profit,
                            net_pnl: (pos.profit + (pos.commission || 0) + (pos.swap || 0)).toFixed(2),
                            opened_at: pos.time,
                            external_id: `metaapi_open_${pos.id}`,
                            tags: ['Automated', 'Running']
                        };
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

async function callMetaApi(hostname, path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname, path, method: 'GET',
            headers: { 'auth-token': token, 'User-Agent': 'SevenJournal/1.0' },
            timeout: 20000
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ error: 'Data parse error' }); }
            });
        });
        req.on('error', e => resolve({ error: e.message }));
        req.end();
    });
}
