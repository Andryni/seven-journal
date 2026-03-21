import https from 'https';

/**
 * Sync Trades from Myfxbook to Supabase
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { session, myfxbookId, accountId, userId } = req.body || {};
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    if (!session || !myfxbookId || !accountId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters: session, myfxbookId, accountId, userId' });
    }

    try {
        console.log(`[MYFXBOOK SYNC] Fetching history for MyfxbookID: ${myfxbookId}`);
        const historyRes = await callMyfxbookApi(`get-history.json?session=${session}&id=${myfxbookId}`);
        
        if (historyRes.error === 'true') {
            return res.status(400).json({ error: historyRes.message || 'Failed to fetch history' });
        }

        const trades = historyRes.history || [];
        console.log(`[MYFXBOOK SYNC] Found ${trades.length} trades. Processing...`);

        let importedCount = 0;
        for (const trade of trades) {
            // Myfxbook format: "MM/DD/YYYY HH:MM:SS" (usually)
            // But sometimes it varies. Let's try to parse it safely.
            const parseDate = (dStr) => {
                if (!dStr) return null;
                // Try standard JS parse first
                const d = new Date(dStr);
                if (!isNaN(d.getTime())) return d.toISOString();
                return dStr; // Fallback
            };

            const externalId = `myfxbook_${myfxbookId}_${trade.openTime}_${trade.symbol}_${trade.profit}`;

            const payload = {
                account_id: accountId,
                user_id: userId,
                pair: trade.symbol,
                position: trade.action?.toUpperCase() === 'BUY' ? 'BUY' : 'SELL',
                entry_price: trade.openPrice,
                exit_price: trade.closePrice,
                lot_size: trade.lots || 0.01, // Myfxbook doesn't always provide lots in basic history?
                result: parseFloat(trade.profit) >= 0 ? 'TP' : 'SL',
                pnl: parseFloat(trade.profit),
                commission: parseFloat(trade.commission || 0),
                swap: parseFloat(trade.interest || 0),
                net_pnl: (parseFloat(trade.profit) + parseFloat(trade.commission || 0) + parseFloat(trade.interest || 0)).toFixed(2),
                opened_at: parseDate(trade.openTime),
                closed_at: parseDate(trade.closeTime),
                external_id: externalId,
                tags: ['Automated', 'Myfxbook']
            };

            // Save to Supabase (Upsert via external_id)
            const supaRes = await fetch(`${supabaseUrl}/rest/v1/trades?on_conflict=external_id`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify(payload)
            });

            if (supaRes.ok) importedCount++;
        }

        // Update Account Balance if possible
        // (Skipping for now to keep it simple, but good practice)

        return res.status(200).json({ success: true, count: importedCount });

    } catch (err) {
        console.error('[MYFXBOOK SYNC] Error:', err);
        return res.status(500).json({ error: `Sync Error: ${err.message}` });
    }
}

async function callMyfxbookApi(endpoint) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.myfxbook.com',
            path: `/api/${endpoint}`,
            method: 'GET',
            headers: { 'User-Agent': 'SevenJournal/1.0' },
            timeout: 15000
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { resolve({ error: 'true', message: 'Parse error' }); }
            });
        });
        req.on('error', e => reject(e));
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.end();
    });
}
