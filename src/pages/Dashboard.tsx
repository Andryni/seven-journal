import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, BarChart3, Flame, Target, ChevronDown, Calendar as CalIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO as parseDate } from 'date-fns';
import { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

type Period = 'daily' | 'weekly' | 'monthly' | 'all' | 'custom';

function getInterval(period: Period, customFrom?: string, customTo?: string) {
    const now = new Date();
    if (period === 'daily') return { start: startOfDay(now), end: endOfDay(now) };
    if (period === 'weekly') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    if (period === 'monthly') return { start: startOfMonth(now), end: endOfMonth(now) };
    if (period === 'custom' && customFrom && customTo)
        return { start: startOfDay(new Date(customFrom)), end: endOfDay(new Date(customTo)) };
    return null;
}

/* ── Period Filter Bar ──────────────────────────────────────── */
function PeriodFilter({ active, onSelect, customFrom, customTo, onCustomChange }: {
    active: Period;
    onSelect: (p: Period) => void;
    customFrom: string; customTo: string;
    onCustomChange: (from: string, to: string) => void;
}) {
    const [showCustom, setShowCustom] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShowCustom(false); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const { t } = useTranslation();

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'daily', label: t.calendar.jumpToToday },
        { key: 'weekly', label: 'Week' },
        { key: 'monthly', label: 'Month' },
        { key: 'all', label: t.calendar.allTime },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Pills */}
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {PERIODS.map(({ key, label }) => (
                    <button key={key} onClick={() => onSelect(key)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                        style={active === key
                            ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }
                            : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Custom date range picker */}
            <div ref={ref} className="relative">
                <button onClick={() => { setShowCustom(v => !v); onSelect('custom'); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={active === 'custom'
                        ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <CalIcon size={12} />
                    {active === 'custom' && customFrom && customTo
                        ? `${format(new Date(customFrom), 'MMM d')} → ${format(new Date(customTo), 'MMM d')}`
                        : 'Custom'}
                    <ChevronDown size={12} className={showCustom ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                </button>
                {showCustom && (
                    <div className="absolute top-full mt-2 left-0 z-50 p-4 rounded-2xl shadow-2xl space-y-3"
                        style={{ background: '#111117', border: '1px solid rgba(124,58,237,0.3)', minWidth: '240px' }}>
                        <p className="section-label mb-2">Date Range</p>
                        {[
                            { label: 'From', val: customFrom, key: 'from' as const },
                            { label: 'To', val: customTo, key: 'to' as const },
                        ].map(({ label, val, key }) => (
                            <label key={key} className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{label}</span>
                                <input type="date" value={val}
                                    onChange={e => key === 'from' ? onCustomChange(e.target.value, customTo) : onCustomChange(customFrom, e.target.value)}
                                    className="input-field text-xs py-2"
                                    style={{ colorScheme: 'dark', background: 'rgba(255,255,255,0.05)' }} />
                            </label>
                        ))}
                        <button onClick={() => setShowCustom(false)} className="w-full btn-primary py-2 text-xs mt-1">Apply</button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Dashboard ──────────────────────────────────────────────── */
export function Dashboard() {
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const allTrades = useTradeStore(state => state.trades);
    const { t } = useTranslation();

    const fetchTrades = useTradeStore(state => state.fetchTrades);

    useEffect(() => {
        if (!activeAccountId) return;
        // Trigger sync then reload trades from Supabase
        fetch('/api/sync')
            .then(() => fetchTrades(activeAccountId))
            .catch(err => console.error('Sync failed', err));
    }, [activeAccountId]);

    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const handleCustomChange = (from: string, to: string) => {
        setCustomFrom(from); setCustomTo(to);
        setPeriod('custom');
    };

    const interval = useMemo(() => getInterval(period, customFrom, customTo), [period, customFrom, customTo]);

    const { closedTrades, allAccountTrades } = useMemo(() => {
        const base = allTrades.filter(t => t.accountId === activeAccountId);
        const filtered = interval
            ? base.filter(t => isWithinInterval(parseDate(t.openedAt), interval))
            : base;
        return {
            closedTrades: filtered.filter(t => t.result !== 'Running'),
            allAccountTrades: base,
        };
    }, [allTrades, activeAccountId, interval]);

    const { totalPnL, winrate, profitFactor, totalTrades } = useMemo(() => {
        const totalPnL = closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const winsCount = closedTrades.filter(t => (t.netPnl || 0) > 0).length;
        const winrate = closedTrades.length > 0 ? (winsCount / closedTrades.length) * 100 : 0;
        const profitTrades = closedTrades.filter(t => (t.netPnl || 0) > 0);
        const lossTrades = closedTrades.filter(t => (t.netPnl || 0) < 0);
        const totalProfit = profitTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const totalLoss = Math.abs(lossTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
        return { totalPnL, winrate, profitFactor, totalTrades: closedTrades.length };
    }, [closedTrades]);

    const chartData = useMemo(() => {
        let cumulative = 0;
        return [...closedTrades]
            .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
            .map(t => {
                cumulative += (t.netPnl || 0);
                return { name: format(parseISO(t.openedAt), period === 'daily' ? 'HH:mm' : 'MMM dd'), pnl: parseFloat(cumulative.toFixed(2)) };
            });
    }, [closedTrades, period]);

    const isProfit = totalPnL >= 0;

    return (
        <div className="space-y-6">

            {/* ── Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden p-5 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.08) 50%, rgba(16,185,129,0.06) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
                <div className="absolute inset-0 candle-bg pointer-events-none opacity-40" />
                <div className="absolute right-0 top-0 w-72 h-72 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(124,58,237,0.12), transparent 60%)' }} />

                <div className="relative z-10">
                    <p className="section-label mb-2">Welcome back</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">
                        {t.dashboard.readyToTrade.split('?')[0]} <span style={{ color: '#a78bfa' }}>{t.dashboard.readyToTrade.includes('?') ? 'trade?' : 'trade'}</span>
                    </h2>
                    <p className="text-xs md:text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>{t.dashboard.sessionReady}</p>
                </div>

                <div className="relative z-10 flex flex-row md:flex-row items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto mt-2 md:mt-0">
                    <div className="flex flex-col items-start md:items-end">
                        <span className="section-label mb-1">Net P&L</span>
                        <span className={`text-2xl md:text-3xl font-mono font-black ${isProfit ? 'profit-glow' : 'loss-glow'}`}>
                            {isProfit ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <Link to="/app/trades/new" className="btn-primary px-4 py-2.5 md:px-6 md:py-3 text-xs md:text-sm whitespace-nowrap">
                        + {t.trades.addTrade}
                    </Link>
                </div>
            </div>

            {/* ── Period Filter */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <PeriodFilter
                    active={period}
                    onSelect={setPeriod}
                    customFrom={customFrom}
                    customTo={customTo}
                    onCustomChange={handleCustomChange}
                />
                {period !== 'all' && (
                    <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {period === 'custom' && customFrom && customTo
                            ? `${format(new Date(customFrom), 'MMM d, yyyy')} – ${format(new Date(customTo), 'MMM d, yyyy')}`
                            : period === 'daily' ? format(new Date(), 'EEEE, MMMM d')
                                : period === 'weekly' ? `Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}`
                                    : format(new Date(), 'MMMM yyyy')}
                    </p>
                )}
            </div>

            {/* ── KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Net P&L" value={`${isProfit ? '+' : ''}$${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} trend={isProfit ? 'up' : 'down'} Icon={TrendingUp} color={isProfit ? 'profit' : 'loss'} delay="stagger-1" />
                <KpiCard title={t.dashboard.winRate} value={`${winrate.toFixed(1)}%`} trend={winrate >= 50 ? 'up' : 'down'} Icon={Target} color="primary" delay="stagger-2" />
                <KpiCard title="Total Trades" value={totalTrades.toString()} trend="up" Icon={Activity} color="cyan" delay="stagger-3" />
                <KpiCard title="Profit Factor" value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} trend={profitFactor >= 1.5 ? 'up' : 'down'} Icon={Flame} color={profitFactor >= 1.5 ? 'profit' : 'loss'} delay="stagger-4" />
            </div>

            {/* ── Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Equity Curve */}
                <div className="lg:col-span-2 glass-card p-6 flex flex-col candle-bg">
                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <div>
                            <p className="section-label mb-1">{t.dashboard.equityCurve}</p>
                            <h3 className="text-xl font-bold text-white">Performance History</h3>
                        </div>
                        <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
                            {period === 'all' ? 'All Time' : period === 'custom' ? 'Custom' : period.charAt(0).toUpperCase() + period.slice(1)}
                        </span>
                    </div>
                    <div className="h-[280px] relative z-10">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.03)" strokeDasharray="0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={52} tickFormatter={v => `$${v}`} fontFamily="JetBrains Mono" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111117', borderColor: 'rgba(124,58,237,0.3)', color: '#fff', borderRadius: '12px', fontFamily: 'JetBrains Mono', fontSize: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                                        itemStyle={{ color: isProfit ? '#10b981' : '#ef4444' }}
                                        formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, 'Cumulative PnL']}
                                    />
                                    <Area type="monotone" dataKey="pnl" stroke={isProfit ? '#10b981' : '#ef4444'} strokeWidth={3} fillOpacity={1} fill="url(#eqGrad)" dot={false} animationDuration={1500} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message={closedTrades.length === 0 ? "Log some closed trades to see your equity curve." : "No trades in this period."} />
                        )}
                    </div>

                    {/* ── Mini stats strip below the chart ── */}
                    {closedTrades.length > 0 && (() => {
                        const pnls = closedTrades.map(t => t.netPnl || 0);
                        const bestTrade = Math.max(...pnls);
                        const worstTrade = Math.min(...pnls);
                        const avgTrade = pnls.reduce((a, b) => a + b, 0) / pnls.length;
                        const winsCount = pnls.filter(p => p > 0).length;
                        const winStreak = (() => {
                            let max = 0, cur = 0;
                            [...closedTrades].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
                                .forEach(t => { if ((t.netPnl || 0) > 0) { cur++; if (cur > max) max = cur; } else cur = 0; });
                            return max;
                        })();

                        const miniStats = [
                            { label: 'Best Trade', value: `+$${bestTrade.toFixed(0)}`, color: '#10b981' },
                            { label: 'Worst Trade', value: `-$${Math.abs(worstTrade).toFixed(0)}`, color: '#ef4444' },
                            { label: 'Avg Trade', value: `${avgTrade >= 0 ? '+' : ''}$${avgTrade.toFixed(0)}`, color: avgTrade >= 0 ? '#10b981' : '#ef4444' },
                            { label: 'Trades', value: closedTrades.length.toString(), color: '#a78bfa' },
                            { label: 'Win Streak', value: `${winStreak}`, color: '#06b6d4' },
                            { label: 'Win Rate', value: `${closedTrades.length > 0 ? ((winsCount / closedTrades.length) * 100).toFixed(0) : 0}%`, color: '#f59e0b' },
                        ];

                        return (
                            <div className="mt-4 pt-4 relative z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    {miniStats.map(({ label, value, color }) => (
                                        <div key={label} className="flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl transition-all duration-200 hover:scale-105"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                                            <span className="text-sm font-black font-mono" style={{ color }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Recent Trades */}
                <div className="glass-card p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <p className="section-label mb-1">{t.dashboard.quickStats}</p>
                            <h3 className="text-xl font-bold text-white">{t.dashboard.recentTrades}</h3>
                        </div>
                        <div className="p-2 rounded-xl" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                            <BarChart3 size={16} style={{ color: '#a78bfa' }} />
                        </div>
                    </div>

                    <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                        {closedTrades.length === 0 ? (
                            <EmptyState message="No closed trades yet." small />
                        ) : (
                            closedTrades.slice(-6).reverse().map(trade => {
                                const pnl = trade.netPnl || 0;
                                return (
                                    <Link key={trade.id} to={`/app/trades/${trade.id}`}
                                        className="flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 group cursor-pointer"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}
                                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)')}
                                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)')}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${pnl >= 0 ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'}`}>
                                                {pnl >= 0 ? '↑' : '↓'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-white group-hover:text-violet-300 transition-colors">{trade.pair}</div>
                                                <div className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                                    {format(parseISO(trade.openedAt), 'MMM dd')} · {trade.position}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-mono font-bold text-sm ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                        </span>
                                    </Link>
                                );
                            })
                        )}
                    </div>

                    {closedTrades.length > 0 && (
                        <Link to="/app/trades"
                            className="w-full mt-4 py-2.5 text-sm font-bold text-center block rounded-xl transition-all duration-200"
                            style={{ border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.1)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            {t.dashboard.viewAll} →
                        </Link>
                    )}
                </div>
            </div>

            {/* ── Bottom Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Wins', value: closedTrades.filter(t => (t.netPnl || 0) > 0).length, color: 'text-profit', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' },
                    { label: 'Losses', value: closedTrades.filter(t => (t.netPnl || 0) < 0).length, color: 'text-loss', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
                    { label: 'BE', value: closedTrades.filter(t => (t.netPnl || 0) === 0).length, color: 'text-yellow-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
                    { label: t.trades.open, value: allAccountTrades.filter(t => t.result === 'Running').length, color: 'text-accent-cyan', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.15)' },
                ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className="rounded-2xl p-4 text-center flex flex-col items-center gap-1"
                        style={{ background: bg, border: `1px solid ${border}` }}>
                        <span className="section-label">{label}</span>
                        <span className={`text-3xl font-black font-mono ${color}`}>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Sub-components ─────────────────────────────────────────── */
type ColorKey = 'profit' | 'loss' | 'primary' | 'cyan';
const COLOR_MAP: Record<ColorKey, { text: string; bg: string; border: string; icon: string }> = {
    profit: { text: 'text-profit', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', icon: 'rgba(16,185,129,0.15)' },
    loss: { text: 'text-loss', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: 'rgba(239,68,68,0.15)' },
    primary: { text: 'text-primary-light', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', icon: 'rgba(124,58,237,0.15)' },
    cyan: { text: 'text-accent-cyan', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', icon: 'rgba(6,182,212,0.15)' },
};

function KpiCard({ title, value, trend, Icon, color = 'primary', delay }: {
    title: string; value: string; trend: 'up' | 'down'; Icon: React.ElementType; color?: ColorKey; delay?: string;
}) {
    const c = COLOR_MAP[color];
    return (
        <div className={`glass-card p-5 relative overflow-hidden animate-slide-up ${delay ?? ''}`}>
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-60" style={{ background: `radial-gradient(circle, ${c.bg}, transparent 70%)` }} />
            <div className="relative z-10 flex justify-between items-start mb-4">
                <span className="section-label">{title}</span>
                <div className="p-1.5 rounded-lg" style={{ background: c.icon, border: `1px solid ${c.border}` }}>
                    <Icon size={14} className={c.text} />
                </div>
            </div>
            <div className={`text-2xl font-black font-mono relative z-10 ${c.text}`}>{value}</div>
            <div className={`flex items-center gap-1 mt-2 text-xs font-semibold relative z-10 ${trend === 'up' ? 'text-profit' : 'text-loss'}`}>
                {trend === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                <span>{trend === 'up' ? 'Positive' : 'Improve'}</span>
                <span className="text-text-muted font-normal ml-1">trend</span>
            </div>
        </div>
    );
}

function EmptyState({ message, small }: { message: string; small?: boolean }) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${small ? 'py-8' : 'h-full'}`}>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 animate-float">
                <Activity size={20} className="text-text-muted" />
            </div>
            <p className="text-text-muted text-sm italic">{message}</p>
        </div>
    );
}
