
import https from 'https';

// Advanced Sync: History + Open Positions
export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({ error: 'Missing configuration' });
    }

    try {
        // 1. Fetch linked accounts
        const accountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const accounts = await accountsRes.json();
        if (!accounts || accounts.length === 0) return res.status(200).json({ message: 'No accounts to sync' });

        const results = [];
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        for (const acc of accounts) {
            try {
                // --- A. SYNC CLOSED TRADES (HISTORY) ---
                const histRes = await fetch(
                    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${from}/${to}`,
                    { headers: { 'auth-token': metaToken } }
                );

                let closedCount = 0;
                if (histRes.ok) {
                    const allDeals = await histRes.json();
                    const positions = {};

                    allDeals.forEach(deal => {
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
                                net_pnl: pos.profit + pos.commission + pos.swap,
                                opened_at: entryDeal.time,
                                closed_at: exitDeal.time,
                                external_id: `metaapi_pos_${posId}`,
                                notes: `Auto-synced. Position: ${posId}`,
                                tags: ['Automated']
                            };

                            await fetch(`${supabaseUrl}/rest/v1/trades`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'apikey': supabaseKey,
                                    'Authorization': `Bearer ${supabaseKey}`,
                                    'Prefer': 'resolution=merge-duplicates',
                                    'on-conflict': 'external_id'
                                },
                                body: JSON.stringify(trade)
                            });
                            closedCount++;
                        }
                    }
                }

                // --- B. SYNC OPEN POSITIONS ---
                const openRes = await fetch(
                    `https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai/users/current/accounts/${acc.metaapi_account_id}/positions`,
                    { headers: { 'auth-token': metaToken } }
                );

                let openCount = 0;
                if (openRes.ok) {
                    const openPositions = await openRes.json();
                    for (const pos of openPositions) {
                        const trade = {
                            account_id: acc.id,
                            user_id: acc.user_id,
                            pair: pos.symbol,
                            position: pos.type.includes('BUY') ? 'BUY' : 'SELL',
                            entry_price: pos.openPrice,
                            lot_size: pos.volume,
                            result: 'Running',
                            pnl: pos.profit,
                            net_pnl: pos.profit + (pos.commission || 0) + (pos.swap || 0),
                            opened_at: pos.time,
                            external_id: `metaapi_open_${pos.id}`,
                            notes: `Open Position synced. ID: ${pos.id}`,
                            tags: ['Automated', 'Running']
                        };

                        await fetch(`${supabaseUrl}/rest/v1/trades`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Prefer': 'resolution=merge-duplicates',
                                'on-conflict': 'external_id'
                            },
                            body: JSON.stringify(trade)
                        });
                        openCount++;
                    }
                }

                results.push({ accountId: acc.id, status: 'success', closed: closedCount, open: openCount });
            } catch (err) {
                results.push({ accountId: acc.id, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ success: true, results });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
