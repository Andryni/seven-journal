import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tradeSchema } from '../lib/schemas';
import type { Trade } from '../lib/schemas';
import { useTradeStore } from '../store/useTradeStore';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

import { useEffect, useState } from 'react';
import {
    ArrowLeft, Save, BookOpen as _BookOpen, Shield,
    Target, Brain, Camera, Tag, FileText, ChevronDown, Zap, DollarSign, Percent,
    Trash2, Upload, X
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';

/* ── Small reusable components ─────────────────────────────── */
function ImageUpload({
    label,
    value,
    onChange,
    onUploading,
    t
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    onUploading?: (status: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: any;
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true);
            onUploading?.(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `setups/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('trades')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('trades')
                .getPublicUrl(filePath);

            onChange(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please ensure a "trades" bucket exists in your Supabase storage.');
        } finally {
            setIsUploading(false);
            onUploading?.(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div
                className={`relative group rounded-xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center bg-white/[0.02] ${dragActive ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 hover:border-white/20'}`}
                style={{ aspectRatio: '16/9' }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]); }}
            >
                {value ? (
                    <>
                        <img src={value} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <label className="cursor-pointer p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all">
                                <Upload size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={onFileChange} disabled={isUploading} />
                            </label>
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 backdrop-blur-md transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-3 hover:bg-white/[0.04] transition-all">
                        {isUploading ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t.common.loading}</span>
                            </div>
                        ) : (
                            <>
                                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                                    <Camera size={22} className="text-white/20" />
                                </div>
                                <div className="text-center px-4">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mb-1">{t.common.importImage}</p>
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{t.common.dropOrClick}</p>
                                </div>
                            </>
                        )}
                        <input type="file" className="hidden" accept="image/*" onChange={onFileChange} disabled={isUploading} />
                    </label>
                )}
            </div>
            {/* Fallback URL input */}
            <div className="relative mt-2">
                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ou collez une URL directe..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-[11px] text-white/50 bg-white/[0.03] border border-white/[0.06] outline-none focus:border-violet-500/30 transition-all font-mono"
                />
                <Camera size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:text-white transition-colors"
                    >
                        <X size={10} />
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Small reusable components ─────────────────────────────── */
function SectionHeader({ icon: Icon, label, color = '#a78bfa' }: { icon: React.ElementType; label: string; color?: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                <Icon size={13} style={{ color }} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
            <div className="flex-1 h-px ml-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <span className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{children}</span>;
}

function ErrorMsg({ msg }: { msg?: string }) {
    if (!msg) return null;
    return <p className="mt-1 text-[10px] font-semibold" style={{ color: '#f87171' }}>{msg}</p>;
}

/* ── Toggle: $ or % ────────────────────────────────────────── */
function ModeToggle({ value, onChange }: { value: 'currency' | 'percent'; onChange: (v: 'currency' | 'percent') => void }) {
    return (
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {(['currency', 'percent'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => onChange(mode)}
                    className="flex items-center justify-center w-8 h-full transition-all duration-150"
                    style={{
                        background: value === mode ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.03)',
                        color: value === mode ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                    }}>
                    {mode === 'currency' ? <DollarSign size={12} /> : <Percent size={12} />}
                </button>
            ))}
        </div>
    );
}

/* ── Input with mode toggle (Risk / Gain) ───────────────────── */
function AmountInput({
    label, mode, onModeChange, register, name, placeholder,
    color = '#a78bfa', error,
}: {
    label: string; mode: 'currency' | 'percent'; onModeChange: (v: 'currency' | 'percent') => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: any; name: string;
    placeholder?: string; color?: string; error?: string;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex overflow-hidden rounded-xl border transition-all focus-within:border-violet-500/50"
                style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
                <ModeToggle value={mode} onChange={onModeChange} />
                <input type="number" step="0.01" min="0"
                    {...register(name as any, { valueAsNumber: true })}
                    placeholder={placeholder ?? (mode === 'currency' ? '0.00' : '0.0')}
                    className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-white outline-none placeholder:text-white/20"
                />
                <span className="flex items-center pr-3 text-xs font-bold" style={{ color }}>
                    {mode === 'currency' ? '$' : '%'}
                </span>
            </div>
            <ErrorMsg msg={error} />
        </div>
    );
}

/* ── Styled select ──────────────────────────────────────────── */
function StyledSelect({ label, error, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="relative">
                <select {...rest}
                    className="w-full px-3 py-2.5 pr-8 rounded-xl text-sm text-white outline-none appearance-none transition-all focus:border-violet-500/50"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }}>
                    {children}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
            </div>
            <ErrorMsg msg={error} />
        </div>
    );
}

/* ── Position button ────────────────────────────────────────── */
function PositionToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div>
            <Label>Direction</Label>
            <div className="flex gap-2">
                {[
                    { val: 'BUY', label: '↑ BUY', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
                    { val: 'SELL', label: '↓ SELL', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)' },
                ].map(({ val, label, color, bg, border }) => (
                    <button key={val} type="button" onClick={() => onChange(val)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-150"
                        style={value === val
                            ? { background: bg, border: `1px solid ${border}`, color }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Emotion selector ───────────────────────────────────────── */
function EmotionSelector({ label, value, onChange, options, color = '#a78bfa' }: {
    label: string; value: string; onChange: (v: string) => void;
    options: { val: string; emoji: string }[]; color?: string;
}) {
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex flex-wrap gap-1.5">
                {options.map(({ val, emoji }) => (
                    <button key={val} type="button" onClick={() => onChange(value === val ? '' : val)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={value === val
                            ? { background: `${color}25`, border: `1px solid ${color}50`, color }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                        {emoji} {val}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Grade selector ─────────────────────────────────────────── */
function GradeSelector({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const grades = [
        { val: 'A+', color: '#10b981' }, { val: 'A', color: '#34d399' }, { val: 'B', color: '#a78bfa' },
        { val: 'C', color: '#f59e0b' }, { val: 'F', color: '#ef4444' },
    ];
    return (
        <div>
            <Label>{label}</Label>
            <div className="flex gap-2">
                {grades.map(({ val, color }) => (
                    <button key={val} type="button" onClick={() => onChange(value === val ? '' : val)}
                        className="flex-1 py-2 rounded-xl text-sm font-black transition-all"
                        style={value === val
                            ? { background: `${color}20`, border: `1px solid ${color}50`, color }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
                        {val}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   MAIN FORM
══════════════════════════════════════════════════════════════ */
export function TradeForm() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const { addTrade, updateTrade, getTradeById } = useTradeStore();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);

    /* Risk / Gain mode states */
    const [riskMode, setRiskMode] = useState<'currency' | 'percent'>('percent');
    const [gainMode, setGainMode] = useState<'currency' | 'percent'>('percent');

    const form = useForm<Trade>({
        resolver: zodResolver(tradeSchema),
        defaultValues: {
            accountId: activeAccountId || '',
            pair: 'XAUUSD',
            position: 'BUY',
            entryPrice: 0,       // hidden but required by schema
            exitPrice: null,
            lotSize: 1,
            stopLoss: null,
            takeProfit: null,
            timeframe: 'M15',
            session: 'London',
            strategy: '',
            riskPlanned: { mode: 'percent', value: 1 },
            rewardPlanned: { mode: 'percent', value: 2 },
            plannedRR: 2,
            actualRR: null,
            result: 'Running',
            confluence: [],
            pnl: null,
            netPnl: null,
            commission: 0,
            emotionBefore: null,
            emotionAfter: null,
            tradeGrade: null,
            tags: [],
            notes: '',
            setupBeforeUrl: '',
            setupAfterUrl: '',
            checklistSnapshot: [],
            openedAt: new Date().toISOString().slice(0, 16),
            closedAt: null,
            duration: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    });

    const { register, handleSubmit, setValue, getValues, watch, formState: { errors } } = form;

    // Watch risk & gain values to auto-compute R:R
    const riskVal = watch('riskPlanned.value');
    const gainVal = watch('rewardPlanned.value');

    useEffect(() => {
        if (riskVal && gainVal && riskVal > 0) {
            // For R:R we just divide the amounts directly (both in same unit)
            setValue('plannedRR', parseFloat((gainVal / riskVal).toFixed(2)));
        }
    }, [riskVal, gainVal]);

    useEffect(() => {
        // Sync mode to form field
        setValue('riskPlanned', { mode: riskMode, value: getValues('riskPlanned.value') || 1 });
    }, [riskMode]);

    useEffect(() => {
        setValue('rewardPlanned', { mode: gainMode, value: getValues('rewardPlanned.value') || 2 });
    }, [gainMode]);

    useEffect(() => {
        if (isEditing && id) {
            const existing = getTradeById(id);
            if (existing) {
                form.reset(existing);
                setRiskMode(existing.riskPlanned?.mode ?? 'percent');
                setGainMode(existing.rewardPlanned?.mode ?? 'percent');
            }
        } else if (activeAccountId) {
            setValue('accountId', activeAccountId);
        }
    }, [id, isEditing, activeAccountId, getTradeById, setValue]);

    // Watched values for display
    const position = watch('position');
    const result = watch('result');
    const emotBefore = watch('emotionBefore') ?? '';
    const emotAfter = watch('emotionAfter') ?? '';
    const grade = watch('tradeGrade') ?? '';
    const plannedRR = watch('plannedRR');
    const netPnl = watch('netPnl');

    const onInvalid = (errs: any) => {
        console.error('Form validation failed:', errs);
    };

    const onSubmit = async (data: Trade) => {
        if (!activeAccountId) {
            console.error('Submit failed: No active account ID');
            return;
        }
        setIsSaving(true);
        const now = new Date().toISOString();
        data.updatedAt = now;
        data.accountId = activeAccountId;

        try {
            console.log('Saving trade...', data);
            let response;
            if (isEditing && id) {
                response = await updateTrade(id, data);
            } else {
                response = await addTrade(data);
            }

            if (response && response.error) {
                console.error('Record error:', response.error);
                alert(`Erreur: ${response.error.message || 'Impossible d\'enregistrer le trade'}`);
                setIsSaving(false);
            } else {
                navigate('/app/trades');
            }
        } catch (error) {
            console.error('Failed to save trade:', error);
            alert('Une erreur inattendue est survenue.');
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">

            {/* ── Page header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => navigate('/app/trades')}
                        className="p-2 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <p className="section-label mb-0.5">{t.common.journal}</p>
                        <h2 className="text-2xl font-bold text-white">
                            {isEditing ? t.tradeForm.editTrade : t.tradeForm.logTrade}
                        </h2>
                    </div>
                </div>

                {/* Live R:R badge */}
                {plannedRR > 0 && (
                    <div className="px-4 py-2 rounded-2xl text-center"
                        style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)' }}>
                        <p className="text-[9px] uppercase tracking-widest font-bold mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Planned R:R</p>
                        <p className="text-xl font-black font-mono" style={{ color: '#a78bfa' }}>{plannedRR}R</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5">

                {/* ══ SECTION 1: Trade Setup ══════════════════ */}
                <div className="glass-card p-6">
                    <SectionHeader icon={Zap} label={t.tradeForm.logTrade.split(' ')[1] || 'Setup'} color="#06b6d4" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Pair */}
                        <div>
                            <Label>{t.tradeForm.pair}</Label>
                            <div className="relative">
                                <input {...register('pair')}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm font-bold text-white uppercase outline-none transition-all focus:border-violet-500/50"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    placeholder="e.g. XAUUSD" />
                            </div>
                            <ErrorMsg msg={errors.pair?.message} />
                        </div>

                        {/* Position */}
                        <PositionToggle
                            value={position}
                            onChange={v => setValue('position', v as 'BUY' | 'SELL')}
                        />

                        {/* Result */}
                        <StyledSelect label={t.tradeForm.result} {...register('result')}>
                            <option value="Running">🔵 Running</option>
                            <option value="TP">✅ TP — Take Profit</option>
                            <option value="SL">❌ SL — Stop Loss</option>
                            <option value="BE">⚖️ BE — Break Even</option>
                            <option value="Partial">🔶 {t.debrief.partial}</option>
                            <option value="Manual Close">🔧 Manual</option>
                        </StyledSelect>

                        {/* Session */}
                        <StyledSelect label={t.tradeForm.session} {...register('session')}>
                            <option value="Asia">🌏 Asia</option>
                            <option value="London">🇬🇧 London</option>
                            <option value="New York">🇺🇸 New York</option>
                            <option value="Overlap">🔄 Overlap</option>
                            <option value="Off Session">💤 Off Session</option>
                        </StyledSelect>

                        {/* Strategy */}
                        <div className="sm:col-span-2">
                            <Label>{t.tradeForm.strategy}</Label>
                            <input {...register('strategy')}
                                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:border-violet-500/50"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                placeholder="e.g. ICT BPR, Order Block, EMA Crossover…"
                            />
                            <ErrorMsg msg={errors.strategy?.message} />
                        </div>
                    </div>
                </div>

                {/* ══ SECTION 2: Risk & Reward ════════════════ */}
                <div className="glass-card p-6">
                    <SectionHeader icon={Shield} label={t.tradeForm.risk + ' & ' + t.tradeForm.gain} color="#10b981" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Risk */}
                        <AmountInput
                            label={t.tradeForm.risk}
                            mode={riskMode}
                            onModeChange={setRiskMode}
                            register={register}
                            name="riskPlanned.value"
                            color="#ef4444"
                            placeholder={riskMode === 'percent' ? '1.0' : '100'}
                            error={errors.riskPlanned?.value?.message}
                        />

                        {/* Gain */}
                        <AmountInput
                            label={t.tradeForm.gain}
                            mode={gainMode}
                            onModeChange={setGainMode}
                            register={register}
                            name="rewardPlanned.value"
                            color="#10b981"
                            placeholder={gainMode === 'percent' ? '2.0' : '200'}
                            error={errors.rewardPlanned?.value?.message}
                        />

                        {/* Planned R:R — auto-calculated */}
                        <div>
                            <Label>Planned R:R</Label>
                            <div className="relative">
                                <input type="number" step="0.01"
                                    {...register('plannedRR', { valueAsNumber: true })}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm font-mono font-bold outline-none transition-all focus:border-violet-500/50"
                                    style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)', color: '#a78bfa' }}
                                    placeholder="0.00"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'rgba(167,139,250,0.5)' }}>R</span>
                            </div>
                        </div>
                    </div>

                    {/* Net P&L row (for closed trades) */}
                    {result !== 'Running' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t"
                            style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div>
                                <Label>{t.tradeForm.netPnl}</Label>
                                <div className="relative">
                                    <input type="number" step="0.01"
                                        {...register('netPnl', { valueAsNumber: true })}
                                        placeholder="0.00"
                                        className="w-full px-3 py-2.5 rounded-xl text-sm font-mono font-bold outline-none transition-all"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: (netPnl ?? 0) > 0 ? '#10b981' : (netPnl ?? 0) < 0 ? '#ef4444' : '#fff',
                                        }}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>$</span>
                                </div>
                            </div>
                            <div>
                                <Label>{t.tradeForm.commission}</Label>
                                <input type="number" step="0.01"
                                    {...register('commission', { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                            <div>
                                <Label>{t.tradeForm.actualRR}</Label>
                                <input type="number" step="0.01"
                                    {...register('actualRR', { valueAsNumber: true })}
                                    placeholder="0.00"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm font-mono text-white outline-none transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ══ SECTION 3: Confluence & Evidence ════════ */}
                <div className="glass-card p-6">
                    <SectionHeader icon={Target} label={t.tradeForm.confluenceAndEvidence} color="#f59e0b" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Confluences */}
                        <div>
                            <Label>{t.tradeForm.confluences}</Label>
                            <input type="text"
                                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:border-violet-500/50"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                placeholder={t.tradeForm.confluencesPlaceholder}
                                onChange={e => setValue('confluence', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            />
                        </div>

                        <div>
                            <Label>{t.tradeForm.tags}</Label>
                            <div className="relative">
                                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                                <input type="text"
                                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all focus:border-violet-500/50"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    placeholder={t.tradeForm.tagsPlaceholder}
                                    onChange={e => setValue('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                />
                            </div>
                        </div>

                        <ImageUpload
                            label={`${t.tradeForm.setupScreenshot} (${t.common.before})`}
                            value={watch('setupBeforeUrl')}
                            onChange={v => setValue('setupBeforeUrl', v)}
                            onUploading={setIsUploading}
                            t={t}
                        />

                        <ImageUpload
                            label={`${t.tradeForm.setupScreenshot} (${t.common.after})`}
                            value={watch('setupAfterUrl')}
                            onChange={v => setValue('setupAfterUrl', v)}
                            onUploading={setIsUploading}
                            t={t}
                        />
                    </div>
                </div>

                {/* ══ SECTION 4: Psychology ════════════════════ */}
                <div className="glass-card p-6">
                    <SectionHeader icon={Brain} label={t.tradeForm.psychology} color="#a78bfa" />

                    <div className="space-y-5">
                        <EmotionSelector
                            label={t.tradeForm.emotionBefore}
                            value={emotBefore}
                            onChange={v => setValue('emotionBefore', (v || null) as Trade['emotionBefore'])}
                            color="#06b6d4"
                            options={[
                                { val: 'Confident', emoji: '😎' },
                                { val: 'Neutral', emoji: '😐' },
                                { val: 'Anxious', emoji: '😰' },
                                { val: 'FOMO', emoji: '🚀' },
                                { val: 'Revenge', emoji: '😤' },
                                { val: 'Bored', emoji: '😴' },
                            ]}
                        />

                        <EmotionSelector
                            label={t.tradeForm.emotionAfter}
                            value={emotAfter}
                            onChange={v => setValue('emotionAfter', (v || null) as Trade['emotionAfter'])}
                            color="#10b981"
                            options={[
                                { val: 'Satisfied', emoji: '✅' },
                                { val: 'Excited', emoji: '🎉' },
                                { val: 'Calm', emoji: '🧘' },
                                { val: 'Frustrated', emoji: '😠' },
                                { val: 'Regret', emoji: '😔' },
                            ]}
                        />

                        <GradeSelector
                            label={t.tradeForm.tradeGrade}
                            value={grade}
                            onChange={v => setValue('tradeGrade', (v || null) as Trade['tradeGrade'])}
                        />
                    </div>
                </div>

                {/* ══ SECTION 5: Notes ═════════════════════════ */}
                <div className="glass-card p-6">
                    <SectionHeader icon={FileText} label={t.tradeForm.notesAndRationale} color="#f87171" />
                    <div>
                        <Label>{t.tradeForm.tradeNotes}</Label>
                        <textarea {...register('notes')} rows={4}
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none transition-all resize-none custom-scrollbar focus:border-violet-500/50"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                            placeholder={t.tradeForm.tradeNotesPlaceholder}
                        />
                    </div>
                </div>

                {/* ══ Actions ══════════════════════════════════ */}
                <div className="flex items-center justify-between gap-4">
                    <button type="button" onClick={() => navigate('/app/trades')}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                        {t.common.cancel}
                    </button>
                    <button type="submit" disabled={isSaving || isUploading} className="btn-primary px-8 py-2.5 gap-2">
                        {isSaving || isUploading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                {isUploading ? t.common.loading : t.common.saving}
                            </span>
                        ) : (
                            <>
                                <Save size={15} />
                                {isEditing ? t.common.update : t.common.save}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
