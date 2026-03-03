import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Trade } from '../lib/schemas';
import { calculatePnL } from '../lib/pnl';
import { supabase } from '../lib/supabase';

interface TradeState {
    trades: Trade[];
    isLoading: boolean;

    fetchTrades: (accountId: string) => Promise<void>;
    addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ data: Trade | null, error: any }>;
    updateTrade: (id: string, updates: Partial<Trade>) => Promise<{ error: any }>;
    deleteTrade: (id: string) => Promise<{ error: any }>;
    getTradeById: (id: string) => Trade | undefined;
    loadDemoData: (trades: Trade[]) => void;
}

export const useTradeStore = create<TradeState>()(
    persist(
        (set, get) => ({
            trades: [],
            isLoading: false,

            fetchTrades: async (accountId) => {
                // If we already have demo data for this account, don't overwrite it with an empty Supabase response
                const existingTrades = get().trades;
                const hasDemoTradesForAccount = existingTrades.some(
                    t => t.accountId === accountId && t.tags?.includes('Demo')
                );
                if (hasDemoTradesForAccount) return;

                set({ isLoading: true });
                const { data, error } = await supabase
                    .from('trades')
                    .select('*')
                    .eq('account_id', accountId)
                    .order('opened_at', { ascending: false });

                if (data && !error) {
                    // Merge: keep demo trades for other accounts, replace only this account's real trades
                    const otherTrades = get().trades.filter(t => t.accountId !== accountId);
                    set({ trades: [...otherTrades, ...data.map(mapDbTradeToSchema)] });
                }
                set({ isLoading: false });
            },

            addTrade: async (tradeData) => {
                // Calculate PnL locally before saving
                const calculated = calculatePnL({
                    ...tradeData,
                    id: '',
                    createdAt: '',
                    updatedAt: ''
                } as Trade);

                const { data, error } = await supabase
                    .from('trades')
                    .insert(mapSchemaTradeToDb(calculated))
                    .select()
                    .single();

                if (data && !error) {
                    const newTrade = mapDbTradeToSchema(data);
                    set((state) => ({ trades: [newTrade, ...state.trades] }));
                    return { data: newTrade, error: null };
                }
                return { data: null, error };
            },

            updateTrade: async (id, updatedFields) => {
                const existing = get().trades.find(t => t.id === id);
                if (!existing) return { error: 'Trade not found' };

                const updated = calculatePnL({ ...existing, ...updatedFields } as Trade);

                const { error } = await supabase
                    .from('trades')
                    .update(mapSchemaTradeToDb(updated))
                    .eq('id', id);

                if (!error) {
                    set((state) => ({
                        trades: state.trades.map((t) => t.id === id ? updated : t),
                    }));
                }
                return { error };
            },

            deleteTrade: async (id) => {
                const { error } = await supabase
                    .from('trades')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    set((state) => ({
                        trades: state.trades.filter((t) => t.id !== id),
                    }));
                }
                return { error };
            },

            getTradeById: (id) => {
                return get().trades.find((t) => t.id === id);
            },

            loadDemoData: (trades) => {
                // Merge demo trades: keep non-demo trades, replace/add demo trades for this account
                const demoAccountId = trades[0]?.accountId;
                const nonDemoTrades = get().trades.filter(
                    t => t.accountId !== demoAccountId
                );
                set({ trades: [...nonDemoTrades, ...trades] });
            }
        }),
        {
            name: 'seven-journal-trades',
        }
    )
);

function mapDbTradeToSchema(d: any): Trade {
    return {
        id: d.id,
        accountId: d.account_id,
        pair: d.pair,
        position: d.position,
        entryPrice: parseFloat(d.entry_price),
        exitPrice: d.exit_price ? parseFloat(d.exit_price) : null,
        lotSize: parseFloat(d.lot_size),
        stopLoss: d.stop_loss ? parseFloat(d.stop_loss) : null,
        takeProfit: d.take_profit ? parseFloat(d.take_profit) : null,
        timeframe: d.timeframe,
        session: d.session,
        strategy: d.strategy,
        confluence: d.confluence || [],
        riskPlanned: d.risk_planned,
        rewardPlanned: d.reward_planned,
        plannedRR: parseFloat(d.planned_rr),
        actualRR: d.actual_rr ? parseFloat(d.actual_rr) : null,
        result: d.result,
        pnl: d.pnl ? parseFloat(d.pnl) : null,
        commission: parseFloat(d.commission),
        netPnl: d.net_pnl ? parseFloat(d.net_pnl) : null,
        emotionBefore: d.emotion_before,
        emotionAfter: d.emotion_after,
        tradeGrade: d.trade_grade,
        tags: d.tags || [],
        notes: d.notes || '',
        setupBeforeUrl: d.setup_before_url || '',
        setupAfterUrl: d.setup_after_url || '',
        checklistSnapshot: d.checklist_snapshot || [],
        openedAt: d.opened_at,
        closedAt: d.closed_at,
        duration: d.duration,
        externalId: d.external_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at
    };
}

function mapSchemaTradeToDb(t: Trade): any {
    return {
        account_id: t.accountId,
        pair: t.pair,
        position: t.position,
        entry_price: t.entryPrice,
        exit_price: t.exitPrice,
        lot_size: t.lotSize,
        stop_loss: t.stopLoss,
        take_profit: t.takeProfit,
        timeframe: t.timeframe,
        session: t.session,
        strategy: t.strategy,
        confluence: t.confluence,
        risk_planned: t.riskPlanned,
        reward_planned: t.rewardPlanned,
        planned_rr: t.plannedRR,
        actual_rr: t.actualRR,
        result: t.result,
        pnl: t.pnl,
        commission: t.commission,
        net_pnl: t.netPnl,
        emotion_before: t.emotionBefore,
        emotion_after: t.emotionAfter,
        trade_grade: t.tradeGrade,
        tags: t.tags,
        notes: t.notes,
        setup_before_url: t.setupBeforeUrl,
        setup_after_url: t.setupAfterUrl,
        checklist_snapshot: t.checklistSnapshot,
        opened_at: t.openedAt,
        closed_at: t.closedAt,
        duration: t.duration,
        external_id: t.externalId,
        updated_at: new Date().toISOString()
    };
}
