import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO as parseDate } from 'date-fns';
import { useMemo, useState, useRef, useEffect } from 'react';
import {
    TrendingUp, Target, Activity, Zap, PieChart as PieChartIcon,
    ArrowUpRight, ArrowDownRight, BarChart3, Award, Flame, Calendar as CalIcon, ChevronDown
} from 'lucide-react';
import type { Trade } from '../lib/schemas';
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

function PeriodFilter({ active, onSelect, customFrom, customTo, onCustomChange }: {
    active: Period;
    onSelect: (p: Period) => void;
    customFrom: string; customTo: string;
    onCustomChange: (from: string, to: string) => void;
}) {
    const [showCustom, setShowCustom] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const { t } = useTranslation();

    useEffect(() => {
        function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShowCustom(false); }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const PERIODS: { key: Period; label: string }[] = [
        { key: 'daily', label: t.dashboard.day },
        { key: 'weekly', label: t.dashboard.week },
        { key: 'monthly', label: t.dashboard.month },
        { key: 'all', label: t.dashboard.allTime },
    ];

    return (
        <div className="flex items-center gap-2 flex-wrap">
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

            <div ref={ref} className="relative">
                <button onClick={() => { setShowCustom(v => !v); onSelect('custom'); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={active === 'custom'
                        ? { background: 'rgba(124,58,237,0.25)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.40)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <CalIcon size={12} />
                    {active === 'custom' && customFrom && customTo
                        ? `${format(new Date(customFrom), 'MMM d')} → ${format(new Date(customTo), 'MMM d')}`
                        : t.dashboard.period}
                    <ChevronDown size={12} className={showCustom ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                </button>
                {showCustom && (
                    <div className="absolute top-full mt-2 right-0 z-50 p-4 rounded-2xl shadow-2xl space-y-3"
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
                        <button onClick={() => setShowCustom(false)} className="w-full btn-primary py-2 text-xs mt-1">{t.common.save}</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function Analytics() {
    const { t } = useTranslation();
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const allTrades = useTradeStore((state) => state.trades);

    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const handleCustomChange = (from: string, to: string) => {
        setCustomFrom(from); setCustomTo(to);
        setPeriod('custom');
    };

    const interval = useMemo(() => getInterval(period, customFrom, customTo), [period, customFrom, customTo]);

    const { closedTrades } = useMemo(() => {
        const base = allTrades.filter(t => t.accountId === activeAccountId);
        const filtered = interval
            ? base.filter(t => isWithinInterval(parseDate(t.openedAt), interval))
            : base;
        return { closedTrades: filtered.filter(t => t.result !== 'Running') };
    }, [allTrades, activeAccountId, interval]);

    const pnlData = useMemo(() => {
        let cumulative = 0;
        return [...closedTrades]
            .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
            .map(t => {
                cumulative += (t.netPnl || 0);
                return { date: format(parseISO(t.openedAt), period === 'daily' ? 'HH:mm' : 'MMM dd'), pnl: parseFloat(cumulative.toFixed(2)), tradePnl: t.netPnl || 0 };
            });
    }, [closedTrades, period]);

    const stats = useMemo(() => {
        const winsCount = closedTrades.filter(t => (t.netPnl || 0) > 0).length;
        const lossesCount = closedTrades.filter(t => (t.netPnl || 0) < 0).length;
        const besCount = closedTrades.filter(t => (t.netPnl || 0) === 0).length;
        const totalTradesCount = closedTrades.length;
        const winrate = totalTradesCount > 0 ? (winsCount / totalTradesCount) * 100 : 0;
        const totalPnL = closedTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);

        const totalProfit = closedTrades.filter(t => (t.netPnl || 0) > 0).reduce((a, t) => a + (t.netPnl || 0), 0);
        const totalLoss = Math.abs(closedTrades.filter(t => (t.netPnl || 0) < 0).reduce((a, t) => a + (t.netPnl || 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

        const avgWin = winsCount > 0 ? totalProfit / winsCount : 0;
        const avgLoss = lossesCount > 0 ? totalLoss / lossesCount : 0;

        const winLossData = [
            { name: 'Wins', value: winsCount, color: '#10b981' },
            { name: 'Losses', value: lossesCount, color: '#ef4444' },
            { name: 'BE', value: besCount, color: '#f59e0b' },
        ].filter(d => d.value > 0);

        const groupBy = (key: keyof Trade) => {
            const groups: Record<string, number> = {};
            for (const t of closedTrades) {
                const val = t[key] as string;
                if (!val) continue;
                if (!groups[val]) groups[val] = 0;
                groups[val] += (t.netPnl || 0);
            }
            return Object.entries(groups).map(([name, pnl]) => ({ name, pnl: parseFloat(pnl.toFixed(2)) })).sort((a, b) => b.pnl - a.pnl);
        };

        return {
            winsCount, lossesCount, besCount, winrate, totalPnL, profitFactor,
            avgWin, avgLoss, winLossData,
            sessionData: groupBy('session'),
            pairData: groupBy('pair'),
            strategyData: groupBy('strategy'),
        };
    }, [closedTrades]);

    const chartTheme = {
        axis: { stroke: '#3f3f46', fontSize: 10, tickLine: false, axisLine: false, fontFamily: 'JetBrains Mono' },
        grid: { stroke: 'rgba(255,255,255,0.03)', strokeDasharray: '0', vertical: false },
        tooltip: {
            contentStyle: { backgroundColor: '#111117', borderColor: 'rgba(124,58,237,0.3)', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'JetBrains Mono', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' },
            itemStyle: { padding: '2px 0' },
            cursor: { fill: 'rgba(124,58,237,0.04)' },
        },
    };

    if (allTrades.filter(t => t.accountId === activeAccountId).length === 0) {
        return (
            <div className="glass-card p-20 flex flex-col items-center justify-center text-center animate-fade-scale">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-float">
                    <Zap size={36} className="text-primary-light" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.dashboard.noTrades}</h3>
                <p className="text-text-secondary max-w-xs">{t.dashboard.sessionReady}</p>
            </div>
        );
    }

    const isProfit = stats.totalPnL >= 0;

    return (
        <div className="space-y-6 pb-8 animate-fade-scale">

            {/* ── Header ──────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <p className="section-label mb-1">{t.analytics.performance}</p>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Activity size={20} className="text-primary-light" />
                        {t.analytics.tradingStats}
                    </h2>
                </div>
                <PeriodFilter
                    active={period}
                    onSelect={setPeriod}
                    customFrom={customFrom}
                    customTo={customTo}
                    onCustomChange={handleCustomChange}
                />
            </div>

            {/* ── Metric Cards ────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Net P&L" value={`${isProfit ? '+' : ''}$${stats.totalPnL.toFixed(2)}`} icon={<TrendingUp size={16} />} color={isProfit ? 'profit' : 'loss'} />
                <MetricCard title="Win Rate" value={`${stats.winrate.toFixed(1)}%`} icon={<Target size={16} />} color="primary" />
                <MetricCard title={t.analytics.profitFactor} value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} icon={<Flame size={16} />} color={stats.profitFactor >= 1.5 ? 'profit' : 'loss'} />
                <MetricCard title="Avg Win/Loss" value={`${stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : stats.avgWin.toFixed(0)}R`} icon={<Award size={16} />} color="cyan" />
            </div>

            {/* ── Equity Curve + Distribution ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Equity */}
                <div className="lg:col-span-2 glass-card p-7 relative candle-bg overflow-hidden">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <p className="section-label mb-1">Growth</p>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Zap size={18} className="text-primary-light" /> {t.analytics.equityCurve}
                            </h3>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${isProfit ? 'text-profit bg-profit/10 border border-profit/20' : 'text-loss bg-loss/10 border border-loss/20'}`}>
                            {isProfit ? '+' : ''}${stats.totalPnL.toFixed(2)}
                        </div>
                    </div>
                    <div className="h-[320px] relative z-10">
                        {pnlData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pnlData}>
                                    <defs>
                                        <linearGradient id="anlGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={isProfit ? '#10b981' : '#ef4444'} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid {...chartTheme.grid} />
                                    <XAxis dataKey="date" {...chartTheme.axis} />
                                    <YAxis {...chartTheme.axis} tickFormatter={(v) => `$${v}`} width={55} />
                                    <Tooltip {...chartTheme.tooltip} formatter={(v: any) => [`$${(v || 0).toFixed(2)}`, 'Cumulative']} />
                                    <Area type="monotone" dataKey="pnl" stroke={isProfit ? '#10b981' : '#ef4444'} strokeWidth={3}
                                        fillOpacity={1} fill="url(#anlGrad)" dot={false} animationDuration={2000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm italic">
                                {t.common.noData}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie */}
                <div className="glass-card p-7 flex flex-col">
                    <div className="mb-6">
                        <p className="section-label mb-1">Distribution</p>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <PieChartIcon size={18} className="text-primary-light" /> Win / Loss
                        </h3>
                    </div>
                    <div className="relative flex-1 min-h-[220px]">
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                            <span className="text-4xl font-black font-mono">{stats.winrate.toFixed(0)}%</span>
                            <span className="section-label mt-1">Win Rate</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.winLossData} cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                                    paddingAngle={6} dataKey="value" stroke="none" animationDuration={1500}>
                                    {stats.winLossData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} fillOpacity={0.85} className="hover:opacity-100 transition-opacity" />
                                    ))}
                                </Pie>
                                <Tooltip {...chartTheme.tooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                        {[
                            { label: 'Wins', val: stats.winsCount, color: '#10b981' },
                            { label: 'Loss', val: stats.lossesCount, color: '#ef4444' },
                            { label: 'BE', val: stats.besCount, color: '#f59e0b' },
                        ].map(({ label, val, color }) => (
                            <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: `${color}99` }}>{label}</div>
                                <div className="text-xl font-black font-mono" style={{ color }}>{val}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Avg Win vs Loss ──────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-profit/10 border border-profit/20">
                        <ArrowUpRight size={24} className="text-profit" />
                    </div>
                    <div>
                        <p className="section-label mb-1">{t.analytics.avgWin}</p>
                        <p className="text-2xl font-black font-mono text-profit">+${stats.avgWin.toFixed(2)}</p>
                    </div>
                </div>
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-loss/10 border border-loss/20">
                        <ArrowDownRight size={24} className="text-loss" />
                    </div>
                    <div>
                        <p className="section-label mb-1">{t.analytics.avgLoss}</p>
                        <p className="text-2xl font-black font-mono text-loss">-${stats.avgLoss.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* ── Bar Charts ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { title: 'By Session', data: stats.sessionData },
                    { title: 'By Asset', data: stats.pairData, layout: 'vertical' },
                    { title: 'By Strategy', data: stats.strategyData },
                ].map(({ title, data, layout }) => (
                    <div key={title} className="glass-card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 size={16} className="text-primary-light" />
                            <h3 className="font-bold text-sm">
                                {title === 'By Session' ? 'By Session' : title === 'By Asset' ? 'By Asset' : 'By Strategy'}
                            </h3>
                        </div>
                        <div className="h-[200px]">
                            {data.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {layout === 'vertical' ? (
                                        <BarChart data={data} layout="vertical">
                                            <CartesianGrid {...chartTheme.grid} horizontal={false} />
                                            <XAxis type="number" {...chartTheme.axis} />
                                            <YAxis dataKey="name" type="category" width={55} {...chartTheme.axis} />
                                            <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(124,58,237,0.05)' }} />
                                            <Bar dataKey="pnl" radius={[0, 6, 6, 0]}>
                                                {data.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                                            </Bar>
                                        </BarChart>
                                    ) : (
                                        <BarChart data={data}>
                                            <CartesianGrid {...chartTheme.grid} />
                                            <XAxis dataKey="name" {...chartTheme.axis} />
                                            <YAxis {...chartTheme.axis} />
                                            <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(124,58,237,0.05)' }} />
                                            <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                                                {data.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />)}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-muted text-xs italic">
                                    {t.common.noData}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

type ColorKey = 'profit' | 'loss' | 'primary' | 'cyan';
const CM: Record<ColorKey, { text: string; bg: string; border: string }> = {
    profit: { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
    loss: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    primary: { text: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)' },
    cyan: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
};
function MetricCard({ title, value, icon, color = 'primary' }: { title: string; value: string; icon: React.ReactNode; color?: ColorKey }) {
    const c = CM[color];
    return (
        <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-30 transition-all duration-500 group-hover:opacity-60"
                style={{ background: `radial-gradient(circle, ${c.bg}, transparent)` }} />
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="section-label">{title}</span>
                <div className="p-2 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <span style={{ color: c.text }}>{icon}</span>
                </div>
            </div>
            <div className="text-2xl font-black font-mono relative z-10" style={{ color: c.text }}>{value}</div>
        </div>
    );
}
