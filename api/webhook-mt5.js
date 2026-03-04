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
        // 1. Verify account exists and get user_id
        const { data: account, error: accError } = await supabase
            .from('trading_accounts')
            .select('user_id')
            .eq('id', accountId)
            .single();

        if (accError || !account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // 2. Prepare trade data
        const tradeData = {
            account_id: accountId,
            user_id: account.user_id,
            pair: trade.symbol,
            position: trade.type.toUpperCase(),
            entry_price: trade.entryPrice,
            exit_price: trade.exitPrice,
            lot_size: trade.volume,
            result: trade.profit >= 0 ? 'TP' : 'SL',
            pnl: trade.profit,
            commission: trade.commission || 0,
            net_pnl: (trade.profit + (trade.commission || 0) + (trade.swap || 0)).toFixed(2),
            opened_at: trade.openTime,
            closed_at: trade.closeTime,
            external_id: trade.externalId,
            tags: ['MT5-Direct', ...(trade.tags || [])]
        };

        // 3. Insert or Update trade
        const { data, error } = await supabase
            .from('trades')
            .upsert(tradeData, { onConflict: 'external_id' })
            .select();

        if (error) throw error;

        return res.status(200).json({ success: true, trade: data[0] });
    } catch (err) {
        console.error('Webhook Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
