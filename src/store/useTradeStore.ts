import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idbStorage';
import type { Trade } from '../lib/schemas';
import { calculatePnL } from '../lib/pnl';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';

export type SyncAction = { type: 'INSERT' | 'UPDATE' | 'DELETE', table: string, id: string, payload?: any };

interface TradeState {
    trades: Trade[];
    syncQueue: SyncAction[];
    isLoading: boolean;

    fetchTrades: (accountId: string) => Promise<void>;
    addTrade: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ data: Trade | null, error: any }>;
    updateTrade: (id: string, updates: Partial<Trade>) => Promise<{ error: any }>;
    deleteTrade: (id: string) => Promise<{ error: any }>;
    getTradeById: (id: string) => Trade | undefined;
    loadDemoData: (trades: Trade[]) => void;
    addToSyncQueue: (action: SyncAction) => void;
    processSyncQueue: () => Promise<void>;
}

export const useTradeStore = create<TradeState>()(
    persist(
        (set, get) => ({
            trades: [],
            syncQueue: [],
            isLoading: false,

            addToSyncQueue: (action) => {
                set((state) => ({ syncQueue: [...state.syncQueue, action] }));
            },

            processSyncQueue: async () => {
                const queue = get().syncQueue;
                if (queue.length === 0) return;
                
                // Keep it simple for now: we just clear it or you would implement real sync logic here
                // We'll process them one by one
                for (const action of queue) {
                    if (action.type === 'INSERT' && action.table === 'trades') {
                        await supabase.from('trades').insert(mapSchemaTradeToDb(action.payload));
                    } else if (action.type === 'UPDATE' && action.table === 'trades') {
                        await supabase.from('trades').update(mapSchemaTradeToDb(action.payload)).eq('id', action.id);
                    } else if (action.type === 'DELETE' && action.table === 'trades') {
                        await supabase.from('trades').delete().eq('id', action.id);
                    }
                }
                
                set({ syncQueue: [] });
            },

            fetchTrades: async (accountId) => {
                set({ isLoading: true });
                const { data, error } = await supabase
                    .from('trades')
                    .select('*')
                    .eq('account_id', accountId)
                    .order('opened_at', { ascending: false });

                if (data && !error) {
                    // Merge: keep trades for other accounts, replace only this account's trades
                    const otherTrades = get().trades.filter(t => t.accountId !== accountId);
                    set({ trades: [...otherTrades, ...data.map(mapDbTradeToSchema)] });
                }
                set({ isLoading: false });
            },

            addTrade: async (tradeData) => {
                const optimisticId = nanoid();
                const calculated = calculatePnL({
                    ...tradeData,
                    id: optimisticId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as Trade);

                // Optimistic local update
                set((state) => ({ trades: [calculated, ...state.trades] }));

                const { data, error } = await supabase
                    .from('trades')
                    .insert(mapSchemaTradeToDb(calculated))
                    .select()
                    .single();

                if (error) {
                    get().addToSyncQueue({ type: 'INSERT', table: 'trades', id: optimisticId, payload: calculated });
                    return { data: calculated, error: null }; // Return success so UI closes
                }

                if (data) {
                    // Replace optimistic ID with DB ID if needed, though with UUIDs they usually match
                    const newTrade = mapDbTradeToSchema(data);
                    set((state) => ({ trades: state.trades.map(t => t.id === optimisticId ? newTrade : t) }));

                    // Update account balance
                    const pnl = newTrade.netPnl || 0;
                    const { data: accData } = await supabase
                        .from('trading_accounts')
                        .select('current_balance')
                        .eq('id', newTrade.accountId)
                        .single();
                    
                    if (accData) {
                        const newBalance = parseFloat(accData.current_balance) + pnl;
                        await supabase
                            .from('trading_accounts')
                            .update({ current_balance: newBalance })
                            .eq('id', newTrade.accountId);
                    }
                    return { data: newTrade, error: null };
                }
                
                return { data: null, error };
            },

            updateTrade: async (id, updatedFields) => {
                const existing = get().trades.find(t => t.id === id);
                if (!existing) return { error: 'Trade not found' };

                const updated = calculatePnL({ ...existing, ...updatedFields } as Trade);

                // Optimistic UI
                set((state) => ({
                    trades: state.trades.map((t) => t.id === id ? updated : t),
                }));

                const { error } = await supabase
                    .from('trades')
                    .update(mapSchemaTradeToDb(updated))
                    .eq('id', id);

                if (error) {
                    get().addToSyncQueue({ type: 'UPDATE', table: 'trades', id, payload: updated });
                    return { error: null };
                }

                // Calculate PnL difference
                const oldPnL = existing.netPnl || 0;
                const newPnL = updated.netPnl || 0;
                const pnlDiff = newPnL - oldPnL;

                // Update account balance
                if (pnlDiff !== 0) {
                    const { data: accData } = await supabase
                        .from('trading_accounts')
                        .select('current_balance')
                        .eq('id', updated.accountId)
                        .single();
                    
                    if (accData) {
                        const newBalance = parseFloat(accData.current_balance) + pnlDiff;
                        await supabase
                            .from('trading_accounts')
                            .update({ current_balance: newBalance })
                            .eq('id', updated.accountId);
                    }
                }
                
                return { error };
            },

            deleteTrade: async (id) => {
                const deletedTrade = get().trades.find(t => t.id === id);
                
                // Optimistic UI
                set((state) => ({
                    trades: state.trades.filter((t) => t.id !== id),
                }));

                const { error } = await supabase
                    .from('trades')
                    .delete()
                    .eq('id', id);

                if (error) {
                    get().addToSyncQueue({ type: 'DELETE', table: 'trades', id });
                    return { error: null };
                }

                // Update account balance (subtract pnl)
                if (deletedTrade) {
                    const pnl = deletedTrade.netPnl || 0;
                    const { data: accData } = await supabase
                        .from('trading_accounts')
                        .select('current_balance')
                        .eq('id', deletedTrade.accountId)
                        .single();
                    
                    if (accData) {
                        const newBalance = parseFloat(accData.current_balance) - pnl;
                        await supabase
                            .from('trading_accounts')
                            .update({ current_balance: newBalance })
                            .eq('id', deletedTrade.accountId);
                    }
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
            storage: createJSONStorage(() => idbStorage),
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
