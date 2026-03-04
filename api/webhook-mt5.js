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

        const fixDate = (d) => {
            if (typeof d !== 'string') return new Date().toISOString();
            return d.replaceAll('.', '-').replace(' ', 'T');
        };

        const getSession = (isoTime) => {
            try {
                const hour = new Date(isoTime).getUTCHours();
                if (hour >= 0 && hour < 8) return 'Asia';
                if (hour >= 8 && hour < 14) return 'London';
                if (hour >= 13 && hour < 21) return 'New York';
                return 'Off Session';
            } catch (e) { return 'London'; }
        };

        if (trade) {
            const opened_at = fixDate(trade.openTime);
            const session = getSession(opened_at);

            const profitVal = parseFloat(trade.profit || 0);
            const commVal = parseFloat(trade.commission || 0);
            const swapVal = parseFloat(trade.swap || 0);
            const netPnLVal = parseFloat((profitVal + commVal + swapVal).toFixed(2));

            const tradeData = {
                account_id: accountId.trim(),
                user_id: account.user_id,
                pair: trade.symbol || 'UNKNOWN',
                position: (trade.type || 'BUY').toUpperCase().substring(0, 4),
                entry_price: parseFloat(trade.entryPrice || 0),
                exit_price: parseFloat(trade.exitPrice || 0),
                lot_size: parseFloat(trade.volume || 0),
                result: profitVal > 0 ? 'TP' : (profitVal < 0 ? 'SL' : 'BE'),
                pnl: profitVal,
                commission: Math.abs(commVal),
                net_pnl: netPnLVal,
                opened_at: opened_at,
                closed_at: fixDate(trade.closeTime || trade.openTime),
                external_id: trade.externalId || `mt5_${accountId.trim()}_${trade.openTime}_${trade.symbol}`,
                session: session,
                timeframe: trade.timeframe || 'M15',
                strategy: 'MT5-Sync',
                risk_planned: { mode: 'percent', value: 1 },
                reward_planned: { mode: 'percent', value: 2 },
                planned_rr: 2,
                confluence: [],
                checklist_snapshot: [],
                notes: trade.isHistorical ? 'Imported from MT5 History' : 'MT5 WebRequest sync',
                tags: trade.isHistorical ? ['MT5-Import'] : ['MT5-Direct'],
                setup_before_url: '',
                setup_after_url: ''
            };

            const { error: tError } = await supabase
                .from('trades')
                .upsert(tradeData, { onConflict: 'external_id' });

            if (tError) {
                console.error('Supabase Error:', tError);
                return res.status(400).json({ error: `Trade Sync Error: ${tError.message}` });
            }
            return res.status(200).json({ success: true, message: 'Trade and Balance synced' });
        }

        return res.status(200).json({ success: true, message: 'Balance updated' });
    } catch (err) {
        console.error('Server Error:', err);
        return res.status(500).json({ error: `Server Error: ${err.message}` });
    }
}
