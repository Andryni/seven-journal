import { createClient } from '@supabase/supabase-js';
import MetaApi from 'metaapi.cloud-sdk';

export default async function handler(req, res) {
    try {
        console.log('Initializing clients for sync...');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const MetaApiClass = MetaApi.default || MetaApi;
        const api = new MetaApiClass(process.env.METAAPI_TOKEN);

        const { data: accounts } = await supabase
            .from('trading_accounts')
            .select('id, user_id, metaapi_account_id')
            .not('metaapi_account_id', 'is', null);

        if (!accounts || accounts.length === 0) return res.json({ message: 'No accounts to sync' });

        const results = [];

        for (const acc of accounts) {
            try {
                const account = await api.metatraderAccountApi.getAccount(acc.metaapi_account_id);
                const connection = account.getRPCConnection();
                await connection.connect();
                await connection.waitSynchronized();

                const history = await connection.getHistoryDealsByTimeRange(
                    new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
                    new Date()
                );

                if (history.deals) {
                    const closedDeals = history.deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT');
                    for (const deal of closedDeals) {
                        const trade = {
                            account_id: acc.id,
                            pair: deal.symbol,
                            position: deal.type === 'DEAL_TYPE_BUY' ? 'SELL' : 'BUY',
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
                            notes: `Auto-Synced via Vercel. Ticket: ${deal.id}`,
                            tags: ['Automated']
                        };

                        await supabase.from('trades').upsert(trade, { onConflict: 'external_id' });
                    }
                }
                results.push({ accountId: acc.id, status: 'success', deals: history.deals.length });
            } catch (err) {
                console.error(`Sync error for account ${acc.id}:`, err);
                results.push({ accountId: acc.id, status: 'error', error: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Global sync error:', error);
        res.status(500).json({ error: error.message });
    }
}
