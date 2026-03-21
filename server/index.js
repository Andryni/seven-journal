import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import MetaApi from 'metaapi.cloud-sdk/esm-node';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

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
 * Route: Myfxbook Login & Discovery
 */
app.post('/api/myfxbook', async (req, res) => {
    const { email, password, action = 'login' } = req.body || {};

    try {
        if (action === 'login') {
            if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

            console.log(`[MYFXBOOK] Login attempt: ${email}`);
            const loginRes = await callMyfxbookApi(`login.json?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
            
            if (loginRes.error === 'true' || loginRes.error === true || !loginRes.session) {
                return res.status(401).json({ error: loginRes.message || 'Authentication failed on Myfxbook. Check your credentials.' });
            }

            const accountListRes = await callMyfxbookApi(`get-my-accounts.json?session=${loginRes.session}`);
            return res.json({ success: true, session: loginRes.session, accounts: accountListRes.accounts || [] });
        }
        res.status(400).json({ error: 'Invalid action' });
    } catch (err) {
        console.error('[MYFXBOOK] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Route: Myfxbook Sync
 */
app.post('/api/myfxbook-sync', async (req, res) => {
    const { session, myfxbookId, accountId, userId, myfxbookEmail, myfxbookPassword } = req.body || {};
    try {
        if (!accountId || !myfxbookId) return res.status(400).json({ error: 'Missing account info' });

        // 1. Persist credentials to database (Service Role avoids RLS issues)
        console.log(`[MYFXBOOK SYNC] Saving credentials for account ${accountId}`);
        const { error: patchError } = await supabase
            .from('trading_accounts')
            .update({
                myfxbook_account_id: myfxbookId,
                myfxbook_email: myfxbookEmail,
                myfxbook_password: myfxbookPassword,
                connection_method: 'myfxbook'
            })
            .eq('id', accountId);

        if (patchError) {
            console.error('[MYFXBOOK SYNC] Failed to save metadata:', patchError);
            throw new Error(`DB Error: ${patchError.message}`);
        }

        // 2. Fetch history
        console.log(`[MYFXBOOK SYNC] Fetching history for myfxbook ID: ${myfxbookId}`);
        const historyRes = await callMyfxbookApi(`get-history.json?session=${session}&id=${myfxbookId}`);
        
        if (historyRes.error === 'true' || historyRes.error === true) {
            console.error('[MYFXBOOK SYNC] API Error:', historyRes.message);
            return res.status(400).json({ error: historyRes.message || 'Sync failed' });
        }

        const trades = historyRes.history || [];
        console.log(`[MYFXBOOK SYNC] Found ${trades.length} records.`);

        let count = 0;
        for (const t of trades) {
            try {
                // 1. Skip Deposits, Withdrawals, or records without symbol
                const actionLower = (t.action || '').toLowerCase();
                if (actionLower.includes('deposit') || actionLower.includes('withdrawal') || !t.symbol) {
                    console.log(`[MYFXBOOK SYNC] Skipping non-trade record: ${t.action} - ${t.profit}`);
                    continue;
                }

                // 2. Robust Date Parsing (Forced GMT/UTC)
                const parseSafeDate = (dStr) => {
                    if (!dStr) return new Date();
                    // Myfxbook format: "2024-03-21 16:08:49" -> Append Z for UTC
                    const iso = dStr.replace(' ', 'T') + 'Z';
                    const d = new Date(iso);
                    return isNaN(d.getTime()) ? new Date() : d;
                };

                const openDate = parseSafeDate(t.openTime);
                const closeDate = parseSafeDate(t.closeTime);

                // 3. Session Detection Helper (Priority: NY > London > Asian)
                const getSession = (date) => {
                    const h = date.getUTCHours();
                    // NY standard hours (UTC): 13:00 to 21:00
                    if (h >= 13 && h < 21) return 'New York';
                    // London standard hours (UTC): 08:00 to 16:00
                    if (h >= 8 && h < 16) return 'London';
                    return 'Asian';
                };

                const externalId = `mf_${myfxbookId}_${t.openTime}_${t.symbol}_${t.action}`;
                const pnl = parseFloat(t.profit || 0);
                const comm = parseFloat(t.commission || 0);
                const interest = parseFloat(t.interest || t.swap || 0);

                const trade = {
                    account_id: accountId,
                    user_id: userId,
                    pair: t.symbol,
                    position: actionLower.includes('buy') ? 'BUY' : 'SELL',
                    entry_price: t.openPrice || 0,
                    exit_price: t.closePrice || 0,
                    lot_size: t.lots || 0,
                    result: pnl >= 0 ? 'TP' : 'SL',
                    pnl: pnl,
                    commission: comm,
                    swap: interest,
                    net_pnl: (pnl + comm + interest).toFixed(2),
                    opened_at: openDate.toISOString(),
                    closed_at: closeDate.toISOString(),
                    external_id: externalId,
                    strategy: 'Myfxbook Auto',
                    session: getSession(openDate),
                    tags: ['Automated', 'Myfxbook']
                };

                const { error: tradeError } = await supabase
                    .from('trades')
                    .upsert(trade, { onConflict: 'external_id' });

                if (!tradeError) count++;
                else console.error(`[MYFXBOOK SYNC] Upsert error:`, tradeError.message);

            } catch (tradeLoopErr) {
                console.error('[MYFXBOOK SYNC] Loop Error for trade:', tradeLoopErr);
            }
        }

        console.log(`[MYFXBOOK SYNC] Successfully synced ${count} trades.`);
        res.json({ success: true, count });
    } catch (err) {
        console.error('[MYFXBOOK SYNC] Fatal Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Route: Sync All (Dashboard)
 */
app.get('/api/sync', async (req, res) => {
    try {
        // Here you would normally run both metaapi and myfxbook loops
        // For simplicity, we just trigger a scan of all accounts
        const { data: accounts } = await supabase.from('trading_accounts').select('*');
        
        for (const acc of accounts || []) {
            if (acc.metaapi_account_id) {
                // Background MetaApi sync is already handled by startSync loop
            } else if (acc.myfxbook_account_id && acc.myfxbook_email && acc.myfxbook_password) {
                 // Background Myfxbook sync (optional)
                 backgroundMyfxbookSync(acc);
            }
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function backgroundMyfxbookSync(acc) {
    try {
        const loginData = await callMyfxbookApi(`login.json?email=${encodeURIComponent(acc.myfxbook_email)}&password=${encodeURIComponent(acc.myfxbook_password)}`);
        if (loginData.session) {
            const h = await callMyfxbookApi(`get-history.json?session=${loginData.session}&id=${acc.myfxbook_account_id}`);
            for (const t of (h.history || [])) {
                try {
                    const actionLower = (t.action || '').toLowerCase();
                    if (actionLower.includes('deposit') || actionLower.includes('withdrawal') || !t.symbol) continue;

                    const parseSafeDate = (dStr) => {
                        if (!dStr) return new Date();
                        const d = new Date(dStr.replace(' ', 'T') + 'Z');
                        return isNaN(d.getTime()) ? new Date() : d;
                    };
                    const openDate = parseSafeDate(t.openTime);
                    const getSession = (date) => {
                       const h = date.getUTCHours();
                       if (h >= 13 && h < 21) return 'New York';
                       if (h >= 8 && h < 16) return 'London';
                       return 'Asian';
                    };

                    const pnl = parseFloat(t.profit || 0);
                    await supabase.from('trades').upsert({
                        account_id: acc.id, user_id: acc.user_id,
                        pair: t.symbol, position: actionLower.includes('buy') ? 'BUY' : 'SELL',
                        entry_price: t.openPrice, exit_price: t.closePrice, lot_size: t.lots || 0.01,
                        result: pnl >= 0 ? 'TP' : 'SL', pnl: pnl,
                        net_pnl: (pnl + parseFloat(t.commission || 0) + parseFloat(t.interest || 0)).toFixed(2),
                        opened_at: openDate.toISOString(), closed_at: parseSafeDate(t.closeTime).toISOString(),
                        external_id: `mf_${acc.myfxbook_account_id}_${t.openTime}_${t.symbol}_${t.action}`,
                        strategy: 'Myfxbook Auto',
                        session: getSession(openDate),
                        tags: ['Automated', 'Myfxbook']
                    }, { onConflict: 'external_id' });
                } catch (e) {}
            }
        }
    } catch (e) { console.error('BG Sync error:', e); }
}

async function callMyfxbookApi(endpoint) {
    return new Promise((resolve) => {
        const options = { hostname: 'www.myfxbook.com', path: `/api/${endpoint}`, method: 'GET', headers: { 'User-Agent': 'SevenJournal/1.0' }, timeout: 15000 };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (c) => body += c);
            res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { resolve({ error: 'true' }); } });
        });
        req.on('error', (e) => resolve({ error: 'true' }));
        req.on('timeout', () => { req.destroy(); resolve({ error: 'true' }); });
        req.end();
    });
}

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
