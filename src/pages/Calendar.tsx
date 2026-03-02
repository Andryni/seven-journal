import { useState, useMemo } from 'react';
import { format, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import {
    ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
    BookOpen, CalendarDays, Activity, Target, BarChart3, Flame
} from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/* ── helpers ──────────────────────────────────────────────── */
function isoDay(date: Date) { return format(date, 'yyyy-MM-dd'); }
function startMon(date: Date) {
    // return offset (0=Mon … 6=Sun) so weeks start on Monday
    const d = getDay(date); // 0=Sun
    return d === 0 ? 6 : d - 1;
}

export function Calendar() {
    const [viewDate, setViewDate] = useState(new Date());
    const [selected, setSelected] = useState<Date>(new Date());

    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const allTrades = useTradeStore(state => state.trades);
    const trades = useMemo(
        () => allTrades.filter(t => t.accountId === activeAccountId),
        [allTrades, activeAccountId]
    );

    /* Trade map: iso-date → trades[] */
    const tradeMap = useMemo(() => {
        const m: Record<string, typeof trades> = {};
        for (const t of trades) {
            const k = format(new Date(t.openedAt), 'yyyy-MM-dd');
            (m[k] ??= []).push(t);
        }
        return m;
    }, [trades]);

    /* ── calendar grid ──────────────────────────────────────── */
    const days = useMemo(() => {
        const first = startOfMonth(viewDate);
        const last = endOfMonth(viewDate);
        return eachDayOfInterval({ start: first, end: last });
    }, [viewDate]);

    const leadingBlanks = startMon(days[0]);

    /* ── selected-day data ──────────────────────────────────── */
    const selKey = isoDay(selected);
    const dayTrades = tradeMap[selKey] ?? [];
    const dayPnl = dayTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0);
    const dayWins = dayTrades.filter(t => (t.netPnl ?? 0) > 0).length;

    /* ── monthly stats (closed trades only) ─────────────────── */
    const monthStats = useMemo(() => {
        const monthPrefix = format(viewDate, 'yyyy-MM');
        const mTrades = trades.filter(t =>
            format(new Date(t.openedAt), 'yyyy-MM') === monthPrefix && t.result !== 'Running'
        );
        const totalPnl = mTrades.reduce((s, t) => s + (t.netPnl ?? 0), 0);
        const wins = mTrades.filter(t => (t.netPnl ?? 0) > 0).length;
        const losses = mTrades.filter(t => (t.netPnl ?? 0) < 0).length;
        const wr = mTrades.length ? Math.round((wins / mTrades.length) * 100) : 0;
        const tradeDays = Object.values(
            mTrades.reduce((acc: Record<string, boolean>, t) => {
                acc[format(new Date(t.openedAt), 'yyyy-MM-dd')] = true;
                return acc;
            }, {})
        ).length;
        return { total: mTrades.length, totalPnl, wins, losses, wr, tradeDays };
    }, [trades, viewDate]);

    /* ── cell renderer ─────────────────────────────────────── */
    function DayCell({ date }: { date: Date }) {
        const key = isoDay(date);
        const dt = tradeMap[key] ?? [];
        const pnl = dt.reduce((s, t) => s + (t.netPnl ?? 0), 0);
        const isWin = pnl > 0;
        const isLoss = pnl < 0;
        const hasTrades = dt.length > 0;
        const isSel = isSameDay(date, selected);
        const tod = isToday(date);

        let bgColor = 'rgba(255,255,255,0.02)';
        let borderColor = 'rgba(255,255,255,0.05)';
        let pnlColor = '#52525b';

        if (isWin) { bgColor = 'rgba(16,185,129,0.07)'; borderColor = 'rgba(16,185,129,0.2)'; pnlColor = '#10b981'; }
        if (isLoss) { bgColor = 'rgba(239,68,68,0.07)'; borderColor = 'rgba(239,68,68,0.2)'; pnlColor = '#ef4444'; }
        if (isSel) { borderColor = 'rgba(124,58,237,0.7)'; bgColor = 'rgba(124,58,237,0.12)'; }

        const intensity = hasTrades ? Math.min(Math.abs(pnl) / 500, 1) : 0;

        return (
            <button
                onClick={() => setSelected(date)}
                className="relative flex flex-col justify-between p-3 rounded-2xl text-left transition-all duration-200 w-full group overflow-hidden"
                style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    minHeight: '88px',
                    boxShadow: isSel ? '0 0 0 2px rgba(124,58,237,0.4), 0 4px 20px rgba(124,58,237,0.15)' : undefined,
                    transform: isSel ? 'scale(1.03)' : undefined,
                }}
            >
                {/* Profit/loss intensity tint */}
                {hasTrades && (
                    <div className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{ background: isWin ? `rgba(16,185,129,${intensity * 0.08})` : `rgba(239,68,68,${intensity * 0.08})` }} />
                )}

                {/* Top row: date number + trade count badge */}
                <div className="flex justify-between items-start mb-auto relative z-10">
                    <div className="flex flex-col items-start">
                        <span className={`text-sm font-bold leading-none ${isSel ? 'text-primary-light' : tod ? 'text-violet-400' : 'text-white/70'
                            }`}>
                            {date.getDate()}
                        </span>
                        {tod && (
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse inline-block" />
                        )}
                    </div>
                    {hasTrades && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
                            style={{
                                background: isWin ? 'rgba(16,185,129,0.2)' : isLoss ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
                                color: isWin ? '#34d399' : isLoss ? '#f87171' : '#a1a1aa',
                            }}>
                            {dt.length}T
                        </span>
                    )}
                </div>

                {/* Bottom: PnL */}
                {hasTrades && (
                    <div className="mt-2 relative z-10">
                        <div className="text-[11px] font-black font-mono" style={{ color: pnlColor }}>
                            {pnl > 0 ? '+' : ''}{pnl === 0 ? '$0' : `$${pnl.toFixed(0)}`}
                        </div>
                    </div>
                )}

                {/* Hover ring for empty days */}
                {!hasTrades && !isSel && (
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ border: '1px solid rgba(124,58,237,0.2)' }} />
                )}
            </button>
        );
    }

    return (
        <div className="flex gap-6 h-[calc(100vh-7rem)] animate-fade-scale">

            {/* ── Main Calendar Column ──────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div>
                        <p className="section-label mb-1">Timeline</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <CalendarDays size={20} className="text-violet-400" />
                            Trading Calendar
                        </h2>
                    </div>

                    {/* Month nav */}
                    <div className="flex items-center gap-3">
                        {/* Legend */}
                        <div className="hidden md:flex items-center gap-4 mr-4 text-xs font-bold">
                            {[
                                { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Profit' },
                                { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Loss' },
                            ].map(({ color, bg, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-md" style={{ background: bg, border: `1px solid ${color}40` }} />
                                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <button onClick={() => setViewDate(d => subMonths(d, 1))}
                                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-bold text-white w-32 text-center">
                                {format(viewDate, 'MMMM yyyy')}
                            </span>
                            <button onClick={() => setViewDate(d => addMonths(d, 1))}
                                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white/50 hover:text-white">
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <button onClick={() => { setViewDate(new Date()); setSelected(new Date()); }}
                            className="px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
                            Today
                        </button>
                    </div>
                </div>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 gap-2 mb-2 flex-shrink-0">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-black tracking-widest py-1"
                            style={{ color: 'rgba(255,255,255,0.2)' }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-7 gap-2">
                        {/* Leading blanks */}
                        {Array.from({ length: leadingBlanks }).map((_, i) => (
                            <div key={`blank-${i}`} />
                        ))}
                        {/* Day cells */}
                        {days.map(date => (
                            <DayCell key={isoDay(date)} date={date} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Right Sidebar ────────────────────────────── */}
            <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">

                {/* Monthly stats */}
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={14} className="text-violet-400" />
                        <span className="section-label">{format(viewDate, 'MMMM')} Stats</span>
                    </div>

                    <div className="space-y-3">
                        {[
                            { label: 'Net P&L', val: `${monthStats.totalPnl >= 0 ? '+' : ''}$${monthStats.totalPnl.toFixed(0)}`, color: monthStats.totalPnl >= 0 ? '#10b981' : '#ef4444', Icon: monthStats.totalPnl >= 0 ? TrendingUp : TrendingDown },
                            { label: 'Win Rate', val: `${monthStats.wr}%`, color: monthStats.wr >= 50 ? '#10b981' : '#ef4444', Icon: Target },
                            { label: 'Total Trades', val: `${monthStats.total}`, color: '#a78bfa', Icon: Activity },
                            { label: 'Trade Days', val: `${monthStats.tradeDays}d`, color: '#06b6d4', Icon: Flame },
                        ].map(({ label, val, color, Icon }) => (
                            <div key={label} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <div className="flex items-center gap-2">
                                    <Icon size={13} style={{ color: `${color}80` }} />
                                    <span className="text-xs text-white/40 font-medium">{label}</span>
                                </div>
                                <span className="font-mono font-black text-sm" style={{ color }}>{val}</span>
                            </div>
                        ))}

                        {/* Win / Loss split */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div className="text-xl font-black font-mono text-emerald-400">{monthStats.wins}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/50 mt-0.5">Wins</div>
                            </div>
                            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                                <div className="text-xl font-black font-mono text-red-400">{monthStats.losses}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest text-red-400/50 mt-0.5">Losses</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selected day panel */}
                <div className="glass-card p-5 flex flex-col gap-4">
                    {/* Day header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="section-label mb-1">Selected</p>
                            <h3 className="font-bold text-white text-lg leading-tight">
                                {format(selected, 'MMMM d')}
                            </h3>
                            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {format(selected, 'EEEE')}
                            </p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono ${dayPnl > 0 ? 'text-emerald-400' : dayPnl < 0 ? 'text-red-400' : 'text-white/30'
                            }`} style={{
                                background: dayPnl > 0 ? 'rgba(16,185,129,0.12)' : dayPnl < 0 ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${dayPnl > 0 ? 'rgba(16,185,129,0.25)' : dayPnl < 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.06)'}`,
                            }}>
                            {dayPnl > 0 ? '+' : ''}{dayPnl === 0 ? '$0.00' : `$${dayPnl.toFixed(2)}`}
                        </div>
                    </div>

                    {/* Day quick stats */}
                    {dayTrades.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Trades', val: dayTrades.length },
                                { label: 'Wins', val: dayWins },
                            ].map(({ label, val }) => (
                                <div key={label} className="text-center p-2.5 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="text-lg font-black text-white">{val}</div>
                                    <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Debrief CTA */}
                    <Link to={`/app/debrief?date=${isoDay(selected)}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: 'rgba(124,58,237,0.15)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            color: '#a78bfa',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.25)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'; }}>
                        <BookOpen size={13} /> Open Debrief
                    </Link>

                    {/* Trade list */}
                    {dayTrades.length === 0 ? (
                        <div className="flex flex-col items-center py-6 text-center"
                            style={{ background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.06)' }}>
                            <CalendarDays size={20} className="mb-2 opacity-20" style={{ color: 'rgba(255,255,255,0.5)' }} />
                            <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.2)' }}>No trades on this day</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {dayTrades.map(trade => {
                                const pnl = trade.netPnl ?? 0;
                                const isWin = pnl > 0;
                                const borderColor = isWin ? 'rgba(16,185,129,0.15)' : pnl < 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)';
                                return (
                                    <Link key={trade.id} to={`/app/trades/${trade.id}`}
                                        className="flex items-center justify-between p-3 rounded-xl group transition-all duration-150"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${borderColor}` }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}>
                                        <div>
                                            <div className="text-xs font-bold text-white group-hover:text-violet-300 transition-colors">{trade.pair}</div>
                                            <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                                {format(new Date(trade.openedAt), 'HH:mm')} · {trade.position} · {trade.result}
                                            </div>
                                        </div>
                                        <span className="text-xs font-black font-mono" style={{ color: isWin ? '#10b981' : pnl < 0 ? '#ef4444' : '#71717a' }}>
                                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
