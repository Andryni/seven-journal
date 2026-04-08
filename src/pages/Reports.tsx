import { useState, useMemo, useRef } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { format, parseISO, getYear, getMonth, isSameMonth, isSameYear, startOfMonth, endOfMonth, eachDayOfInterval, getWeek, getDay } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Target, Flame, Activity, ChevronDown, CalendarDays, BarChart2, Calendar as CalIcon, Download } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/* ─────────────────────────────────────────────────────────────
   MetricCard Component (Re-used for simplicity)
───────────────────────────────────────────────────────────── */
type ColorKey = 'profit' | 'loss' | 'primary' | 'cyan' | 'orange';
const CM: Record<ColorKey, { text: string; bg: string; border: string; glow: string }> = {
    profit: { text: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)', glow: 'rgba(16,185,129,0.15)' },
    loss: { text: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', glow: 'rgba(239,68,68,0.15)' },
    primary: { text: '#a78bfa', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', glow: 'rgba(124,58,237,0.15)' },
    cyan: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', glow: 'rgba(6,182,212,0.15)' },
    orange: { text: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', glow: 'rgba(251,146,60,0.15)' },
};

function MetricCard({ title, value, icon, color = 'primary', sub }: { title: string; value: string; icon: React.ReactNode; color?: ColorKey; sub?: string; }) {
    const c = CM[color];
    return (
        <div className="glass-card p-5 relative overflow-hidden group transition-transform duration-300 hover:-translate-y-1">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-20 transition-opacity duration-500 group-hover:opacity-40" style={{ background: c.glow }} />
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="section-label">{title}</span>
                <div className="p-2 rounded-lg" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <span style={{ color: c.text }}>{icon}</span>
                </div>
            </div>
            <div className="text-2xl font-black font-mono relative z-10 mb-1" style={{ color: c.text }}>{value}</div>
            {sub && <div className="text-[10px] font-mono text-white/30 relative z-10 truncate">{sub}</div>}
        </div>
    );
}

const TOOLTIP_STYLE = {
    contentStyle: { backgroundColor: '#0d0d14', borderColor: 'rgba(124,58,237,0.4)', borderRadius: '14px', color: '#fff', fontSize: '11px', fontFamily: 'JetBrains Mono', boxShadow: '0 25px 60px rgba(0,0,0,0.8)', padding: '10px 14px' },
    itemStyle: { color: '#e2e8f0' },
    labelStyle: { color: '#a78bfa', fontWeight: 'bold' as const, marginBottom: '4px' },
    cursor: { fill: 'rgba(124,58,237,0.04)' },
};

const axisStyle = { fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'JetBrains Mono', fontWeight: 600 };

export function Reports() {
    return (
        <ErrorBoundary>
            <ReportsContent />
        </ErrorBoundary>
    );
}

function ReportsContent() {
    const { t } = useTranslation();
    const currentUser = useAuthStore(state => state.currentUser);
    const activeAccountId = currentUser?.activeAccountId;
    const allTrades = useTradeStore(state => state.trades);
    const accounts = useAuthStore(state => state.accounts);
    const activeAccount = accounts.find(a => a.id === activeAccountId);
    const initialBalance = activeAccount?.initialCapital || 0;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
    const [isExporting, setIsExporting] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    // Filter closed trades for the active account
    const accountClosedTrades = useMemo(() => {
        return allTrades.filter(t => t.accountId === activeAccountId && t.result !== 'Running')
            .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    }, [allTrades, activeAccountId]);

    // Available years for the selector
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        accountClosedTrades.forEach(t => years.add(getYear(parseISO(t.openedAt))));
        years.add(currentYear);
        return Array.from(years).sort((a, b) => b - a);
    }, [accountClosedTrades, currentYear]);

    // ─────────────────────────────────────────────────────────────
    // YEARLY DATA
    // ─────────────────────────────────────────────────────────────
    const yearlyTrades = useMemo(() => {
        return accountClosedTrades.filter(t => getYear(parseISO(t.openedAt)) === selectedYear);
    }, [accountClosedTrades, selectedYear]);

    const yearlyStats = useMemo(() => {
        const winsCnt = yearlyTrades.filter(t => (t.netPnl || 0) > 0).length;
        const totalCnt = yearlyTrades.length;
        const winRate = totalCnt > 0 ? (winsCnt / totalCnt) * 100 : 0;
        const netPnl = yearlyTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const grossProfit = yearlyTrades.filter(t => (t.netPnl || 0) > 0).reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const grossLoss = Math.abs(yearlyTrades.filter(t => (t.netPnl || 0) < 0).reduce((acc, t) => acc + (t.netPnl || 0), 0));
        const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

        // PnL per month data (Jan to Dec)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthsData = monthNames.map((name, i) => ({ name, pnl: 0, count: 0, index: i }));

        yearlyTrades.forEach(t => {
            const m = getMonth(parseISO(t.openedAt));
            monthsData[m].pnl += (t.netPnl || 0);
            monthsData[m].count += 1;
        });

        // Best and Worst months
        let bestMonth = { name: '-', pnl: -Infinity };
        let worstMonth = { name: '-', pnl: Infinity };
        monthsData.forEach(m => {
            if (m.count > 0) {
                if (m.pnl > bestMonth.pnl) bestMonth = m;
                if (m.pnl < worstMonth.pnl) worstMonth = m;
            }
        });

        if (bestMonth.name === '-') bestMonth = { name: 'N/A', pnl: 0 };
        if (worstMonth.name === '-') worstMonth = { name: 'N/A', pnl: 0 };

        // Cumulative PnL logic for AreaChart (yearly)
        let equity = initialBalance;
        let cumulativeData: { date: string, equity: number, pnl: number }[] = [];
        if (yearlyTrades.length > 0) {
            cumulativeData = yearlyTrades.map(t => {
                equity += (t.netPnl || 0);
                return {
                    date: format(parseISO(t.openedAt), 'MMM dd'),
                    equity: parseFloat(equity.toFixed(2)),
                    pnl: t.netPnl || 0
                };
            });
        }

        return {
            winsCnt, totalCnt, winRate, netPnl, profitFactor,
            monthsData: monthsData.map(d => ({ ...d, pnl: parseFloat(d.pnl.toFixed(2)) })),
            bestMonth, worstMonth,
            cumulativeData
        };
    }, [yearlyTrades, initialBalance]);

    // ─────────────────────────────────────────────────────────────
    // MONTHLY DATA
    // ─────────────────────────────────────────────────────────────
    const monthlyTrades = useMemo(() => {
        return yearlyTrades.filter(t => getMonth(parseISO(t.openedAt)) === selectedMonth);
    }, [yearlyTrades, selectedMonth]);

    const monthlyStats = useMemo(() => {
        const netPnl = monthlyTrades.reduce((acc, t) => acc + (t.netPnl || 0), 0);
        const winsCnt = monthlyTrades.filter(t => (t.netPnl || 0) > 0).length;
        const lossCnt = monthlyTrades.filter(t => (t.netPnl || 0) < 0).length;
        const beCnt = monthlyTrades.filter(t => (t.netPnl || 0) === 0).length;
        const totalCnt = monthlyTrades.length;
        const winRate = totalCnt > 0 ? (winsCnt / totalCnt) * 100 : 0;

        // Daily PnL
        const dateObj = new Date(selectedYear, selectedMonth, 1);
        const daysInMonth = eachDayOfInterval({ start: startOfMonth(dateObj), end: endOfMonth(dateObj) });
        
        const dailyData = daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTrades = monthlyTrades.filter(t => format(parseISO(t.openedAt), 'yyyy-MM-dd') === dateStr);
            const pnl = parseFloat(dayTrades.reduce((a, b) => a + (b.netPnl || 0), 0).toFixed(2));
            return {
                date: dateStr,
                shortDate: format(day, 'MMM dd'),
                dayNum: format(day, 'd'),
                dayOfWeek: getDay(day),
                pnl,
                count: dayTrades.length
            };
        });

        // Weekly Summary
        const weeklyData: Record<number, { weekName: string, pnl: number }> = {};
        dailyData.forEach(d => {
            const date = new Date(d.date);
            const w = getWeek(date, { weekStartsOn: 1 });
            if (!weeklyData[w]) weeklyData[w] = { weekName: `${t.reports?.week || 'Week'} ${w}`, pnl: 0 };
            weeklyData[w].pnl += d.pnl;
        });

        const weeklyArr = Object.values(weeklyData).map(w => ({ ...w, pnl: parseFloat(w.pnl.toFixed(2)) }));

        const winningDays = dailyData.filter(d => d.pnl > 0).length;
        const losingDays = dailyData.filter(d => d.pnl < 0).length;
        const beDays = dailyData.filter(d => d.count > 0 && d.pnl === 0).length;

        // Best and Worst days
        let bestDay = { shortDate: 'N/A', pnl: -Infinity, count: 0 };
        let worstDay = { shortDate: 'N/A', pnl: Infinity, count: 0 };
        dailyData.forEach(d => {
            if (d.count > 0) {
                if (d.pnl > bestDay.pnl) bestDay = d;
                if (d.pnl < worstDay.pnl) worstDay = d;
            }
        });

        if (bestDay.shortDate === 'N/A' || bestDay.pnl === -Infinity) bestDay = { shortDate: 'N/A', pnl: 0, count: 0 };
        if (worstDay.shortDate === 'N/A' || worstDay.pnl === Infinity) worstDay = { shortDate: 'N/A', pnl: 0, count: 0 };

        return { netPnl, winRate, totalCnt, dailyData, winningDays, losingDays, beDays, weeklyArr, bestDay, worstDay };
    }, [monthlyTrades, selectedYear, selectedMonth, t.reports?.week]);

    // Helpers
    const isYearlyProfit = yearlyStats.netPnl >= 0;
    const isMonthlyProfit = monthlyStats.netPnl >= 0;
    const monthNamesLocal = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    if (allTrades.filter(t => t.accountId === activeAccountId).length === 0) {
        return (
            <div className="glass-card p-20 flex flex-col items-center justify-center text-center animate-fade-scale">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-float">
                    <CalIcon size={36} className="text-primary-light" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{t.reports?.noTradesInYear || 'No closed trades yet.'}</h3>
            </div>
        );
    }

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // higher resolution
                backgroundColor: '#05050A', // match dark theme
                useCORS: true, 
            });
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate dimensions to fit to PDF A4 size
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: "a4" // 595 x 842
            });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            // If the content is too long for one page, jsPDF automatically cuts it or scales it. 
            // In our case we will fit it entirely horizontally and scale down vertically.
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Seven_Journal_Report_${selectedYear}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF", err);
            alert("Erreur lors de l'exportation du PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-8 pb-12 animate-fade-scale overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <CalendarDays size={22} className="text-primary-light" />
                        {t.reports?.periodicPerformance || "Periodic Performance"}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    {/* Export PDF Button */}
                    <button 
                        onClick={handleExportPDF} 
                        disabled={isExporting}
                        className="btn-ghost text-xs py-2 px-3 flex items-center gap-2"
                        title="Exporter en PDF"
                    >
                        {isExporting ? <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> : <Download size={14} />}
                        <span className="hidden sm:inline">Export</span>
                    </button>

                    {/* Year Selector */}
                    <div className="relative group">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-white/[0.04] border border-white/[0.07] text-white text-xs font-bold py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-primary/50 hover:bg-white/[0.08] transition-colors"
                        >
                            {availableYears.map(y => <option key={y} value={y} className="bg-[#111117]">{y}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 group-hover:text-white/70 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* The actual content to be exported */}
            <div ref={reportRef} className="space-y-6 pt-2">
                {/* ── YEARLY OVERVIEW ──────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-6 rounded-full bg-primary-light" />
                    <h3 className="text-lg font-bold">{t.reports?.yearlyOverview || "Yearly Overview"} - {selectedYear}</h3>
                </div>

                {/* Yearly KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard title={t.reports?.netPnl || "Net P&L"} value={`${isYearlyProfit ? '+' : ''}$${yearlyStats.netPnl.toFixed(2)}`} icon={<TrendingUp size={16} />} color={isYearlyProfit ? 'profit' : 'loss'} sub={`${yearlyStats.totalCnt} ${t.reports?.totalTrades || 'trades'}`} />
                    <MetricCard title={t.reports?.winRate || "Win Rate"} value={`${yearlyStats.winRate.toFixed(1)}%`} icon={<Target size={16} />} color="primary" />
                    <MetricCard title={t.reports?.bestMonth || "Best Month"} value={`${yearlyStats.bestMonth.pnl >= 0 ? '+' : ''}$${yearlyStats.bestMonth.pnl.toFixed(0)}`} icon={<Flame size={16} />} color="profit" sub={yearlyStats.bestMonth.name} />
                    <MetricCard title={t.reports?.profitFactor || "Profit Factor"} value={yearlyStats.profitFactor === Infinity ? '∞' : yearlyStats.profitFactor.toFixed(2)} icon={<Activity size={16} />} color={yearlyStats.profitFactor >= 1.5 ? 'profit' : 'loss'} />
                </div>

                {/* Yearly Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* PnL Per Month Bar Chart */}
                    <Card className="glass-card p-0 border-none overflow-hidden">
                        <CardHeader className="p-5 pb-2">
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <BarChart2 size={16} className="text-primary-light" /> {t.reports?.pnlPerMonth || "P&L per Month"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="h-[240px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={yearlyStats.monthsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="monthWin" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                            </linearGradient>
                                            <linearGradient id="monthLoss" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="name" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={60} />
                                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Net P&L']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                            {yearlyStats.monthsData.map((e, i) => (
                                                <Cell key={i} fill={e.pnl >= 0 ? "url(#monthWin)" : "url(#monthLoss)"} stroke={e.pnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1} strokeOpacity={0.5} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cumulative PnL Area Chart */}
                    <Card className="glass-card p-0 border-none overflow-hidden">
                        <CardHeader className="p-5 pb-2">
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <TrendingUp size={16} className="text-primary-light" /> {t.reports?.cumulativePnl || "Cumulative P&L"} ({selectedYear})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="h-[240px]">
                                {yearlyStats.cumulativeData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={yearlyStats.cumulativeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="eqGradYear" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={isYearlyProfit ? '#a78bfa' : '#ef4444'} stopOpacity={0.3} />
                                                    <stop offset="100%" stopColor={isYearlyProfit ? '#a78bfa' : '#ef4444'} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} minTickGap={30} />
                                            <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={60} />
                                            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Equity']} />
                                            <Area type="monotone" dataKey="equity" stroke={isYearlyProfit ? '#a78bfa' : '#ef4444'} strokeWidth={2.5} fill="url(#eqGradYear)" dot={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-white/30 text-xs font-mono">{t.reports?.noTradesInYear || 'No closed trades in this year.'}</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* MONTHLY BREAKDOWN */}
            <div className="space-y-4 pt-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 rounded-full bg-emerald-400" />
                        <h3 className="text-lg font-bold">{t.reports?.monthlyBreakdown || "Monthly Breakdown"}</h3>
                    </div>
                    {/* Month Selector */}
                    <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.07] overflow-x-auto custom-scrollbar">
                        {monthNamesLocal.map((m, i) => (
                            <button
                                key={m}
                                onClick={() => setSelectedMonth(i)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedMonth === i
                                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40'
                                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05] border border-transparent'
                                    }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {monthlyTrades.length === 0 ? (
                    <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
                        <CalendarDays size={24} className="text-white/20 mb-3" />
                        <p className="text-white/40 font-mono text-sm">{t.reports?.noTradesInMonth || 'No closed trades in this month.'}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <MetricCard title={t.reports?.netPnl || "Net P&L"} value={`${isMonthlyProfit ? '+' : ''}$${monthlyStats.netPnl.toFixed(2)}`} icon={<TrendingUp size={16} />} color={isMonthlyProfit ? 'profit' : 'loss'} sub={`${monthNamesLocal[selectedMonth]} ${selectedYear}`} />
                            <MetricCard title="Trades" value={monthlyStats.totalCnt.toString()} icon={<Activity size={16} />} color="primary" sub={`${monthlyStats.winRate.toFixed(1)}% WR`} />
                            <MetricCard title="Win / Loss Days" value={`${monthlyStats.winningDays} / ${monthlyStats.losingDays}`} icon={<CalendarDays size={16} />} color="cyan" sub={`${monthlyStats.beDays} breakeven days`} />
                            <MetricCard title="Best Day" value={`${monthlyStats.bestDay.pnl >= 0 ? '+' : ''}$${monthlyStats.bestDay.pnl.toFixed(0)}`} icon={<Flame size={16} />} color="profit" sub={`${monthlyStats.bestDay.shortDate} (${monthlyStats.bestDay.count} trades)`} />
                            <MetricCard title="Worst Day" value={`${monthlyStats.worstDay.pnl >= 0 ? '+' : ''}$${monthlyStats.worstDay.pnl.toFixed(0)}`} icon={<TrendingDown size={16} />} color="loss" sub={`${monthlyStats.worstDay.shortDate} (${monthlyStats.worstDay.count} trades)`} />
                        </div>

                        {/* Daily PnL Chart */}
                        <Card className="glass-card p-0 border-none overflow-hidden">
                            <CardHeader className="p-5 pb-2">
                                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                    <BarChart2 size={16} className="text-primary-light" /> Daily P&L Chart ({monthNamesLocal[selectedMonth]})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyStats.dailyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="dayWin" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                                                </linearGradient>
                                                <linearGradient id="dayLoss" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="dayNum" tick={axisStyle} tickLine={false} axisLine={false} tickMargin={8} />
                                            <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={60} />
                                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                                            <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, name: any, props: any) => [`$${Number(v).toFixed(2)} (${props.payload.count} trades)`, 'Daily P&L']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                                                {monthlyStats.dailyData.map((e, i) => (
                                                    <Cell key={i} fill={e.pnl >= 0 ? "url(#dayWin)" : "url(#dayLoss)"} stroke={e.pnl >= 0 ? "#10b981" : "#ef4444"} strokeWidth={1} strokeOpacity={0.5} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Calendar Heatmap (2 cols) */}
                            <Card className="glass-card p-0 border-none overflow-hidden lg:col-span-2 shadow-2xl">
                                <CardHeader className="p-5 pb-0 border-b border-white/[0.02]">
                                    <CardTitle className="text-sm uppercase tracking-widest font-black text-white/80 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                            <CalendarDays size={16} className="text-primary-light" />
                                        </div>
                                        {t.reports?.dailyPnLHeatmap || "Calendrier P&L Quotidien"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 sm:p-6 bg-gradient-to-b from-transparent to-black/20">
                                    <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                        {/* Day Names Header */}
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="text-center text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">{d}</div>
                                        ))}
                                        
                                        {/* Empty cells for start of month alignment */}
                                        {monthlyStats.dailyData[0] && Array.from({ length: monthlyStats.dailyData[0].dayOfWeek || 0 }).map((_, i) => (
                                            <div key={`empty-${i}`} className="p-2 rounded-xl opacity-0" />
                                        ))}

                                        {/* Actual Days */}
                                        {monthlyStats.dailyData.map((d, i) => {
                                            const isWin = d.pnl > 0;
                                            const isLoss = d.pnl < 0;
                                            const isTraded = d.count > 0;

                                            let bgColor = 'bg-white/[0.015] border-white/[0.04] text-white/40 hover:bg-white/[0.05]'; // No trades
                                            let gradient = '';

                                            if (isWin) {
                                                if (d.pnl > 500) {
                                                    bgColor = 'border-profit/40 shadow-[0_4px_25px_-5px_rgba(16,185,129,0.3)] text-white';
                                                    gradient = 'bg-gradient-to-br from-profit/40 to-profit/10';
                                                } else {
                                                    bgColor = 'border-profit/20 bg-profit/10 text-emerald-300';
                                                }
                                            }
                                            if (isLoss) {
                                                if (d.pnl < -500) {
                                                    bgColor = 'border-loss/40 shadow-[0_4px_25px_-5px_rgba(239,68,68,0.3)] text-white';
                                                    gradient = 'bg-gradient-to-br from-loss/40 to-loss/10';
                                                } else {
                                                    bgColor = 'border-loss/20 bg-loss/10 text-red-300';
                                                }
                                            }
                                            if (isTraded && !isWin && !isLoss) {
                                                bgColor = 'bg-white/[0.08] border-white/20 text-white'; // Breakeven
                                            }

                                            return (
                                                <div key={d.date} className={`relative flex flex-col justify-between min-h-[65px] sm:min-h-[85px] p-2 sm:p-3 rounded-2xl sm:rounded-[1.25rem] border backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${bgColor} ${gradient} group`}>
                                                    <span className={`text-[11px] font-black opacity-60 group-hover:opacity-100 transition-opacity`}>{d.dayNum}</span>
                                                    {isTraded && (
                                                        <div className="mt-1 flex flex-col items-start">
                                                            <span className={`text-xs sm:text-sm font-mono font-black tracking-tight ${isWin && d.pnl <= 500 ? 'text-emerald-400' : ''} ${isLoss && d.pnl >= -500 ? 'text-red-400' : ''}`}>
                                                                {isWin ? '+' : ''}{d.pnl > 0 ? '$' + d.pnl.toFixed(2) : d.pnl < 0 ? '-$' + Math.abs(d.pnl).toFixed(2) : '$0'}
                                                            </span>
                                                            <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold mt-0.5">{d.count} {d.count === 1 ? 'trade' : 'trades'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Weekly Summary (1 col) */}
                            <Card className="glass-card p-0 border-none overflow-hidden">
                                <CardHeader className="p-5 pb-2">
                                    <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                        <BarChart2 size={16} className="text-primary-light" /> {t.reports?.weekSummary || "Weekly Summary"}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-4 flex flex-col gap-3">
                                    {monthlyStats.weeklyArr.length === 0 && (
                                        <div className="text-center text-white/30 text-xs italic">No weekly data.</div>
                                    )}
                                    {monthlyStats.weeklyArr.map((w, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                                            <span className="text-xs font-bold text-white/70">{w.weekName}</span>
                                            <span className={`text-sm font-mono font-black ${w.pnl > 0 ? 'text-profit' : w.pnl < 0 ? 'text-loss' : 'text-white/50'}`}>
                                                {w.pnl > 0 ? '+' : ''}{w.pnl < 0 ? '-$' + Math.abs(w.pnl).toFixed(2) : '$' + w.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>

            </div> {/* End of Export Reference */}
        </div>
    );
}
