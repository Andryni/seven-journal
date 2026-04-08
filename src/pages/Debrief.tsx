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
import { useTranslation } from '../hooks/useTranslation';

export function Debrief() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const queryDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const [selectedDateStr, setSelectedDateStr] = useState<string>(queryDate);
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [alertMsg, setAlertMsg] = useState<{ title: string; desc: string; type: 'error' | 'success' } | null>(null);

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
                ...form.getValues(), date: selectedDateStr, accountId: activeAccountId || '',
                htfBias: 'Neutral', narrative: '', keyLevels: '', chartUrls: [],
                marketRespectedPlan: 'Partial', mistakes: '', goodActions: '',
                lessonsLearned: '', emotionalState: 'Calm', dayRating: 3,
            });
        }
    }, [selectedDateStr, currentDebrief, activeAccountId]);


    const onSubmit = async (data: IDebrief) => {
        if (!activeAccountId) return;
        setIsSaving(true);
        data.accountId = activeAccountId;

        try {
            let res;
            if (currentDebrief && currentDebrief.id && typeof currentDebrief.id === 'string') {
                res = await updateDebrief(currentDebrief.id, data);
            } else {
                res = await addDebrief(data);
            }
            
            if (res && res.error) {
                console.error("Supabase Error:", res.error);
                setAlertMsg({ title: "Erreur de Sauvegarde", desc: res.error.message || JSON.stringify(res.error), type: 'error' });
                return;
            }
            
            setSaved(true);
            setAlertMsg({ title: "Sauvegarde Réussie !", desc: "Ton analyse a été ajoutée au journal avec succès.", type: 'success' });
            setTimeout(() => {
                setSaved(false);
                setAlertMsg(null);
            }, 3000);
        } catch (error) {
            console.error('Failed to save debrief:', error);
            setAlertMsg({ title: "Erreur", desc: "Une erreur inattendue s'est produite lors de la sauvegarde.", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const inputCls = "input-field";
    const bias = form.watch('htfBias');

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-8rem)] animate-fade-scale">

            {/* ── Sidebar ─────────────────────────────────────── */}
            <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
                {/* Date Selector */}
                <div className="glass-card p-4">
                    <p className="section-label mb-3">{t.debrief.selectDate}</p>
                    <input type="date" value={selectedDateStr}
                        onChange={e => { setSelectedDateStr(e.target.value); setSearchParams({ date: e.target.value }); }}
                        className={`${inputCls} mb-2`} />
                    <button onClick={() => { const today = format(new Date(), 'yyyy-MM-dd'); setSelectedDateStr(today); setSearchParams({ date: today }); }}
                        className="btn-ghost w-full text-xs justify-center py-2">
                        {t.calendar.jumpToToday}
                    </button>
                </div>

                {/* Debrief List */}
                <div className="glass-card flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-white/[0.05]">
                        <p className="section-label">{t.debrief.pastReviews}</p>
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
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                
                {/* Professional Error / Success Alert Pop-up */}
                {alertMsg && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm animate-fade-scale">
                        <div className={`glass-card p-4 flex items-start gap-4 ${alertMsg.type === 'success' ? 'border-[#10b981]/30 bg-[#10b981]/10' : 'border-red-500/30 bg-red-500/10'}`}>
                            <div className={`p-2 rounded-full ${alertMsg.type === 'success' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-red-500/20 text-red-400'}`}>
                                {alertMsg.type === 'success' ? <Check size={16} /> : <Activity size={16} />}
                            </div>
                            <div className="flex-1">
                                <h4 className={`text-sm font-bold ${alertMsg.type === 'success' ? 'text-white' : 'text-red-200'}`}>{alertMsg.title}</h4>
                                <p className={`text-xs mt-1 ${alertMsg.type === 'success' ? 'text-white/70' : 'text-red-200/70'}`}>{alertMsg.desc}</p>
                            </div>
                            <button onClick={() => setAlertMsg(null)} className="text-white/50 hover:text-white transition-colors">
                                ✖
                            </button>
                        </div>
                    </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit, (err) => {
                    const fields = Object.keys(err).join(', ');
                    setAlertMsg({ title: "Validation requise", desc: `Certains champs sont manquants ou invalides : ${fields}. Veuillez vérifier votre formulaire.`, type: 'error' });
                })} className="space-y-6">

                    {/* Form Header */}
                    <div className="glass-card p-6 relative overflow-hidden candle-bg">
                        <div className="absolute right-0 top-0 w-64 h-full pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.1), transparent 60%)' }} />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="section-label mb-1">{t.debrief.dailyReview}</p>
                                <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                                    <BookOpen size={18} className="text-primary-light" />
                                    <span className="truncate">{format(parseISO(selectedDateStr), 'EEEE, MMM dd, yyyy')}</span>
                                </h2>
                            </div>
                            <button type="submit" disabled={isSaving}
                                className={`btn-primary px-6 py-2.5 text-sm flex items-center gap-2 transition-all ${saved ? 'bg-profit!' : ''}`}>
                                {isSaving ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        {t.common.loading}
                                    </span>
                                ) : saved ? (
                                    <><Check size={15} /> Saved!</>
                                ) : (
                                    <><Save size={15} /> {currentDebrief ? t.common.update : t.common.save} Review</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Day Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {[
                            { label: 'Trades', val: dayTrades.length, color: 'text-white', icon: <Activity size={14} /> },
                            { label: 'Net P&L', val: `${dayPnl >= 0 ? '+' : ''}$${dayPnl.toFixed(2)}`, color: dayPnl >= 0 ? 'text-profit' : 'text-loss', icon: dayPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} /> },
                            { label: 'Win Rate', val: `${dayWinrate.toFixed(0)}%`, color: dayWinrate >= 50 ? 'text-profit' : 'text-loss', icon: <Star size={14} /> },
                        ].map(({ label, val, color, icon }, i) => (
                            <div key={label} className={`glass-panel px-4 py-3 md:px-5 md:py-4 flex items-center gap-3 md:gap-4 ${i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}>
                                <div className="p-2 rounded-xl bg-white/5 flex-shrink-0">{icon}</div>
                                <div>
                                    <p className="section-label mb-0.5 text-[9px] md:text-xs">{label}</p>
                                    <p className={`text-base md:text-xl font-black font-mono ${color}`}>{val}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Today's Trades List */}
                    {dayTrades.length > 0 && (
                        <div className="glass-card p-4">
                            <p className="section-label mb-3">Trades de la session</p>
                            <div className="flex flex-col gap-2">
                                {dayTrades.map(trade => (
                                    <div key={trade.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-6 rounded-full ${trade.netPnl && trade.netPnl >= 0 ? 'bg-profit' : 'bg-loss'}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-white">{trade.pair}</span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${trade.position === 'BUY' ? 'bg-primary/20 text-primary-light' : 'bg-red-500/20 text-red-400'}`}>
                                                        {trade.position}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-text-muted">{format(parseISO(trade.openedAt), 'HH:mm')} • {trade.session}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold text-sm ${trade.netPnl && trade.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                                {trade.netPnl && trade.netPnl >= 0 ? '+' : ''}{trade.netPnl ? `$${trade.netPnl.toFixed(2)}` : '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* HTF Bias visual */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="section-number">1</span>
                            <h3 className="font-bold">{t.debrief.marketAnalysis}</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                            {(['Bullish', 'Neutral', 'Bearish', 'No Bias'] as const).map(b => (
                                <label
                                    key={b}
                                    className="flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl cursor-pointer transition-all duration-200 border"
                                    style={{
                                        background: bias === b ? (b === 'Bullish' ? 'rgba(16,185,129,0.12)' : b === 'Bearish' ? 'rgba(239,68,68,0.12)' : 'rgba(124,58,237,0.12)') : 'rgba(255,255,255,0.02)',
                                        borderColor: bias === b ? (b === 'Bullish' ? 'rgba(16,185,129,0.35)' : b === 'Bearish' ? 'rgba(239,68,68,0.35)' : 'rgba(124,58,237,0.35)') : 'rgba(255,255,255,0.06)',
                                    }}>
                                    <input type="radio" value={b} {...form.register('htfBias')} className="sr-only" />
                                    <span className="text-base md:text-lg">{b === 'Bullish' ? '📈' : b === 'Bearish' ? '📉' : b === 'Neutral' ? '↔️' : '🚫'}</span>
                                    <span className="font-semibold text-xs md:text-sm">{b}</span>
                                </label>
                            ))}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">{t.debrief.narrative}</label>
                                <textarea {...form.register('narrative')} className={`${inputCls} resize-none`} rows={3} placeholder="Describe your session expectations..." />
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">{t.debrief.keyLevels}</label>
                                <textarea {...form.register('keyLevels')} className={`${inputCls} resize-none`} rows={3} placeholder="Support & resistance levels watched..." />
                            </div>
                        </div>
                    </div>

                    {/* Execution & Review */}
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="section-number">2</span>
                            <h3 className="font-bold">{t.debrief.executionReview}</h3>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs text-text-secondary mb-2 font-semibold">{t.debrief.marketRespected}</label>
                            <div className="flex gap-3">
                                {[
                                    { k: 'Yes' as const, l: t.debrief.yes },
                                    { k: 'Partial' as const, l: t.debrief.partial },
                                    { k: 'No' as const, l: t.debrief.no }
                                ].map(({ k, l }) => (
                                    <label key={k} className="flex-1 text-center py-2.5 rounded-xl cursor-pointer font-bold text-sm transition-all border"
                                        style={{
                                            background: form.watch('marketRespectedPlan') === k ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.02)',
                                            borderColor: form.watch('marketRespectedPlan') === k ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)',
                                            color: form.watch('marketRespectedPlan') === k ? '#a78bfa' : '#71717a',
                                        }}>
                                        <input type="radio" value={k} {...form.register('marketRespectedPlan')} className="sr-only" />
                                        {l}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: t.debrief.mistakes, field: 'mistakes', ph: 'What went wrong?' },
                                { label: t.debrief.goodActions, field: 'goodActions', ph: 'Discipline wins?' },
                                { label: t.debrief.lessons, field: 'lessonsLearned', ph: 'Key takeaways...' },
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
                            <h3 className="font-bold">{t.debrief.psychologicalAssessment}</h3>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs text-text-secondary mb-2 font-semibold">{t.debrief.emotionalState}</label>
                                <select {...form.register('emotionalState')} className={inputCls}>
                                    {['Focused', 'Calm', 'Distracted', 'Stressed', 'Overconfident'].map(e => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-text-secondary mb-3 font-semibold">{t.debrief.dayRating}</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(rating => (
                                        <label key={rating} className="cursor-pointer group">
                                            <input type="radio" value={rating} {...form.register('dayRating', { valueAsNumber: true })} className="sr-only" />
                                            <Star
                                                size={window.innerWidth < 768 ? 24 : 36}
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
