
// Sync trades via MetaApi REST API (Advanced grouping by Position ID)
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
                // 2. Fetch ALL deals (history) - Using the proven LONDON region
                console.log(`[SYNC] Fetching history for account ${acc.metaapi_account_id}...`);
                const histRes = await fetch(
                    `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${from}/${to}`,
                    { headers: { 'auth-token': metaToken } }
                );

                if (!histRes.ok) {
                    results.push({ accountId: acc.id, status: 'error', error: 'MetaApi unreachable' });
                    continue;
                }

                const allDeals = await histRes.json();

                // 3. Group deals by Position ID to reconstruct complete trades
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

                let syncCount = 0;
                for (const posId in positions) {
                    const pos = positions[posId];
                    const entryDeal = pos.deals.find(d => d.entryType === 'DEAL_ENTRY_IN');
                    const exitDeal = pos.deals.find(d => d.entryType === 'DEAL_ENTRY_OUT');

                    // We only sync completed trades (with an entry and an exit)
                    if (entryDeal && exitDeal) {
                        const trade = {
                            account_id: acc.id,
                            user_id: acc.user_id,
                            pair: entryDeal.symbol,
                            position: entryDeal.type === 'DEAL_TYPE_BUY' ? 'BUY' : 'SELL',
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
                            notes: `Auto-synced from MetaApi. Position: ${posId}`,
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
                        syncCount++;
                    }
                }
                results.push({ accountId: acc.id, status: 'success', synced: syncCount });
            } catch (err) {
                results.push({ accountId: acc.id, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ success: true, results });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
