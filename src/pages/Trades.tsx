import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    createColumnHelper, flexRender, getCoreRowModel,
    useReactTable, getPaginationRowModel, getSortedRowModel, getFilteredRowModel,
} from '@tanstack/react-table';
import type { SortingState } from '@tanstack/react-table';
import type { Trade } from '../lib/schemas';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Trash2, Edit2, ExternalLink, ChevronUp, ChevronDown, Plus, BookOpen,
    ChevronLeft, ChevronRight, Filter, X, Search, SlidersHorizontal
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

const columnHelper = createColumnHelper<Trade>();

function ResultBadge({ result }: { result: string }) {
    const cls: Record<string, string> = { TP: 'badge-tp', SL: 'badge-sl', BE: 'badge-be', Running: 'badge-run' };
    return <span className={cls[result] ?? 'badge-be'}>{result}</span>;
}
function PositionBadge({ pos }: { pos: string }) {
    return <span className={pos === 'BUY' ? 'badge-buy' : 'badge-sell'}>{pos}</span>;
}

/* ── Filter pills ─────────────────────────────────────────── */
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>
            {label}
            <button onClick={onRemove} className="hover:text-white transition-colors"><X size={10} /></button>
        </span>
    );
}

/* ── Select Input ─────────────────────────────────────────── */
function FilterSelect({ label, value, onChange, options }: {
    label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
            <select value={value} onChange={e => onChange(e.target.value)}
                className="input-field text-xs py-2 pr-7 appearance-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </label>
    );
}

/* ── Trades ─────────────────────────────────────────────────── */
export function Trades() {
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const allTrades = useTradeStore(state => state.trades);
    const deleteTrade = useTradeStore(state => state.deleteTrade);
    const { t } = useTranslation();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [showFilters, setShowFilters] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    /* filters */
    const [search, setSearch] = useState('');
    const [fPair, setFPair] = useState('');
    const [fResult, setFResult] = useState('');
    const [fPos, setFPos] = useState('');
    const [fSession, setFSession] = useState('');
    const [fStrategy, setFStrategy] = useState('');
    const [fGrade, setFGrade] = useState('');
    const [fDateFrom, setFDateFrom] = useState('');
    const [fDateTo, setFDateTo] = useState('');

    useEffect(() => {
        function close(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const baseTrades = useMemo(
        () => allTrades.filter(t => t.accountId === activeAccountId),
        [allTrades, activeAccountId]
    );

    /* Unique values for filter dropdowns */
    const pairs = useMemo(() => [...new Set(baseTrades.map(t => t.pair))].sort(), [baseTrades]);
    const strategies = useMemo(() => [...new Set(baseTrades.map(t => t.strategy).filter(Boolean))].sort(), [baseTrades]);

    const trades = useMemo(() => {
        let tr = baseTrades;
        if (search) tr = tr.filter(x => x.pair.toLowerCase().includes(search.toLowerCase()) || x.notes?.toLowerCase().includes(search.toLowerCase()));
        if (fPair) tr = tr.filter(x => x.pair === fPair);
        if (fResult) tr = tr.filter(x => x.result === fResult);
        if (fPos) tr = tr.filter(x => x.position === fPos);
        if (fSession) tr = tr.filter(x => x.session === fSession);
        if (fStrategy) tr = tr.filter(x => x.strategy === fStrategy);
        if (fGrade) tr = tr.filter(x => x.tradeGrade === fGrade);
        if (fDateFrom || fDateTo) {
            const from = fDateFrom ? startOfDay(new Date(fDateFrom)) : new Date(0);
            const to = fDateTo ? endOfDay(new Date(fDateTo)) : new Date(8640000000000000);
            tr = tr.filter(x => isWithinInterval(parseISO(x.openedAt), { start: from, end: to }));
        }
        return tr;
    }, [baseTrades, search, fPair, fResult, fPos, fSession, fStrategy, fGrade, fDateFrom, fDateTo]);

    /* active filter count */
    const activeFilters = [fPair, fResult, fPos, fSession, fStrategy, fGrade, fDateFrom || fDateTo ? 'date' : ''].filter(Boolean).length;

    const clearAllFilters = () => {
        setSearch(''); setFPair(''); setFResult(''); setFPos('');
        setFSession(''); setFStrategy(''); setFGrade(''); setFDateFrom(''); setFDateTo('');
    };

    const totalPnL = useMemo(() => trades.reduce((acc, tr) => acc + (tr.netPnl || 0), 0), [trades]);
    const totalWins = useMemo(() => trades.filter(tr => (tr.netPnl || 0) > 0).length, [trades]);
    const winrate = trades.filter(tr => tr.result !== 'Running').length > 0
        ? (totalWins / trades.filter(tr => tr.result !== 'Running').length) * 100 : 0;

    const columns = [
        columnHelper.accessor('openedAt', {
            header: t.common.calendar,
            cell: info => (
                <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {format(new Date(info.getValue()), 'MMM dd, yyyy')}<br />
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>{format(new Date(info.getValue()), 'HH:mm')}</span>
                </span>
            )
        }),
        columnHelper.accessor('pair', {
            header: 'Symbol',
            cell: info => (
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] flex-shrink-0"
                        style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                        {info.getValue().slice(0, 2)}
                    </div>
                    <span className="font-bold text-white">{info.getValue()}</span>
                </div>
            )
        }),
        columnHelper.accessor('position', { header: t.trades.side, cell: info => <PositionBadge pos={info.getValue()} /> }),
        columnHelper.accessor('result', { header: t.trades.result, cell: info => <ResultBadge result={info.getValue()} /> }),
        columnHelper.accessor('strategy', {
            header: 'Strategy',
            cell: info => <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{info.getValue() || '—'}</span>
        }),
        columnHelper.accessor('session', {
            header: 'Session',
            cell: info => <span className="text-xs font-semibold" style={{ color: '#06b6d4' }}>{info.getValue()}</span>
        }),
        columnHelper.accessor('netPnl', {
            header: 'Net PnL',
            cell: info => {
                const val = info.getValue() || 0;
                return <span className={`font-mono font-bold text-sm ${val > 0 ? 'text-profit' : val < 0 ? 'text-loss' : 'text-text-secondary'}`}>
                    {val > 0 ? '+' : ''}${val.toFixed(2)}
                </span>;
            }
        }),
        columnHelper.display({
            id: 'actions',
            cell: props => (
                <div className="flex items-center gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                    {props.row.original.id && (
                        <>
                            <Link to={`/app/trades/${props.row.original.id}`}
                                className="p-1.5 rounded-lg transition-colors hover:bg-cyan-500/10" style={{ color: 'rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#06b6d4')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                                <ExternalLink size={13} />
                            </Link>
                            <Link to={`/app/trades/${props.row.original.id}/edit`}
                                className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                                <Edit2 size={13} />
                            </Link>
                            <button onClick={() => {
                                if (confirm('Delete this trade? This cannot be undone.')) {
                                    if (props.row.original.id) deleteTrade(props.row.original.id);
                                }
                            }}
                                className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')} onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                                <Trash2 size={13} />
                            </button>
                        </>
                    )}
                </div>
            )
        }),
    ];

    const table = useReactTable({
        data: trades, columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 15 } },
    });

    const RESULT_OPTIONS = [
        { value: '', label: t.trades.result }, { value: 'TP', label: 'Take Profit' },
        { value: 'SL', label: 'Stop Loss' }, { value: 'BE', label: 'Break Even' },
        { value: 'Partial', label: 'Partial' }, { value: 'Manual Close', label: 'Manual' }, { value: 'Running', label: 'Running' },
    ];
    const SESSION_OPTIONS = [
        { value: '', label: 'All Sessions' }, { value: 'Asia', label: 'Asia' },
        { value: 'London', label: 'London' }, { value: 'New York', label: 'New York' },
        { value: 'Overlap', label: 'Overlap' }, { value: 'Off Session', label: 'Off Session' },
    ];
    const GRADE_OPTIONS = [
        { value: '', label: 'All Grades' }, { value: 'A+', label: 'A+' }, { value: 'A', label: 'A' },
        { value: 'B', label: 'B' }, { value: 'C', label: 'C' }, { value: 'F', label: 'F' },
    ];

    return (
        <div className="space-y-5">
            {/* ── Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="section-label mb-1">{t.common.journal}</p>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BookOpen size={20} style={{ color: '#a78bfa' }} />
                        {t.trades.allTrades}
                    </h2>
                </div>
                <Link to="/app/trades/new" className="btn-primary">
                    <Plus size={15} /> {t.trades.addTrade}
                </Link>
            </div>

            {/* ── Search + Filter bar */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-48 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t.trades.searchPair}
                            className="input-field pl-9 py-2 text-xs"
                            style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>

                    {/* Filter toggle */}
                    <div ref={filterRef} className="relative">
                        <button onClick={() => setShowFilters(v => !v)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            style={showFilters || activeFilters > 0
                                ? { background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' }
                                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                            <SlidersHorizontal size={13} />
                            {t.trades.filterBy}
                            {activeFilters > 0 && (
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                                    style={{ background: '#7c3aed', color: '#fff' }}>{activeFilters}</span>
                            )}
                        </button>

                        {/* Filter panel */}
                        {showFilters && (
                            <div className="fixed md:absolute inset-x-4 md:inset-x-auto top-1/2 md:top-full -translate-y-1/2 md:translate-y-0 md:left-0 z-50 p-5 rounded-2xl shadow-2xl w-auto md:w-[520px] max-h-[85vh] overflow-y-auto custom-scrollbar"
                                style={{ background: '#0e0e18', border: '1px solid rgba(124,58,237,0.25)' }}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Filter size={14} style={{ color: '#a78bfa' }} />
                                        <span className="font-bold text-white text-sm">Filters</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {activeFilters > 0 && (
                                            <button onClick={clearAllFilters} className="text-xs font-bold transition-colors"
                                                style={{ color: '#ef4444' }}>{t.trades.clearFilters.split(' ')[0]}</button>
                                        )}
                                        <button onClick={() => setShowFilters(false)} className="p-1 md:hidden">
                                            <X size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                    {/* Pair */}
                                    <FilterSelect label="Pair / Symbol" value={fPair} onChange={setFPair}
                                        options={[{ value: '', label: 'All Pairs' }, ...pairs.map(p => ({ value: p, label: p }))]} />

                                    {/* Position */}
                                    <FilterSelect label="Direction" value={fPos} onChange={setFPos}
                                        options={[{ value: '', label: 'All Directions' }, { value: 'BUY', label: '↑ BUY (Long)' }, { value: 'SELL', label: '↓ SELL (Short)' }]} />

                                    {/* Result */}
                                    <FilterSelect label="Result" value={fResult} onChange={setFResult} options={RESULT_OPTIONS} />

                                    {/* Session */}
                                    <FilterSelect label="Session" value={fSession} onChange={setFSession} options={SESSION_OPTIONS} />

                                    {/* Strategy */}
                                    <FilterSelect label="Strategy" value={fStrategy} onChange={setFStrategy}
                                        options={[{ value: '', label: 'All Strategies' }, ...strategies.map(s => ({ value: s, label: s }))]} />

                                    {/* Grade */}
                                    <FilterSelect label="Grade" value={fGrade} onChange={setFGrade} options={GRADE_OPTIONS} />

                                    {/* Date range */}
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Date From</span>
                                        <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)}
                                            className="input-field text-xs py-2" style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }} />
                                    </label>
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Date To</span>
                                        <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)}
                                            className="input-field text-xs py-2" style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }} />
                                    </label>
                                </div>

                                <button onClick={() => setShowFilters(false)}
                                    className="w-full btn-primary py-2.5 text-xs mt-4">
                                    Apply Filters ({trades.length} result{trades.length !== 1 ? 's' : ''})
                                </button>
                            </div>
                        )}
                    </div>

                    {activeFilters > 0 && (
                        <button onClick={clearAllFilters} className="text-xs font-semibold flex items-center gap-1 transition-colors"
                            style={{ color: 'rgba(239,68,68,0.7)' }}>
                            <X size={12} /> {t.trades.clearFilters}
                        </button>
                    )}
                </div>

                {/* Active filter pills */}
                {activeFilters > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {fPair && <FilterPill label={`Pair: ${fPair}`} onRemove={() => setFPair('')} />}
                        {fResult && <FilterPill label={`Result: ${fResult}`} onRemove={() => setFResult('')} />}
                        {fPos && <FilterPill label={`Direction: ${fPos}`} onRemove={() => setFPos('')} />}
                        {fSession && <FilterPill label={`Session: ${fSession}`} onRemove={() => setFSession('')} />}
                        {fStrategy && <FilterPill label={`Strategy: ${fStrategy}`} onRemove={() => setFStrategy('')} />}
                        {fGrade && <FilterPill label={`Grade: ${fGrade}`} onRemove={() => setFGrade('')} />}
                        {(fDateFrom || fDateTo) && (
                            <FilterPill label={`Date: ${fDateFrom || '…'} → ${fDateTo || '…'}`}
                                onRemove={() => { setFDateFrom(''); setFDateTo(''); }} />
                        )}
                    </div>
                )}
            </div>

            {/* ── Quick stats bar */}
            {trades.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                    {[
                        { label: 'Trades', val: trades.length, color: '#fff' },
                        { label: 'Win Rate', val: `${winrate.toFixed(1)}%`, color: winrate >= 50 ? '#10b981' : '#ef4444' },
                        { label: 'Net P&L', val: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)}`, color: totalPnL >= 0 ? '#10b981' : '#ef4444', full: true },
                    ].map(({ label, val, color, full }) => (
                        <div key={label} className={`px-4 py-2.5 md:px-5 md:py-3 rounded-2xl flex items-center justify-between ${full ? 'col-span-2 sm:col-span-1' : ''}`}
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span className="text-[9px] md:section-label uppercase tracking-widest">{label}</span>
                            <span className="font-mono font-bold text-sm md:text-lg" style={{ color }}>{val}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Table */}
            <div className="glass-card overflow-hidden !rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {table.getHeaderGroups().map(hg => hg.headers.map(header => (
                                    <th key={header.id} className="px-5 py-4 select-none cursor-pointer"
                                        onClick={header.column.getToggleSortingHandler()}>
                                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                                            style={{ color: 'rgba(255,255,255,0.35)' }}>
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            {header.column.getIsSorted() === 'asc' && <ChevronUp size={12} style={{ color: '#a78bfa' }} />}
                                            {header.column.getIsSorted() === 'desc' && <ChevronDown size={12} style={{ color: '#a78bfa' }} />}
                                        </span>
                                    </th>
                                )))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center animate-float">
                                                <BookOpen size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                            </div>
                                            <p className="font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                                {baseTrades.length === 0 ? t.dashboard.noTrades : 'No trades match your filters.'}
                                            </p>
                                            {baseTrades.length === 0 ? (
                                                <Link to="/app/trades/new" className="btn-primary text-xs px-4 py-2 mt-1">
                                                    <Plus size={13} /> Log your first trade
                                                </Link>
                                            ) : (
                                                <button onClick={clearAllFilters} className="text-xs font-bold transition-colors" style={{ color: '#a78bfa' }}>
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row, idx) => (
                                    <tr key={row.id}
                                        className="group/row border-b border-white/[0.035] hover:bg-primary/5 transition-all duration-150"
                                        style={{ animationDelay: `${idx * 0.03}s` }}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-5 py-4">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {table.getRowModel().rows.length > 0 && (
                    <div className="px-5 py-3.5 flex items-center justify-between border-t border-white/[0.05]"
                        style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {trades.length} trade{trades.length !== 1 ? 's' : ''} {activeFilters > 0 ? '(filtered)' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                                className="p-1.5 rounded-lg border border-white/10 hover:border-primary/30 hover:bg-primary/10 disabled:opacity-30 transition-all"
                                style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-mono px-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                            </span>
                            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                                className="p-1.5 rounded-lg border border-white/10 hover:border-primary/30 hover:bg-primary/10 disabled:opacity-30 transition-all"
                                style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
