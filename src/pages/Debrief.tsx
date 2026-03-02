import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { debriefSchema } from '../lib/schemas';
import type { Debrief as IDebrief } from '../lib/schemas';
import { useDebriefStore } from '../store/useDebriefStore';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';

import { format, parseISO, isSameDay } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Star, Save, TrendingUp, TrendingDown, Activity, Check } from 'lucide-react';

export function Debrief() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const [selectedDateStr, setSelectedDateStr] = useState<string>(queryDate);
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { debriefs: allDebriefs, addDebrief, updateDebrief, getDebriefByDate } = useDebriefStore();
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const trades = useTradeStore(state => state.trades);

    const debriefs = allDebriefs.filter(d => d.accountId === activeAccountId);
    const currentDebrief = getDebriefByDate(selectedDateStr, activeAccountId || 'default');
    const dayTrades = trades.filter(t => t.accountId === activeAccountId && isSameDay(parseISO(t.openedAt), parseISO(selectedDateStr)));
    const dayPnl = dayTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
    const dayWinrate = dayTrades.length ? (dayTrades.filter(t => t.result === 'TP').length / dayTrades.length) * 100 : 0;

    const form = useForm<IDebrief>({
        resolver: zodResolver(debriefSchema),
        defaultValues: {
            accountId: activeAccountId || '', date: selectedDateStr,
            htfBias: 'Neutral', narrative: '', keyLevels: '', chartUrls: [],
            marketRespectedPlan: 'Partial', mistakes: '', goodActions: '',
            lessonsLearned: '', emotionalState: 'Calm', dayRating: 3,
        }
    });

    useEffect(() => {
        if (currentDebrief) { form.reset(currentDebrief); }
        else {
            form.reset({
                ...form.getValues(), date: selectedDateStr,
                htfBias: 'Neutral', narrative: '', keyLevels: '', chartUrls: [],
                marketRespectedPlan: 'Partial', mistakes: '', goodActions: '',
                lessonsLearned: '', emotionalState: 'Calm', dayRating: 3,
            });
        }
    }, [selectedDateStr, currentDebrief]);


    const onSubmit = async (data: IDebrief) => {
        if (!activeAccountId) return;
        setIsSaving(true);
        data.accountId = activeAccountId;

        try {
            if (currentDebrief && currentDebrief.id && typeof currentDebrief.id === 'string') {
                await updateDebrief(currentDebrief.id, data);
            } else {
                await addDebrief(data);
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (error) {
            console.error('Failed to save debrief:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "input-field";
    const bias = form.watch('htfBias');

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6 animate-fade-scale">

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside className="w-72 flex-shrink-0 flex flex-col gap-4">
                {/* Date Selector */}
                <div className="glass-card p-4">
                    <p className="section-label mb-3">Select Date</p>
                    <input type="date" value={selectedDateStr}
                        onChange={e => { setSelectedDateStr(e.target.value); setSearchParams({ date: e.target.value }); }}
                        className={`${inputCls} mb-2`} />
                    <button onClick={() => { const t = format(new Date(), 'yyyy-MM-dd'); setSelectedDateStr(t); setSearchParams({ date: t }); }}
                        className="btn-ghost w-full text-xs justify-center py-2">
                        Jump to Today
                    </button>
                </div>

                {/* Debrief List */}
                <div className="glass-card flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/[0.05]">
                        <p className="section-label">Past Reviews</p>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {debriefs.length === 0 && (
                            <div className="text-center py-8 text-text-muted text-xs italic">No debriefs yet.</div>
                        )}
                        {debriefs.sort((a, b) => b.date.localeCompare(a.date)).map(d => (
                            <button key={d.id}
                                onClick={() => { setSelectedDateStr(d.date); setSearchParams({ date: d.date }); }}
                                className="w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between"
                                style={{
                                    background: selectedDateStr === d.date ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${selectedDateStr === d.date ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                }}>
                                <div>
                                    <div className={`text-sm font-semibold ${selectedDateStr === d.date ? 'text-primary-light' : 'text-white'}`}>
                                        {format(parseISO(d.date), 'MMM dd, yyyy')}
                                    </div>
                                    <div className="text-[10px] text-text-muted mt-0.5">{d.htfBias}</div>
                                </div>
                                <div className="flex text-yellow-400">
                                    {Array.from({ length: d.dayRating }).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ── Main Panel ──────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* Form Header */}
                    <div className="glass-card p-6 relative overflow-hidden candle-bg">
                        <div className="absolute right-0 top-0 w-64 h-full pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.1), transparent 60%)' }} />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="section-label mb-1">Daily Review</p>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <BookOpen size={18} className="text-primary-light" />
                                    {format(parseISO(selectedDateStr), 'EEEE, MMMM dd, yyyy')}
                                </h2>
                            </div>
                            <button type="submit" disabled={isSaving}
                                className={`btn-primary px-6 py-2.5 text-sm flex items-center gap-2 transition-all ${saved ? 'bg-profit!' : ''}`}>
                                {isSaving ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        Saving...
                                    </span>
                                ) : saved ? (
                                    <><Check size={15} /> Saved!</>
                                ) : (
                                    <><Save size={15} /> {currentDebrief ? 'Update' : 'Save'} Review</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Day Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Trades', val: dayTrades.length, color: 'text-white', icon: <Activity size={14} /> },
                            { label: 'Net P&L', val: `${dayPnl >= 0 ? '+' : ''}$${dayPnl.toFixed(2)}`, color: dayPnl >= 0 ? 'text-profit' : 'text-loss', icon: dayPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} /> },
                            { label: 'Win Rate', val: `${dayWinrate.toFixed(0)}%`, color: dayWinrate >= 50 ? 'text-profit' : 'text-loss', icon: <Star size={14} /> },
                        ].map(({ label, val, color, icon }) => (
                            <div key={label} className="glass-panel px-5 py-4 flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-white/5">{icon}</div>
                                <div>
                                    <p className="section-label mb-0.5">{label}</p>
                                    <p className={`text-xl font-black font-mono ${color}`}>{val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* HTF Bias visual */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="section-number">1</span>
                            <h3 className="font-bold">Market Analysis</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {(['Bullish', 'Neutral', 'Bearish', 'No Bias'] as const).map(b => (
                                <label
                                    key={b}
                                    className="flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 border"
                                    style={{
                                        background: bias === b ? (b === 'Bullish' ? 'rgba(16,185,129,0.12)' : b === 'Bearish' ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.12)') : 'rgba(255,255,255,0.02)',
                                        borderColor: bias === b ? (b === 'Bullish' ? 'rgba(16,185,129,0.35)' : b === 'Bearish' ? 'rgba(239,68,68,0.35)' : 'rgba(124,58,237,0.35)') : 'rgba(255,255,255,0.06)',
                                    }}>
                                    <input type="radio" value={b} {...form.register('htfBias')} className="sr-only" />
                                    <span className="text-lg">{b === 'Bullish' ? '📈' : b === 'Bearish' ? '📉' : b === 'Neutral' ? '↔️' : '🚫'}</span>
                                    <span className="font-semibold text-sm">{b}</span>
                                </label>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">Narrative Context</label>
                                <textarea {...form.register('narrative')} className={`${inputCls} resize-none`} rows={3} placeholder="Describe your session expectations..." />
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">Key Levels</label>
                                <textarea {...form.register('keyLevels')} className={`${inputCls} resize-none`} rows={3} placeholder="Support & resistance levels watched..." />
                            </div>
                        </div>
                    </div>

                    {/* Execution & Review */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="section-number">2</span>
                            <h3 className="font-bold">Execution & Review</h3>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs text-text-secondary mb-2 font-semibold">Did the market respect your plan?</label>
                            <div className="flex gap-3">
                                {(['Yes', 'Partial', 'No'] as const).map(v => (
                                    <label key={v} className="flex-1 text-center py-2.5 rounded-xl cursor-pointer font-bold text-sm transition-all border"
                                        style={{
                                            background: form.watch('marketRespectedPlan') === v ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                                            borderColor: form.watch('marketRespectedPlan') === v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
                                            color: form.watch('marketRespectedPlan') === v ? '#a78bfa' : '#71717a',
                                        }}>
                                        <input type="radio" value={v} {...form.register('marketRespectedPlan')} className="sr-only" />
                                        {v}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            {[
                                { label: 'Key Mistakes', field: 'mistakes', ph: 'What went wrong?' },
                                { label: 'Good Actions', field: 'goodActions', ph: 'Discipline wins?' },
                                { label: 'Lessons', field: 'lessonsLearned', ph: 'Key takeaways...' },
                            ].map(({ label, field, ph }) => (
                                <div key={field}>
                                    <label className="block text-xs text-text-secondary mb-2 font-semibold">{label}</label>
                                    <textarea {...form.register(field as keyof IDebrief)} className={`${inputCls} resize-none`} rows={3} placeholder={ph} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Psychology */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="section-number">3</span>
                            <h3 className="font-bold">Psychological Assessment</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">Emotional State</label>
                                <select {...form.register('emotionalState')} className={inputCls}>
                                    {['Focused', 'Calm', 'Distracted', 'Stressed', 'Overconfident'].map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-3 font-semibold">Day Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <label key={rating} className="cursor-pointer group">
                                            <input type="radio" value={rating} {...form.register('dayRating', { valueAsNumber: true })} className="sr-only" />
                                            <Star
                                                size={36}
                                                fill={form.watch('dayRating') >= rating ? '#f59e0b' : 'none'}
                                                stroke={form.watch('dayRating') >= rating ? '#f59e0b' : '#3f3f46'}
                                                className="transition-all duration-200 group-hover:scale-110"
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
