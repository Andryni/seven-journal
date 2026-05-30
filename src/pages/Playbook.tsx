import { useState } from 'react';
import { usePlaybookStore } from '../store/usePlaybookStore';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Trash2, Edit2, X, Shield, BookOpen } from 'lucide-react';

export function Playbook() {
    const currentUser = useAuthStore(state => state.currentUser);
    const setups = usePlaybookStore(state => state.setups.filter(s => s.accountId === currentUser?.activeAccountId));
    const addSetup = usePlaybookStore(state => state.addSetup);
    const updateSetup = usePlaybookStore(state => state.updateSetup);
    const deleteSetup = usePlaybookStore(state => state.deleteSetup);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState<string[]>([]);
    const [newRule, setNewRule] = useState('');

    const startEditing = (setup?: any) => {
        if (setup) {
            setEditingId(setup.id);
            setName(setup.name);
            setDescription(setup.description);
            setRules(setup.rules);
        } else {
            setEditingId('new');
            setName('');
            setDescription('');
            setRules([]);
        }
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveSetup = () => {
        if (!name.trim() || !currentUser?.activeAccountId) return;
        
        if (editingId === 'new') {
            addSetup({
                accountId: currentUser.activeAccountId,
                name,
                description,
                rules
            });
        } else if (editingId) {
            updateSetup(editingId, { name, description, rules });
        }
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BookOpen size={24} style={{ color: '#a78bfa' }} />
                        Playbook
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Define your trading setups and checklists to maintain discipline.
                    </p>
                </div>
                {!editingId && (
                    <button onClick={() => startEditing()} className="btn-primary flex items-center gap-2">
                        <Plus size={16} /> New Setup
                    </button>
                )}
            </div>

            {editingId && (
                <div className="p-6 rounded-2xl border" style={{ background: '#0f0f1a', borderColor: 'rgba(124,58,237,0.3)' }}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Setup Name</label>
                            <input 
                                value={name} onChange={e => setName(e.target.value)}
                                className="input-field" placeholder="e.g. Silver Bullet" autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Description</label>
                            <input 
                                value={description} onChange={e => setDescription(e.target.value)}
                                className="input-field" placeholder="Brief context about when to use this setup"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Rules / Checklist</label>
                            <div className="space-y-2 mb-3">
                                {rules.map((rule, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                                        <div className="flex-1 text-sm text-white/90">{rule}</div>
                                        <button onClick={() => setRules(r => r.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    value={newRule} onChange={e => setNewRule(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newRule.trim()) {
                                            e.preventDefault();
                                            setRules([...rules, newRule.trim()]);
                                            setNewRule('');
                                        }
                                    }}
                                    className="input-field flex-1" placeholder="Add a new rule (Press Enter)"
                                />
                                <button 
                                    onClick={() => {
                                        if (newRule.trim()) {
                                            setRules([...rules, newRule.trim()]);
                                            setNewRule('');
                                        }
                                    }}
                                    className="px-3 py-2.5 rounded-xl text-white font-bold bg-white/10 hover:bg-white/20 transition-colors">
                                    Add
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button onClick={cancelEditing} className="px-4 py-2 rounded-xl text-sm font-bold text-white/60 hover:text-white transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveSetup} className="btn-primary">
                                Save Setup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!editingId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {setups.map(setup => (
                        <div key={setup.id} className="p-5 rounded-2xl border transition-all hover:-translate-y-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-white">{setup.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditing(setup)} className="text-white/40 hover:text-violet-400 transition-colors">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => { if(confirm('Delete setup?')) deleteSetup(setup.id); }} className="text-white/40 hover:text-red-400 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-white/50 mb-4 h-8 overflow-hidden">{setup.description || 'No description'}</p>
                            
                            <div className="space-y-1.5">
                                {setup.rules.slice(0, 3).map((rule, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-white/80">
                                        <Shield size={12} className="mt-0.5 text-emerald-400 shrink-0" />
                                        <span className="truncate">{rule}</span>
                                    </div>
                                ))}
                                {setup.rules.length > 3 && (
                                    <div className="text-[10px] text-white/40 mt-1 italic">
                                        + {setup.rules.length - 3} more rules
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {setups.length === 0 && (
                        <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-white/10">
                            <BookOpen size={32} className="mx-auto mb-3 text-white/20" />
                            <p className="text-white/50">No setups defined yet. Create your first playbook setup to improve discipline.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
