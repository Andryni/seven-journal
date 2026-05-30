import { useState, useRef } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { useAuthStore } from '../store/useAuthStore';
import { X, Upload, FileText, Check, AlertTriangle, HelpCircle } from 'lucide-react';
import type { Trade } from '../lib/schemas';
import { nanoid } from 'nanoid';

interface ImportCsvModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ImportCsvModal({ isOpen, onClose }: ImportCsvModalProps) {
    const activeAccountId = useAuthStore(state => state.currentUser?.activeAccountId);
    const addTrade = useTradeStore(state => state.addTrade);

    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [parsedData, setParsedData] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappings, setMappings] = useState<Record<string, number>>({});
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
    const [previewTrades, setPreviewTrades] = useState<Partial<Trade>[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // Standard fields we want to populate
    const schemaFields = [
        { key: 'pair', label: 'Symbol / Pair *', required: true },
        { key: 'position', label: 'Direction (BUY/SELL) *', required: true },
        { key: 'entryPrice', label: 'Entry Price *', required: true },
        { key: 'exitPrice', label: 'Exit Price', required: false },
        { key: 'lotSize', label: 'Lot Size / Volume *', required: true },
        { key: 'stopLoss', label: 'Stop Loss (SL)', required: false },
        { key: 'takeProfit', label: 'Take Profit (TP)', required: false },
        { key: 'netPnl', label: 'Net Profit & Loss *', required: true },
        { key: 'commission', label: 'Commission', required: false },
        { key: 'openedAt', label: 'Open Date & Time *', required: true },
        { key: 'closedAt', label: 'Close Date & Time', required: false },
        { key: 'strategy', label: 'Strategy / Setup Name', required: false },
    ];

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (uploadedFile: File) => {
        setFile(uploadedFile);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            // Basic CSV parser that handles quotes
            const rows: string[][] = [];
            const lines = text.split(/\r?\n/);
            
            for (const line of lines) {
                if (!line.trim()) continue;
                const row: string[] = [];
                let insideQuote = false;
                let currentCell = '';
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        insideQuote = !insideQuote;
                    } else if (char === ',' && !insideQuote) {
                        row.push(currentCell.trim().replace(/^"|"$/g, ''));
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                row.push(currentCell.trim().replace(/^"|"$/g, ''));
                rows.push(row);
            }

            if (rows.length < 2) {
                alert("The CSV file must have at least a header row and one trade row.");
                return;
            }

            const fileHeaders = rows[0].map(h => h.trim());
            setHeaders(fileHeaders);
            setParsedData(rows.slice(1));
            
            // Try to auto-detect columns
            const autoMappings: Record<string, number> = {};
            const findIndex = (keywords: string[]) => {
                return fileHeaders.findIndex(h => 
                    keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
                );
            };

            const pairIdx = findIndex(['symbol', 'pair', 'asset', 'instrument', 'devise']);
            const posIdx = findIndex(['type', 'direction', 'side', 'action', 'position']);
            const entryIdx = findIndex(['open price', 'entry price', 'price', 'prix d\'entree', 'cours open']);
            const exitIdx = findIndex(['close price', 'exit price', 'close_price', 'prix de sortie']);
            const lotIdx = findIndex(['volume', 'lot', 'size', 'quantite', 'lots']);
            const slIdx = findIndex(['s / l', 'sl', 'stop loss', 'stop_loss']);
            const tpIdx = findIndex(['t / p', 'tp', 'take profit', 'take_profit']);
            const pnlIdx = findIndex(['profit', 'pnl', 'net', 'gain', 'perte']);
            const commIdx = findIndex(['commission', 'swap', 'frais']);
            const openDateIdx = findIndex(['open time', 'time', 'date', 'opened', 'heure open']);
            const closeDateIdx = findIndex(['close time', 'closed', 'heure close']);
            const stratIdx = findIndex(['strategy', 'setup', 'strategie']);

            if (pairIdx !== -1) autoMappings['pair'] = pairIdx;
            if (posIdx !== -1) autoMappings['position'] = posIdx;
            if (entryIdx !== -1) autoMappings['entryPrice'] = entryIdx;
            if (exitIdx !== -1) autoMappings['exitPrice'] = exitIdx;
            if (lotIdx !== -1) autoMappings['lotSize'] = lotIdx;
            if (slIdx !== -1) autoMappings['stopLoss'] = slIdx;
            if (tpIdx !== -1) autoMappings['takeProfit'] = tpIdx;
            if (pnlIdx !== -1) autoMappings['netPnl'] = pnlIdx;
            if (commIdx !== -1) autoMappings['commission'] = commIdx;
            if (openDateIdx !== -1) autoMappings['openedAt'] = openDateIdx;
            if (closeDateIdx !== -1) autoMappings['closedAt'] = closeDateIdx;
            if (stratIdx !== -1) autoMappings['strategy'] = stratIdx;

            setMappings(autoMappings);
            setStep('mapping');
        };
        reader.readAsText(uploadedFile);
    };

    const handleMappingChange = (fieldKey: string, columnIndex: number) => {
        setMappings(prev => {
            const next = { ...prev };
            if (columnIndex === -1) {
                delete next[fieldKey];
            } else {
                next[fieldKey] = columnIndex;
            }
            return next;
        });
    };

    const generatePreview = () => {
        // Validate required fields
        const missingRequired = schemaFields
            .filter(f => f.required && mappings[f.key] === undefined)
            .map(f => f.label);

        if (missingRequired.length > 0) {
            alert(`Please map the following required fields:\n- ${missingRequired.join('\n- ')}`);
            return;
        }

        const trades: Partial<Trade>[] = parsedData.map(row => {
            const getVal = (key: string) => {
                const colIdx = mappings[key];
                return colIdx !== undefined ? row[colIdx] : '';
            };

            const rawPos = getVal('position').toUpperCase();
            const position = rawPos.includes('BUY') || rawPos.includes('LONG') || rawPos.includes('ACHAT') ? 'BUY' : 'SELL';
            
            const rawResult = parseFloat(getVal('netPnl') || '0');
            let result: Trade['result'] = 'Running';
            if (rawResult > 0) result = 'TP';
            else if (rawResult < 0) result = 'SL';
            else result = 'BE';

            const rawOpenDate = getVal('openedAt');
            const openedAt = rawOpenDate ? new Date(rawOpenDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
            const closedAt = getVal('closedAt') ? new Date(getVal('closedAt')).toISOString().slice(0, 16) : null;

            return {
                id: nanoid(),
                accountId: activeAccountId || '',
                pair: getVal('pair').toUpperCase() || 'XAUUSD',
                position,
                entryPrice: parseFloat(getVal('entryPrice') || '0') || 0,
                exitPrice: parseFloat(getVal('exitPrice') || '0') || null,
                lotSize: parseFloat(getVal('lotSize') || '1') || 1,
                stopLoss: parseFloat(getVal('stopLoss') || '0') || null,
                takeProfit: parseFloat(getVal('takeProfit') || '0') || null,
                netPnl: parseFloat(getVal('netPnl') || '0') || 0,
                commission: parseFloat(getVal('commission') || '0') || 0,
                result,
                strategy: getVal('strategy') || 'CSV Import',
                timeframe: 'M15',
                session: 'London',
                riskPlanned: { mode: 'percent', value: 1 },
                rewardPlanned: { mode: 'percent', value: 2 },
                plannedRR: 2,
                actualRR: null,
                confluence: [],
                tags: ['Imported'],
                notes: `Imported via CSV file on ${new Date().toLocaleDateString()}`,
                openedAt,
                closedAt,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                checklistSnapshot: [],
                setupBeforeUrl: '',
                setupAfterUrl: ''
            };
        });

        setPreviewTrades(trades);
        setStep('preview');
    };

    const handleSaveImports = async () => {
        if (!activeAccountId) return;
        setIsSaving(true);
        try {
            let successCount = 0;
            for (const t of previewTrades) {
                // Ensure correct active account ID is bound
                t.accountId = activeAccountId;
                const res = await addTrade(t as Trade);
                if (res && !res.error) successCount++;
            }
            alert(`${successCount} trades successfully imported!`);
            onClose();
        } catch (err) {
            console.error('CSV import failed:', err);
            alert('Failed to import some trades. Please check your data.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#07070d] overflow-hidden flex flex-col max-h-[85vh]" style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-violet-400" />
                        <h3 className="text-base font-bold text-white">Importer des Trades (CSV)</h3>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Steps Navigator */}
                <div className="flex bg-white/[0.02] border-b border-white/5 px-6 py-2.5 text-xs text-white/50 justify-between items-center">
                    <span className={step === 'upload' ? 'text-violet-400 font-bold' : ''}>1. Fichier CSV</span>
                    <span className="text-white/20">➔</span>
                    <span className={step === 'mapping' ? 'text-violet-400 font-bold' : ''}>2. Colonnes</span>
                    <span className="text-white/20">➔</span>
                    <span className={step === 'preview' ? 'text-violet-400 font-bold' : ''}>3. Aperçu & Enregistrement</span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <div 
                                className={`relative border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all bg-white/[0.01] ${dragActive ? 'border-violet-500 bg-violet-500/5' : 'border-white/10 hover:border-white/20'}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                style={{ aspectRatio: '16/8' }}
                            >
                                <Upload size={32} className="text-violet-400/50 mb-3" />
                                <h4 className="text-sm font-bold text-white/80 mb-1">Glissez-déposez votre fichier CSV ici</h4>
                                <p className="text-[10px] text-white/30 mb-4">Supporte les exports de MetaTrader 4, MetaTrader 5 et formats standards</p>
                                
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/25 border border-white/10 text-xs text-white font-bold rounded-xl transition-all"
                                >
                                    Parcourir les fichiers
                                </button>
                                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                            </div>

                            <div className="p-4 rounded-xl border border-violet-500/10 bg-violet-500/[0.02] flex gap-3 text-xs text-violet-300">
                                <HelpCircle size={16} className="shrink-0 mt-0.5" />
                                <div className="space-y-1.5 leading-relaxed">
                                    <p className="font-bold">Comment préparer votre CSV :</p>
                                    <p>Assurez-vous que la première ligne contient les en-têtes de colonnes (ex: Symbol, Volume, Price, Profit). Vos dates doivent être lisibles par les navigateurs (ex: AAAA-MM-JJ hh:mm:ss).</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-white/70">Mappez les colonnes de votre CSV aux champs attendus :</h4>
                                <span className="text-[10px] text-white/40">Fichier chargé : {file?.name}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {schemaFields.map(field => (
                                    <div key={field.key} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <span className="block text-xs font-bold text-white/85 truncate">{field.label}</span>
                                            <span className="text-[9px] text-white/30 font-semibold">{field.required ? 'Obligatoire' : 'Facultatif'}</span>
                                        </div>
                                        <select 
                                            value={mappings[field.key] !== undefined ? mappings[field.key] : -1}
                                            onChange={e => handleMappingChange(field.key, parseInt(e.target.value))}
                                            className="px-2.5 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-violet-500/50 max-w-[180px]"
                                        >
                                            <option value={-1}>-- Non associé --</option>
                                            {headers.map((h, idx) => (
                                                <option key={idx} value={idx}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-xs font-bold text-white/70">Aperçu des trades détectés ({previewTrades.length}) :</h4>
                                <span className="text-[10px] text-green-400 flex items-center gap-1">
                                    <Check size={12} /> Prêt pour l'importation
                                </span>
                            </div>

                            <div className="border border-white/10 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/5 text-white/40 font-bold uppercase tracking-wider">
                                            <th className="p-3">Symbol</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Lot</th>
                                            <th className="p-3">Prix d'Entrée</th>
                                            <th className="p-3 text-right">Profit ($)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-white/70 font-mono">
                                        {previewTrades.slice(0, 10).map((t, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.01]">
                                                <td className="p-3 font-sans font-bold text-white">{t.pair}</td>
                                                <td className={`p-3 font-sans font-bold ${t.position === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.position}</td>
                                                <td className="p-3">{t.lotSize}</td>
                                                <td className="p-3">{t.entryPrice?.toFixed(5)}</td>
                                                <td className={`p-3 text-right font-bold ${parseFloat(t.netPnl as any || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {parseFloat(t.netPnl as any || '0') >= 0 ? '+' : ''}{t.netPnl?.toFixed(2)}$
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {previewTrades.length > 10 && (
                                <p className="text-[10px] text-white/30 italic text-center">
                                    ... et {previewTrades.length - 10} autres trades détectés
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-white/5 bg-[#05050a] flex items-center justify-between">
                    {step !== 'upload' ? (
                        <button 
                            onClick={() => setStep(step === 'mapping' ? 'upload' : 'mapping')}
                            className="px-4 py-2 border border-white/10 hover:bg-white/5 text-xs text-white/70 font-bold rounded-xl transition-all"
                        >
                            Précédent
                        </button>
                    ) : <div />}

                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 border border-white/10 hover:bg-white/5 text-xs text-white/50 font-bold rounded-xl transition-all"
                        >
                            Annuler
                        </button>
                        
                        {step === 'mapping' && (
                            <button 
                                onClick={generatePreview}
                                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-xs text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
                            >
                                Suivant : Aperçu
                            </button>
                        )}

                        {step === 'preview' && (
                            <button 
                                onClick={handleSaveImports}
                                disabled={isSaving}
                                className="px-6 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/40 text-xs text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : 'Enregistrer les Imports'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
