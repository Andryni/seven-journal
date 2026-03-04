import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { accountId, trade } = req.body;

    if (!accountId || !trade) {
        return res.status(400).json({ error: 'Missing accountId or trade data' });
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
                current_balance: parseFloat(acc.balance)
            };

            // Auto-fill initial capital if it's currently 0 or very small
            if (!account.initial_capital || account.initial_capital < 1) {
                updates.initial_capital = parseFloat(acc.balance);
            }

            await supabase
                .from('trading_accounts')
                .update(updates)
                .eq('id', accountId.trim());
        }

        // 3. Helper to fix MQL5 date format (2024.03.04 10:00:00 -> 2024-03-04 10:00:00)
        const fixDate = (d) => typeof d === 'string' ? d.replaceAll('.', '-') : d;

        // 4. Prepare trade data
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
            opened_at: fixDate(trade.openTime),
            closed_at: fixDate(trade.closeTime),
            external_id: trade.externalId,
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
