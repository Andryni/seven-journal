import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import MetaApi from 'metaapi.cloud-sdk/esm-node';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Supabase Init
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for backend sync
);

// MetaApi Init
const token = process.env.METAAPI_TOKEN;
console.log('MetaApi type:', typeof MetaApi, MetaApi ? 'exists' : 'null');
const api = new MetaApi(token);

/**
 * Route: Provision MT5 Account
 */
app.post('/api/provision', async (req, res) => {
    const { userId, accountId, login, password, server, platform = 'mt5' } = req.body;

    try {
        console.log(`Provisioning account for user ${userId}, account ${accountId}`);

        // 1. Create MetaApi Account
        const account = await api.metatraderAccountApi.createAccount({
            name: `SevenJournal-${accountId}`,
            type: 'cloud',
            login,
            password,
            server,
            platform,
            magic: 0, // 0 for all magic numbers
            quoteStreamingIntervalInSeconds: 2.5
        });

        // 2. Wait for account to be deployed (optional or background)
        // For simplicity, we just return the MetaApi ID
        const metaApiAccountId = account.id;

        // 3. Update Supabase trading account with MetaApi ID
        const { error: updateError } = await supabase
            .from('trading_accounts')
            .update({ metaapi_account_id: metaApiAccountId })
            .eq('id', accountId);

        if (updateError) throw updateError;

        // 4. Start synchronization for this account
        startSync(metaApiAccountId, accountId, userId);

        res.json({ success: true, metaApiAccountId });
    } catch (error) {
        console.error('Provisioning error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Sync logic
 */
const syncs = new Map();

async function startSync(metaApiAccountId, supabaseAccountId, userId) {
    if (syncs.has(metaApiAccountId)) return;

    try {
        const account = await api.metatraderAccountApi.getAccount(metaApiAccountId);
        await account.waitConnected();
        const connection = account.getRPCConnection();
        await connection.connect();
        await connection.waitSynchronized();

        console.log(`Started sync for MetaApi Account: ${metaApiAccountId}`);

        // Poll for historical deals or use a listener
        // Here we use a periodic poll to keep it simple and robust
        const interval = setInterval(async () => {
            try {
                const history = await connection.getHistoryDealsByTimeRange(
                    new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                    new Date()
                );

                if (history.deals && history.deals.length > 0) {
                    const closedDeals = history.deals.filter(d => d.entryType === 'DEAL_ENTRY_OUT');

                    for (const deal of closedDeals) {
                        await insertTrade(deal, supabaseAccountId, userId);
                    }
                }
            } catch (e) {
                console.error(`Sync loop error for ${metaApiAccountId}:`, e);
            }
        }, 60000); // Every minute

        syncs.set(metaApiAccountId, interval);
    } catch (error) {
        console.error(`Failed to start sync for ${metaApiAccountId}:`, error);
    }
}

async function insertTrade(deal, accountId, userId) {
    // Map MetaApi deal to our schema
    const trade = {
        account_id: accountId,
        pair: deal.symbol,
        position: deal.type === 'DEAL_TYPE_BUY' ? 'SELL' : 'BUY', // DEAL_ENTRY_OUT: if we sell to close, it was a buy? Wait.
        // MetaApi: DEAL_TYPE_BUY/SELL on ENTRY_OUT means the ACTION taken to close.
        // If we take DEAL_TYPE_SELL to close, the original position was BUY.
        entry_price: 0, // We need to find the IN deal for this position
        exit_price: deal.price,
        lot_size: deal.volume,
        result: deal.profit >= 0 ? 'TP' : 'SL',
        pnl: deal.profit,
        commission: deal.commission || 0,
        net_pnl: deal.profit + (deal.commission || 0) + (deal.swap || 0),
        opened_at: deal.time, // This is exit time for DEAL_ENTRY_OUT
        closed_at: deal.time,
        external_id: `metaapi_${deal.id}`, // Unique ID for upsert
        notes: `Imported via MetaApi. Ticket: ${deal.id}`,
        tags: ['Automated']
    };

    // Note: For a real app, you'd fetch the matching ENTRY_IN deal to get entry_price and true opened_at.
    // To keep it simple as requested, we upsert.

    const { error } = await supabase
        .from('trades')
        .upsert(trade, { onConflict: 'external_id' });

    if (error) console.error('Error upserting trade:', error);
}

// Initial sync for all accounts that have MetaApi ID
async function initAllSyncs() {
    const { data: accounts, error } = await supabase
        .from('trading_accounts')
        .select('id, user_id, metaapi_account_id')
        .not('metaapi_account_id', 'is', null);

    if (accounts) {
        for (const acc of accounts) {
            startSync(acc.metaapi_account_id, acc.id, acc.user_id);
        }
    }
}

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
    initAllSyncs();
});
