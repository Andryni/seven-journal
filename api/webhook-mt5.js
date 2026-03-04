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
        // 1. Verify account exists
        const { data: account, error: accError } = await supabase
            .from('trading_accounts')
            .select('user_id')
            .eq('id', accountId)
            .single();

        if (accError || !account) {
            return res.status(404).json({ error: 'Account not found. Verify your Account ID.' });
        }

        // 2. Helper to fix MQL5 date format (2024.03.04 10:00:00 -> 2024-03-04 10:00:00)
        const fixDate = (d) => typeof d === 'string' ? d.replaceAll('.', '-') : d;

        // 3. Prepare trade data
        const tradeData = {
            account_id: accountId,
            user_id: account.user_id,
            pair: trade.symbol,
            position: trade.type.toUpperCase(),
            entry_price: parseFloat(trade.entryPrice),
            exit_price: parseFloat(trade.exitPrice),
            lot_size: parseFloat(trade.volume),
            result: parseFloat(trade.profit) >= 0 ? 'TP' : 'SL',
            pnl: parseFloat(trade.profit),
            commission: parseFloat(trade.commission || 0),
            net_pnl: (parseFloat(trade.profit) + parseFloat(trade.commission || 0) + parseFloat(trade.swap || 0)).toFixed(2),
            opened_at: fixDate(trade.openTime),
            closed_at: fixDate(trade.closeTime),
            external_id: trade.externalId,
            tags: ['MT5-Direct']
        };

        // 4. Insert or Update trade
        const { data, error } = await supabase
            .from('trades')
            .upsert(tradeData, { onConflict: 'external_id' })
            .select();

        if (error) {
            console.error('Supabase Error:', error);
            return res.status(400).json({ error: `Database Error: ${error.message}`, details: error });
        }

        return res.status(200).json({ success: true, trade: data[0] });
    } catch (err) {
        return res.status(400).json({ error: `Server Error: ${err.message}` });
    }
}
