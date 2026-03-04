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

        // 4. Time helpers
        const fixDate = (d) => typeof d === 'string' ? d.replaceAll('.', '-') : d;
        const getSession = (isoTime) => {
            const hour = new Date(isoTime).getUTCHours();
            if (hour >= 0 && hour < 8) return 'Asia';
            if (hour >= 8 && hour < 14) return 'London';
            if (hour >= 13 && hour < 21) return 'New York';
            if ((hour >= 13 && hour < 14)) return 'Overlap';
            return 'Off Session';
        };

        const opened_at = fixDate(trade.openTime);
        const session = getSession(opened_at);

        // 5. Prepare trade data
        const profit = parseFloat(trade.profit);
        const tradeData = {
            account_id: accountId,
            user_id: account.user_id,
            pair: trade.symbol,
            position: trade.type.toUpperCase(),
            entry_price: parseFloat(trade.entryPrice),
            exit_price: parseFloat(trade.exitPrice),
            lot_size: parseFloat(trade.volume),
            result: profit > 0 ? 'TP' : (profit < 0 ? 'SL' : 'BE'),
            pnl: profit,
            commission: parseFloat(trade.commission || 0),
            net_pnl: (profit + parseFloat(trade.commission || 0) + parseFloat(trade.swap || 0)).toFixed(2),
            opened_at: opened_at,
            closed_at: fixDate(trade.closeTime),
            external_id: trade.externalId,
            session: session,
            timeframe: trade.timeframe || 'M15', // Default to M15 if not provided
            tags: trade.isHistorical ? ['MT5-Import'] : ['MT5-Direct']
        };

        // 5. Insert or Update trade
        const { data, error } = await supabase
            .from('trades')
            .upsert(tradeData, { onConflict: 'external_id' })
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(400).json({ error: `Database Error: ${error.message}` });
        }

        return res.status(200).json({ success: true, trade: data[0] });
    } catch (err) {
        return res.status(400).json({ error: `Server Error: ${err.message}` });
    }
}
