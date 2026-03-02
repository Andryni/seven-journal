import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, BarChart, Bar, LabelList, RadarChart, PolarAngleAxis, PolarGrid, Radar
} from 'recharts';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO as parseDate, getDay } from 'date-fns';
import { useMemo, useState, useRef, useEffect } from 'react';
import {
    TrendingUp, Target, Activity, Zap,
    Award, Flame, Calendar as CalIcon, ChevronDown, Clock, Layers, Calendar as LucideCalendar, BarChart3
} from 'lucide-react';
import type { Trade } from '../lib/schemas';
import { useTranslation } from '../hooks/useTranslation';

// Shadcn UI Imports
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "../components/ui/chart";

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

        const groupByStacked = (key: keyof Trade) => {
            const groups: Record<string, { win: number; loss: number }> = {};
            for (const t of closedTrades) {
                const val = t[key] as string;
                if (!val) continue;
                if (!groups[val]) groups[val] = { win: 0, loss: 0 };
                if ((t.netPnl || 0) >= 0) groups[val].win += (t.netPnl || 0);
                else groups[val].loss += Math.abs(t.netPnl || 0);
            }
            return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
        };

        // Order Mon→Sun (1..6, 0)
        const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayPerformance = DAY_ORDER.map(idx => {
            const day = DAY_NAMES[idx];
            const dayTrades = closedTrades.filter(t => getDay(parseISO(t.openedAt)) === idx);
            const win = parseFloat(dayTrades.filter(t => (t.netPnl || 0) > 0).reduce((acc, t) => acc + (t.netPnl || 0), 0).toFixed(2));
            const loss = parseFloat(Math.abs(dayTrades.filter(t => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0)).toFixed(2));
            const net = parseFloat((win - loss).toFixed(2));
            const trades = dayTrades.length;
            return { name: day, short: day.slice(0, 3), win, loss, net, trades };
        }).filter(d => d.trades > 0);

        return {
            winsCount, lossesCount, besCount, winrate, totalPnL, profitFactor,
            avgWin, avgLoss, winLossData,
            sessionData: groupBy('session'),
            pairData: groupBy('pair'),
            strategyData: groupBy('strategy'),
            timeframeData: groupByStacked('timeframe'),
            dayPerformance
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

    // Chart Configs
    const assetConfig = {
        pnl: { label: "PnL", color: "#a78bfa" }
    } satisfies ChartConfig;

    const timeframeConfig = {
        win: { label: "Win", color: "#10b981" },
        loss: { label: "Loss", color: "#ef4444" }
    } satisfies ChartConfig;

    const sessionConfig = {
        pnl: { label: "PnL", color: "#a78bfa" }
    } satisfies ChartConfig;

    return (
        <div className="space-y-6 pb-12 animate-fade-scale overflow-x-hidden">

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

            {/* ── Main Charts Grid ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Growth Chart ────────────────────────────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative">
                    <CardHeader className="p-7 relative z-10 pb-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardDescription className="section-label mb-1">GROWTH</CardDescription>
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                    <TrendingUp size={20} className="text-primary-light" /> {t.analytics.equityCurve}
                                </CardTitle>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-black font-mono shadow-sm ${isProfit ? 'text-profit bg-profit/10 border border-profit/20' : 'text-loss bg-loss/10 border border-loss/20'}`}>
                                {isProfit ? '+' : ''}${stats.totalPnL.toFixed(2)}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-7 pt-4">
                        <div className="h-[300px] w-full">
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
                    </CardContent>
                </Card>

                {/* ── Asset Analysis (Negative Bar Chart Style) ────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative">
                    <CardHeader className="p-7 relative z-10 pb-2">
                        <CardDescription className="section-label mb-1">BY ASSET</CardDescription>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Layers size={20} className="text-primary-light" /> Net P&L per Asset
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-7 pt-4">
                        <ChartContainer config={assetConfig} className="min-h-[300px] w-full">
                            <BarChart accessibilityLayer data={stats.pairData} margin={{ top: 20 }}>
                                <defs>
                                    <linearGradient id="assetWin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                                    </linearGradient>
                                    <linearGradient id="assetLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.7} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <ChartTooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    content={<ChartTooltipContent hideLabel hideIndicator className="glass-card border-primary/20" />}
                                />
                                <Bar dataKey="pnl" radius={4}>
                                    <LabelList
                                        position="top"
                                        dataKey="name"
                                        fill="#fff"
                                        fillOpacity={0.9}
                                        fontSize={11}
                                        className="font-mono font-bold"
                                        offset={12}
                                    />
                                    {stats.pairData.map((item) => (
                                        <Cell
                                            key={item.name}
                                            fill={item.pnl > 0 ? "url(#assetWin)" : "url(#assetLoss)"}
                                            stroke={item.pnl > 0 ? "#10b981" : "#ef4444"}
                                            strokeWidth={1}
                                            strokeOpacity={0.3}
                                        />
                                    ))}
                                </Bar>
                                <XAxis dataKey="name" hide />
                                <YAxis {...chartTheme.axis} tickFormatter={(v) => `$${v}`} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                    <CardFooter className="px-7 pb-7 pt-0 flex-col items-start gap-1 text-sm text-white/40">
                        <div className="flex gap-2 leading-none font-medium text-white/60">
                            Performances par actif <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-[10px] uppercase tracking-widest leading-none">
                            Basé sur {closedTrades.length} trades
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {/* ── Second Row ───────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── Timeframe Analysis (Stacked Style) ──────────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative">
                    <CardHeader className="p-7 pb-2">
                        <CardDescription className="section-label mb-1">BY TIMEFRAME</CardDescription>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Clock size={20} className="text-primary-light" /> Timeframe Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-7 pt-4">
                        <ChartContainer config={timeframeConfig} className="min-h-[300px] w-full">
                            <BarChart accessibilityLayer data={stats.timeframeData}>
                                <defs>
                                    <linearGradient id="tfWin" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                    </linearGradient>
                                    <linearGradient id="tfLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.03)" />
                                <XAxis
                                    dataKey="name"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 }}
                                />
                                <Bar
                                    dataKey="win"
                                    stackId="a"
                                    fill="url(#tfWin)"
                                    radius={[4, 4, 0, 0]}
                                    stroke="#10b981"
                                    strokeWidth={1}
                                    strokeOpacity={0.2}
                                />
                                <Bar
                                    dataKey="loss"
                                    stackId="a"
                                    fill="url(#tfLoss)"
                                    radius={[0, 0, 4, 4]}
                                    stroke="#ef4444"
                                    strokeWidth={1}
                                    strokeOpacity={0.2}
                                />
                                <ChartTooltip
                                    content={<ChartTooltipContent className="glass-card border-primary/20 shadow-2xl" />}
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* ── Day Analysis (Multiple Bar Style) ───────────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative">
                    <CardHeader className="p-7 pb-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <CardDescription className="section-label mb-1">BY DAY</CardDescription>
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                                    <LucideCalendar size={20} className="text-primary-light" /> Daily Performance
                                </CardTitle>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-3 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg,#10b981,#10b981aa)' }} />
                                    <span className="text-[11px] font-bold font-mono text-white/50">WINS</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg,#ef4444,#ef4444aa)' }} />
                                    <span className="text-[11px] font-bold font-mono text-white/50">LOSSES</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-7 pb-4 pt-0">
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.dayPerformance} barGap={6} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                                    <defs>
                                        <linearGradient id="dayWin" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.45} />
                                        </linearGradient>
                                        <linearGradient id="dayLoss" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.45} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" strokeDasharray="0" />
                                    <XAxis
                                        dataKey="short"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                        tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'JetBrains Mono', fontWeight: 700 }}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(v) => `$${v}`}
                                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                                        width={52}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.025)', radius: 6 }}
                                        contentStyle={{ backgroundColor: '#111117', borderColor: 'rgba(124,58,237,0.35)', borderRadius: '14px', color: '#fff', fontSize: '12px', fontFamily: 'JetBrains Mono', boxShadow: '0 20px 60px rgba(0,0,0,0.7)', padding: '10px 14px' }}
                                        formatter={(v: any, name?: string) => [
                                            <span style={{ color: name === 'win' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{`$${Number(v).toFixed(2)}`}</span>,
                                            name === 'win' ? '✅ Profit' : '❌ Loss'
                                        ]}
                                        labelFormatter={(label) => <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '13px' }}>{label}</span>}
                                    />
                                    <Bar dataKey="win" fill="url(#dayWin)" radius={[5, 5, 0, 0]} stroke="#10b981" strokeWidth={1} strokeOpacity={0.25} />
                                    <Bar dataKey="loss" fill="url(#dayLoss)" radius={[5, 5, 0, 0]} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                    <CardFooter className="px-7 pb-6 pt-0 gap-4 flex-wrap">
                        {(() => {
                            const sorted = [...stats.dayPerformance].sort((a, b) => b.net - a.net);
                            const best = sorted[0];
                            const worst = sorted[sorted.length - 1];
                            return (
                                <>
                                    {best && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <Award size={13} className="text-profit" />
                                            <span className="text-[11px] font-bold font-mono text-white/60">Best:</span>
                                            <span className="text-[11px] font-black font-mono text-profit">{best.short} +${best.net.toFixed(0)}</span>
                                        </div>
                                    )}
                                    {worst && worst.net < 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <Flame size={13} className="text-loss" />
                                            <span className="text-[11px] font-bold font-mono text-white/60">Worst:</span>
                                            <span className="text-[11px] font-black font-mono text-loss">{worst.short} -${Math.abs(worst.net).toFixed(0)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl ml-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <span className="text-[11px] font-bold font-mono text-white/35">{stats.dayPerformance.reduce((a, d) => a + d.trades, 0)} trades / {stats.dayPerformance.length} days</span>
                                    </div>
                                </>
                            );
                        })()}
                    </CardFooter>
                </Card>
            </div>

            {/* ── Third Row ────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Session Radar ────────────────────────────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative lg:col-span-1">
                    <CardHeader className="p-7 pb-2 items-center">
                        <CardDescription className="section-label mb-1 text-center">SESSION FOCUS</CardDescription>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white justify-center">
                            <Activity size={20} className="text-primary-light" /> By Session
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-7 pb-4">
                        <ChartContainer
                            config={sessionConfig}
                            className="mx-auto aspect-square max-h-[300px]"
                        >
                            <RadarChart data={stats.sessionData}>
                                <defs>
                                    <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.1} />
                                    </radialGradient>
                                </defs>
                                <ChartTooltip cursor={false} content={<ChartTooltipContent className="glass-card border-primary/20 shadow-2xl" />} />
                                <PolarAngleAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 }} />
                                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                <Radar
                                    dataKey="pnl"
                                    fill="url(#radarGrad)"
                                    fillOpacity={0.6}
                                    stroke="#a78bfa"
                                    strokeWidth={3}
                                    animationDuration={1500}
                                    dot={{ fill: '#a78bfa', r: 4, strokeWidth: 2, stroke: '#111117' }}
                                />
                            </RadarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                {/* ── Strategy Analysis (Standard Bar) ────────────── */}
                <Card className="glass-card p-0 border-none overflow-hidden relative lg:col-span-2">
                    <CardHeader className="p-7 pb-2">
                        <CardDescription className="section-label mb-1">STRATEGY</CardDescription>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <BarChart3 size={20} className="text-primary-light" /> By Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-7 pt-4">
                        <div className="h-[300px]">
                            {stats.strategyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.strategyData} margin={{ top: 20 }}>
                                        <defs>
                                            <linearGradient id="stratWin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                                            </linearGradient>
                                            <linearGradient id="stratLoss" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.6} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid {...chartTheme.grid} />
                                        <XAxis dataKey="name" {...chartTheme.axis} tick={{ ...chartTheme.axis, fill: 'rgba(255,255,255,0.5)', fontWeight: 600 }} />
                                        <YAxis {...chartTheme.axis} tickFormatter={(v) => `$${v}`} />
                                        <Tooltip {...chartTheme.tooltip} cursor={{ fill: 'rgba(124,58,237,0.03)' }} />
                                        <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                                            {stats.strategyData.map((e, i) => (
                                                <Cell
                                                    key={i}
                                                    fill={e.pnl >= 0 ? 'url(#stratWin)' : 'url(#stratLoss)'}
                                                    stroke={e.pnl >= 0 ? "#10b981" : "#ef4444"}
                                                    strokeWidth={1}
                                                    strokeOpacity={0.2}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-muted text-xs italic">
                                    {t.common.noData}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
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
