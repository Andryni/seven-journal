// Sync trades via MetaApi REST API (no heavy SDK)
export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({
            error: `Missing config: SUPABASE_URL=${!!supabaseUrl}, SERVICE_KEY=${!!supabaseKey}, METAAPI_TOKEN=${!!metaToken}`
        });
    }

    try {
        // --- 1. Fetch all linked accounts from Supabase ---
        const accountsRes = await fetch(
            `${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            }
        );

        if (!accountsRes.ok) {
            const err = await accountsRes.text();
            return res.status(500).json({ error: `Supabase fetch error: ${err}` });
        }

        const accounts = await accountsRes.json();

        if (!accounts || accounts.length === 0) {
            return res.status(200).json({ message: 'No MetaApi accounts to sync' });
        }

        const results = [];
        // Extend sync window to 30 days instead of 30 minutes to fetch history
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        for (const acc of accounts) {
            try {
                // --- 2. Fetch history of deals from MetaApi REST ---
                const histRes = await fetch(
                    `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${from}/${to}`,
                    {
                        headers: { 'auth-token': metaToken }
                    }
                );

                if (!histRes.ok) {
                    const err = await histRes.text();
                    results.push({ accountId: acc.id, status: 'error', error: `MetaApi: ${err}` });
                    continue;
                }

                const deals = await histRes.json();
                const closedDeals = (deals || []).filter(d => d.entryType === 'DEAL_ENTRY_OUT');

                for (const deal of closedDeals) {
                    const trade = {
                        account_id: acc.id,
                        user_id: acc.user_id,
                        pair: deal.symbol,
                        position: deal.type === 'DEAL_TYPE_BUY' ? 'BUY' : 'SELL',
                        entry_price: 0,
                        exit_price: deal.price,
                        lot_size: deal.volume,
                        result: deal.profit >= 0 ? 'TP' : 'SL',
                        pnl: deal.profit,
                        commission: deal.commission || 0,
                        net_pnl: deal.profit + (deal.commission || 0) + (deal.swap || 0),
                        opened_at: deal.time,
                        closed_at: deal.time,
                        external_id: `metaapi_${deal.id}`,
                        notes: `Auto-synced. Ticket: ${deal.id}`,
                        tags: ['Automated']
                    };

                    // Upsert the trade
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
                }

                results.push({ accountId: acc.id, status: 'success', synced: closedDeals.length });
            } catch (err) {
                results.push({ accountId: acc.id, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ success: true, results });

    } catch (err) {
        console.error('Sync failed:', err);
        return res.status(500).json({ error: err.message });
    }
}
