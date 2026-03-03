import { createClient } from '@supabase/supabase-js';
import MetaApi from 'metaapi.cloud-sdk';

export default async function handler(req, res) {
    try {
        console.log('--- Sync Start ---');

        // Check for required env vars
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const metaToken = process.env.METAAPI_TOKEN;

        if (!supabaseUrl || !supabaseKey || !metaToken) {
            console.error('Missing configuration:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey, hasToken: !!metaToken });
            return res.status(500).json({
                error: 'Configuration Error: Missing environment variables on server. Please check Vercel settings.'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Handle MetaApi class access from commonjs/esm package
        const MetaApiClass = MetaApi.default || MetaApi;
        const api = new MetaApiClass(metaToken);

        const { data: accounts, error: accountError } = await supabase
            .from('trading_accounts')
            .select('id, user_id, metaapi_account_id')
            .not('metaapi_account_id', 'is', null);

        if (accountError) {
            console.error('Supabase fetch accounts error:', accountError);
            throw new Error(`Database Error: ${accountError.message}`);
        }

        if (!accounts || accounts.length === 0) {
            console.log('No MetaApi accounts to sync');
            return res.json({ message: 'No accounts to sync' });
        }

        const results = [];

        for (const acc of accounts) {
            try {
                console.log(`Syncing account: ${acc.id} (MetaApi: ${acc.metaapi_account_id})`);

                const account = await api.metatraderAccountApi.getAccount(acc.metaapi_account_id);
                // RPC Connection is better for history
                const connection = account.getRPCConnection();
                await connection.connect();
                await connection.waitSynchronized();

                const history = await connection.getHistoryDealsByTimeRange(
                    new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
                    new Date()
                );

                console.log(`Found ${history.deals?.length || 0} deals for account ${acc.id}`);

                if (history.deals) {
                    const closedDeals = history.deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT');
                    for (const deal of closedDeals) {
                        const trade = {
                            account_id: acc.id,
                            user_id: acc.user_id, // Link to user
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
                console.error(`Error for account ${acc.id}:`, err);
                results.push({ accountId: acc.id, status: 'error', error: err.message });
            }
        }

        return res.status(200).json({ success: true, results });

    } catch (error) {
        console.error('Global Sync Fault:', error);
        return res.status(500).json({
            error: error.message || 'An internal error occurred during sync.'
        });
    }
}
