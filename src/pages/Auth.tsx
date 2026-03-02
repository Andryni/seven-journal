import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowRight, Eye, EyeOff, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';



/* ── Background visual ─────────────────────────────────────── */
function AuthBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
            {/* Orbs */}
            <div className="absolute -top-64 -left-64 w-[700px] h-[700px] rounded-full opacity-60"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', filter: 'blur(60px)' }} />
            <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-50"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
            {/* Grid */}
            <div className="absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            {/* Inline SVG chart accent */}
            <div className="absolute bottom-0 right-0 w-1/2 h-48 opacity-10">
                <svg viewBox="0 0 600 180" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d="M0,160 L60,130 L120,140 L180,100 L240,80 L300,90 L360,55 L420,45 L480,30 L540,15 L600,10 L600,180 Z" fill="url(#authGrad)" />
                    <path d="M0,160 L60,130 L120,140 L180,100 L240,80 L300,90 L360,55 L420,45 L480,30 L540,15 L600,10" fill="none" stroke="#7c3aed" strokeWidth="2" />
                </svg>
            </div>
        </div>
    );
}

/* ── Input field ────────────────────────────────────────────── */
function AuthInput({ label, type, value, onChange, placeholder, id }: {
    label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; id: string;
}) {
    const [show, setShow] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (show ? 'text' : 'password') : type || 'text';

    return (
        <div>
            <label htmlFor={id} className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {label}
            </label>
            <div className="relative">
                <input id={id} type={inputType} value={value} onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    required
                    className="w-full py-3.5 px-4 pr-12 rounded-2xl text-sm text-white outline-none transition-all duration-200"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontFamily: "'Space Grotesk', sans-serif",
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.1), 0 0 20px rgba(124,58,237,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                />
                {isPassword && (
                    <button type="button" onClick={() => setShow(!show)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Shared layout ──────────────────────────────────────────── */
function AuthLayout({ children, title, subtitle }: {
    children: React.ReactNode; title: string; subtitle: string;
}) {
    const { t } = useTranslation();
    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#06060a', fontFamily: "'Space Grotesk', sans-serif" }}>
            <AuthBackground />

            <div className="relative z-10 w-full max-w-md">
                {/* Back to home */}
                <Link to="/" className="inline-flex items-center gap-2 text-xs mb-8 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>
                    ← {t.auth.backToHome}
                </Link>

                {/* Logo */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', boxShadow: '0 8px 30px rgba(124,58,237,0.5)', fontFamily: 'Orbitron, monospace' }}>
                        7
                    </div>
                    <div>
                        <div className="font-black text-sm tracking-[3px] text-white" style={{ fontFamily: 'Orbitron, monospace' }}>SEVEN</div>
                        <div className="text-[9px] font-bold tracking-[4px] mt-0.5" style={{ color: '#a78bfa' }}>JOURNAL</div>
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-3xl p-8"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>
                    </div>

                    {children}

                    {/* Social proof strip */}
                    <div className="mt-6 pt-6 flex items-center justify-center gap-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {[
                            { Icon: ShieldCheck, label: '100% Private', color: '#10b981' },
                            { Icon: Zap, label: 'No Cloud', color: '#f59e0b' },
                            { Icon: TrendingUp, label: 'Free Forever', color: '#a78bfa' },
                        ].map(({ Icon, label, color }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <Icon size={13} style={{ color }} />
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Sign In ────────────────────────────────────────────────── */
export function SignIn() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore(state => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');

        const { error } = await login(email, password);
        if (!error) {
            navigate('/app/dashboard');
        } else {
            setError(error.message || 'Invalid email or password.');
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t.auth.signInTitle} subtitle={t.auth.signInSub}>
            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl text-sm font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                <AuthInput id="signin-email" label={t.auth.email} type="email" value={email} onChange={setEmail} placeholder="trader@example.com" />
                <AuthInput id="signin-password" label={t.auth.password} type="password" value={password} onChange={setPassword} placeholder="••••••••" />

                <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all mt-2 relative overflow-hidden"
                    style={{ background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)' }}>
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            {t.auth.authenticating}
                        </span>
                    ) : (
                        <>{t.auth.signInBtn} <ArrowRight size={15} /></>
                    )}
                </button>

                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t.auth.noAccount}{' '}
                    <Link to="/signup" className="font-bold transition-colors" style={{ color: '#a78bfa' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c4b5fd')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#a78bfa')}>
                        {t.auth.createOne}
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}

/* ── Sign Up ────────────────────────────────────────────────── */
export function SignUp() {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore(state => state.register);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) return setError("Passwords don't match.");
        if (password.length < 8) return setError("Password must be at least 8 characters.");
        setLoading(true); setError('');

        const { error } = await register(username, email, password);
        if (!error) {
            navigate('/app/dashboard');
        } else {
            setError(error.message || 'Could not create account.');
            setLoading(false);
        }
    };

    return (
        <AuthLayout title={t.auth.signUpTitle} subtitle={t.auth.signUpSub}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 p-3.5 rounded-2xl text-sm font-medium"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                        {error}
                    </div>
                )}

                <AuthInput id="signup-username" label={t.auth.username} value={username} onChange={setUsername} placeholder="TraderOne" />
                <AuthInput id="signup-email" label={t.auth.email} type="email" value={email} onChange={setEmail} placeholder="trader@example.com" />

                <div className="grid grid-cols-2 gap-3">
                    <AuthInput id="signup-password" label={t.auth.password} type="password" value={password} onChange={setPassword} placeholder="8+ chars" />
                    <AuthInput id="signup-confirm" label={t.common.cancel === 'Cancel' ? 'Confirm' : 'Confirmer'} type="password" value={confirm} onChange={setConfirm} placeholder="Repeat" />
                </div>

                <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all relative overflow-hidden"
                    style={{ background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)', marginTop: '8px' }}>
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            {t.auth.creating}
                        </span>
                    ) : (
                        <>{t.auth.signUpBtn} <ArrowRight size={15} /></>
                    )}
                </button>

                <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {t.auth.haveAccount}{' '}
                    <Link to="/signin" className="font-bold transition-colors" style={{ color: '#a78bfa' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c4b5fd')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#a78bfa')}>
                        {t.auth.loginNow}
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
