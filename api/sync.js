import https from 'https';

/**
 * Super-Verbose Sync: History + Open Positions with detailed reporting.
 */
export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({ error: 'System configuration incomplete on Vercel.' });
    }

    try {
        console.log('[SYNC] Starting Global Refresh...');

        // 1. Fetch accounts to sync from Supabase
        const accountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const accounts = await accountsRes.json();

        if (!accounts || accounts.length === 0) {
            return res.status(200).json({ success: true, message: 'No accounts to sync.' });
        }

        const report = [];
        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        for (const acc of accounts) {
            const accReport = { accountId: acc.id, dealsFound: 0, syncStatus: 'idle', saved: 0, errors: [] };

            try {
                // 2. Fetch History Deals (Using LONDON region for reliability)
                const historyData = await callMetaApi(
                    'mt-client-api-v1.london.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`,
                    metaToken
                );

                if (historyData?.error) {
                    accReport.syncStatus = 'error';
                    accReport.errors.push(`MetaApi Error: ${historyData.error}`);
                } else {
                    accReport.dealsFound = historyData.length || 0;

                    // Grouping logic...
                    const positions = {};
                    historyData.forEach(deal => {
                        if (!deal.positionId) return;
                        if (!positions[deal.positionId]) {
                            positions[deal.positionId] = { deals: [], profit: 0, commission: 0, swap: 0 };
                        }
                        positions[deal.positionId].deals.push(deal);
                        positions[deal.positionId].profit += (deal.profit || 0);
                        positions[deal.positionId].commission += (deal.commission || 0);
                        positions[deal.positionId].swap += (deal.swap || 0);
                    });

                    for (const posId in positions) {
                        const pos = positions[posId];
                        const exitDeal = pos.deals.find(d => d.entryType === 'DEAL_ENTRY_OUT' || d.entryType === 'DEAL_ENTRY_OUT_BY');
                        const entryDeal = pos.deals.find(d => d.entryType === 'DEAL_ENTRY_IN') || pos.deals[0];

                        if (exitDeal) {
                            const trade = {
                                account_id: acc.id,
                                user_id: acc.user_id,
                                pair: exitDeal.symbol,
                                position: entryDeal.type.includes('BUY') ? 'BUY' : 'SELL',
                                entry_price: entryDeal.price,
                                exit_price: exitDeal.price,
                                lot_size: entryDeal.volume,
                                result: pos.profit >= 0 ? 'TP' : 'SL',
                                pnl: pos.profit,
                                commission: pos.commission,
                                net_pnl: (pos.profit + pos.commission + pos.swap).toFixed(2),
                                opened_at: entryDeal.time,
                                closed_at: exitDeal.time,
                                external_id: `metaapi_pos_${posId}`,
                                notes: `Auto-synced. Position ID: ${posId}`,
                                tags: ['Automated']
                            };

                            // Upsert in Supabase
                            const upRes = await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': supabaseKey,
                                    'Authorization': `Bearer ${supabaseKey}`,
                                    'Prefer': 'resolution=merge-duplicates'
                                },
                                body: JSON.stringify(trade)
                            });

                            if (upRes.ok) accReport.saved++;
                            else accReport.errors.push(`DB Error on trade ${posId}`);
                        }
                    }
                    accReport.syncStatus = 'success';
                }

                // Also try to sync OPEN positions
                const openData = await callMetaApi(
                    'mt-client-api-v1.london.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}/positions`,
                    metaToken
                );
                if (openData && !openData.error) {
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
                            notes: `Open Position synced. ID: ${pos.id}`,
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
                    accReport.openPositions = openData.length;
                }

            } catch (err) {
                accReport.syncStatus = 'error';
                accReport.errors.push(err.message);
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
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ error: 'Invalid JSON' }); }
            });
        });
        req.on('error', e => resolve({ error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ error: 'Timeout' }); });
        req.end();
    });
}
