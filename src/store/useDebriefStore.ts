import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Debrief } from '../lib/schemas';
import { supabase } from '../lib/supabase';

interface DebriefState {
    debriefs: Debrief[];
    isLoading: boolean;

    fetchDebriefs: (accountId: string) => Promise<void>;
    addDebrief: (debrief: Omit<Debrief, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ data: Debrief | null, error: any }>;
    updateDebrief: (id: string, updates: Partial<Debrief>) => Promise<{ error: any }>;
    deleteDebrief: (id: string) => Promise<{ error: any }>;
    getDebriefByDate: (date: string, accountId: string) => Debrief | undefined;
}

export const useDebriefStore = create<DebriefState>()(
    persist(
        (set, get) => ({
            debriefs: [],
            isLoading: false,

            fetchDebriefs: async (accountId) => {
                set({ isLoading: true });
                const { data, error } = await supabase
                    .from('debriefs')
                    .select('*')
                    .eq('account_id', accountId)
                    .order('date', { ascending: false });

                if (data && !error) {
                    set({ debriefs: data.map(mapDbDebriefToSchema) });
                }
                set({ isLoading: false });
            },

            addDebrief: async (debriefData) => {
                const { data, error } = await supabase
                    .from('debriefs')
                    .insert(mapSchemaDebriefToDb(debriefData as Debrief))
                    .select()
                    .single();

                if (data && !error) {
                    const newDebrief = mapDbDebriefToSchema(data);
                    set((state) => ({ debriefs: [newDebrief, ...state.debriefs] }));
                    return { data: newDebrief, error: null };
                }
                return { data: null, error };
            },

            updateDebrief: async (id, updates) => {
                const { error } = await supabase
                    .from('debriefs')
                    .update(mapSchemaDebriefToDb(updates as any))
                    .eq('id', id);

                if (!error) {
                    set((state) => ({
                        debriefs: state.debriefs.map((d) => d.id === id ? { ...d, ...updates } : d),
                    }));
                }
                return { error };
            },

            deleteDebrief: async (id) => {
                const { error } = await supabase
                    .from('debriefs')
                    .delete()
                    .eq('id', id);

                if (!error) {
                    set((state) => ({
                        debriefs: state.debriefs.filter((d) => d.id !== id),
                    }));
                }
                return { error };
            },

            getDebriefByDate: (date, accountId) => {
                return get().debriefs.find((d) => d.date === date && d.accountId === accountId);
            },
        }),
        {
            name: 'seven-journal-debriefs',
        }
    )
);

function mapDbDebriefToSchema(d: any): Debrief {
    return {
        id: d.id,
        accountId: d.account_id,
        date: d.date,
        htfBias: d.htf_bias,
        narrative: d.narrative || '',
        keyLevels: d.key_levels || '',
        chartUrls: d.chart_urls || [],
        marketRespectedPlan: d.market_respected_plan,
        mistakes: d.mistakes || '',
        goodActions: d.good_actions || '',
        lessonsLearned: d.lessons_learned || '',
        emotionalState: d.emotional_state,
        dayRating: d.day_rating,
        createdAt: d.created_at,
        updatedAt: d.updated_at
    };
}

function mapSchemaDebriefToDb(s: Partial<Debrief>): any {
    const d: any = {};
    if (s.accountId) d.account_id = s.accountId;
    if (s.date) d.date = s.date;
    if (s.htfBias) d.htf_bias = s.htfBias;
    if (s.narrative !== undefined) d.narrative = s.narrative;
    if (s.keyLevels !== undefined) d.key_levels = s.keyLevels;
    if (s.chartUrls) d.chart_urls = s.chartUrls;
    if (s.marketRespectedPlan) d.market_respected_plan = s.marketRespectedPlan;
    if (s.mistakes !== undefined) d.mistakes = s.mistakes;
    if (s.goodActions !== undefined) d.good_actions = s.goodActions;
    if (s.lessonsLearned !== undefined) d.lessons_learned = s.lessonsLearned;
    if (s.emotionalState) d.emotional_state = s.emotionalState;
    if (s.dayRating !== undefined) d.day_rating = s.dayRating;
    d.updated_at = new Date().toISOString();
    return d;
}
