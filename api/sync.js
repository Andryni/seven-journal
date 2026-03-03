import https from 'https';

/**
 * Advanced Sync: Optimized for MT5 with detailed logging and upsert fixes.
 */
export default async function handler(req, res) {
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const metaToken = (process.env.METAAPI_TOKEN || '').trim();

    if (!supabaseUrl || !supabaseKey || !metaToken) {
        return res.status(500).json({ error: 'System configuration incomplete.' });
    }

    try {
        console.log('[SYNC] Starting global synchronization...');

        // 1. Fetch accounts to sync from Supabase
        const accountsRes = await fetch(`${supabaseUrl}/rest/v1/trading_accounts?metaapi_account_id=not.is.null&select=id,user_id,metaapi_account_id`, {
            headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
        });
        const accounts = await accountsRes.json();

        if (!accounts || accounts.length === 0) {
            return res.status(200).json({ message: 'No accounts linked to MetaApi found.' });
        }

        const report = [];
        const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = new Date().toISOString();

        for (const acc of accounts) {
            console.log(`[SYNC] Processing Account: ${acc.id} (MetaID: ${acc.metaapi_account_id})`);

            try {
                // 2. Fetch History Deals via Native HTTPS (Reliable)
                // Try the standard endpoint first
                const historyData = await callMetaApi(
                    'mt-client-api-v1.agiliumtrade.agiliumtrade.ai',
                    `/users/current/accounts/${acc.metaapi_account_id}/history-deals/time/${fromDate}/${toDate}`,
                    metaToken
                );

                if (!historyData || historyData.error) {
                    console.error(`[SYNC] MetaApi Error for ${acc.id}:`, historyData?.error);
                    report.push({ accountId: acc.id, status: 'error', detail: 'Could not fetch history' });
                    continue;
                }

                console.log(`[SYNC] Found ${historyData.length} raw deals for account ${acc.id}`);

                // 3. Group deals by Position ID
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

                let savedCount = 0;
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

                        // Use Proper PostgREST Upsert Syntax
                        const upsertRes = await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${supabaseKey}`,
                                'Prefer': 'resolution=merge-duplicates'
                            },
                            body: JSON.stringify(trade)
                        });

                        if (upsertRes.ok) savedCount++;
                        else console.error(`[SYNC] Supabase Save Error:`, await upsertRes.text());
                    }
                }

                report.push({ accountId: acc.id, status: 'success', syncedTrades: savedCount });

            } catch (err) {
                console.error(`[SYNC] Critical error for account ${acc.id}:`, err);
                report.push({ accountId: acc.id, status: 'error', detail: err.message });
            }
        }

        return res.status(200).json({ success: true, report });

    } catch (err) {
        console.error('[SYNC] Global failure:', err);
        return res.status(500).json({ error: err.message });
    }
}

/**
 * Helper to call MetaApi via native HTTPS
 */
async function callMetaApi(hostname, path, token) {
    return new Promise((resolve) => {
        const options = {
            hostname,
            path,
            method: 'GET',
            headers: { 'auth-token': token, 'User-Agent': 'SevenJournal/1.0' },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (e) {
                    resolve({ error: 'Invalid JSON response from MetaApi' });
                }
            });
        });

        req.on('error', e => resolve({ error: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ error: 'MetaApi Timeout' }); });
        req.end();
    });
}
