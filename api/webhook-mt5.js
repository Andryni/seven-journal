import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accountId, trade, account: accountMetadata } = req.body;

    if (!accountId || (!trade && !accountMetadata)) {
        return res.status(400).json({ error: 'Missing accountId, trade or account data' });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Webhook triggered for accountId:', accountId);

        // 1. Verify account exists - using a more direct approach
        const { data: account, error: accError } = await supabase
            .from('trading_accounts')
            .select('user_id, id, initial_capital')
            .eq('id', accountId.trim())
            .single();

        if (accError || !account) {
            console.error('Account search error:', accError, 'for ID:', accountId);
            return res.status(404).json({ error: 'Account not found', receivedId: accountId });
        }

        // 2. Update Account Metadata if provided (Broker, Balance, Currency)
        if (req.body.account) {
            const acc = req.body.account;
            const updates = {
                broker: acc.broker,
                currency: acc.currency,
                current_balance: parseFloat(acc.balance),
                initial_capital: parseFloat(acc.balance) // Always update or set initial capital from MT5
            };

            await supabase
                .from('trading_accounts')
                .update(updates)
                .eq('id', accountId.trim());
        }

        // Helper ultra-robuste pour les dates de MT5
        const formatMT5Date = (str) => {
            if (!str || typeof str !== 'string' || str.length < 10) return new Date().toISOString();
            // "2024.03.24 10:00:00" -> "2024-03-24T10:00:00Z"
            return str.replaceAll('.', '-').replace(' ', 'T') + 'Z';
        };

        const getSession = (isoDate) => {
            try {
                const hour = new Date(isoDate).getUTCHours();
                if (hour >= 0 && hour < 8) return 'Asia';
                if (hour >= 8 && hour < 14) return 'London';
                if (hour >= 13 && hour < 21) return 'New York';
                return 'Off Session';
            } catch (e) { return 'London'; }
        };

        let tradeStatus = "no_trade_data";

        if (trade) {
            console.log('Syncing Trade for Account:', accountId, 'Symbol:', trade.symbol);

            const openedAt = formatMT5Date(trade.openTime);
            const closedAt = formatMT5Date(trade.closeTime || trade.openTime);
            const profit = parseFloat(trade.profit || 0);
            const commission = Math.abs(parseFloat(trade.commission || 0));
            const swap = parseFloat(trade.swap || 0);
            const netPnL = parseFloat((profit + swap - commission).toFixed(2));

            const tradeData = {
                account_id: accountId.trim(),
                user_id: account.user_id,
                pair: (trade.symbol || 'UNKNOWN').substring(0, 12),
                position: (trade.type || 'BUY').toUpperCase().includes('BUY') ? 'BUY' : 'SELL',
                entry_price: parseFloat(trade.entryPrice || 0),
                exit_price: parseFloat(trade.exitPrice || 0),
                lot_size: parseFloat(trade.volume || 0),
                result: profit > 0 ? 'TP' : (profit < 0 ? 'SL' : 'BE'),
                pnl: profit,
                commission: commission,
                net_pnl: netPnL,
                opened_at: openedAt,
                closed_at: closedAt,
                external_id: trade.externalId || `mt5_t_${Date.now()}_${trade.symbol}`,
                timeframe: trade.timeframe || 'M15',
                strategy: 'MT5 Sync',
                notes: `Session: ${getSession(openedAt)} | ` + ((trade.isHistorical === "true" || trade.isHistorical === true) ? 'MT5 History' : 'MT5 Live'),
                tags: [(trade.isHistorical === "true" || trade.isHistorical === true) ? 'MT5-Import' : 'MT5-Direct', getSession(openedAt)]
            };

            const { error: tError } = await supabase
                .from('trades')
                .upsert(tradeData, { onConflict: 'external_id' });

            if (tError) {
                console.error('CRITICAL: Supabase Trade Error:', tError);
                tradeStatus = `error: ${tError.message}`;
            } else {
                tradeStatus = "success";
            }
        }

        return res.status(200).json({
            success: true,
            account_synced: true,
            trade_synced: tradeStatus
        });

    } catch (err) {
        console.error('WEBHOOK ERROR:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
