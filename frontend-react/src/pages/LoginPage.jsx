import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Shield, Zap, BarChart3, Brain } from 'lucide-react'

const features = [
    {
        icon: Brain,
        title: 'ML-Powered Categorization',
        desc: 'Transactions are automatically categorized using a locally trained model that learns from your corrections.',
        accent: '#4f7fff',
    },
    {
        icon: ShieldAlert2,
        title: 'Anomaly Detection',
        desc: 'Isolation Forest algorithm identifies unusual spending patterns and flags them with plain-language explanations.',
        accent: '#8b5cf6',
    },
    {
        icon: BarChart3,
        title: 'Spending Forecasts',
        desc: 'Linear regression and moving average models predict your next month category-level spending.',
        accent: '#06d6c7',
    },
    {
        icon: Shield,
        title: 'Fully Local & Private',
        desc: 'Everything runs on your machine. No cloud, no subscriptions, no data leaving your computer.',
        accent: '#10e088',
    },
]

function ShieldAlert2(props) {
    return <Zap {...props} />
}

function FeatureCard({ feature, index }) {
    const Icon = feature.icon
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ y: -4, borderColor: `${feature.accent}40` }}
            style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 16, padding: '1.5rem',
                transition: 'border-color 0.2s',
            }}
        >
            <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: '1rem',
                background: `${feature.accent}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={20} style={{ color: feature.accent }} />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                {feature.title}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', lineHeight: 1.6 }}>
                {feature.desc}
            </p>
        </motion.div>
    )
}

function AuthModal({ onClose }) {
    const { login, register, loading, error } = useAuth()
    const navigate = useNavigate()
    const [tab, setTab] = useState('login')
    const [loginForm, setLoginForm] = useState({ username: '', password: '' })
    const [regForm, setRegForm] = useState({ username: '', email: '', password: '' })
    const [regSuccess, setRegSuccess] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        const ok = await login(loginForm.username, loginForm.password)
        if (ok) navigate('/')
    }

    const handleRegister = async (e) => {
        e.preventDefault()
        const ok = await register(regForm.username, regForm.email, regForm.password)
        if (ok) { setRegSuccess(true); setTab('login') }
    }

    const inputStyle = {
        width: '100%', background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-primary)', borderRadius: 10,
        padding: '0.65rem 1rem', fontSize: '0.9rem', outline: 'none',
        transition: 'border-color 0.2s',
    }

    const btnPrimary = {
        width: '100%', padding: '0.7rem',
        background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
        border: 'none', borderRadius: 10, color: 'white',
        fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
        opacity: loading ? 0.6 : 1,
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 50,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 20, padding: '2rem',
                }}
            >
                <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.3rem', marginBottom: '1.5rem' }}>
                    {tab === 'login' ? 'Welcome back' : 'Create account'}
                </h2>

                {/* Tabs */}
                <div style={{
                    display: 'flex', background: 'var(--bg-elevated)',
                    borderRadius: 10, padding: 4, marginBottom: '1.5rem',
                }}>
                    {['login', 'register'].map(t => (
                        <motion.button
                            key={t}
                            onClick={() => setTab(t)}
                            whileTap={{ scale: 0.97 }}
                            style={{
                                flex: 1, padding: '0.45rem',
                                borderRadius: 8, border: 'none', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: 500,
                                background: tab === t ? 'var(--bg-overlay)' : 'transparent',
                                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                                textTransform: 'capitalize',
                            }}
                        >{t}</motion.button>
                    ))}
                </div>

                {error && (
                    <div style={{
                        marginBottom: '1rem', padding: '0.75rem 1rem',
                        background: '#ff4f6a15', border: '1px solid #ff4f6a30',
                        borderRadius: 10, color: '#ff4f6a', fontSize: '0.85rem',
                    }}>{error}</div>
                )}

                {regSuccess && (
                    <div style={{
                        marginBottom: '1rem', padding: '0.75rem 1rem',
                        background: '#10e08815', border: '1px solid #10e08830',
                        borderRadius: 10, color: '#10e088', fontSize: '0.85rem',
                    }}>Account created. Please sign in.</div>
                )}

                <AnimatePresence mode="wait">
                    {tab === 'login' ? (
                        <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleLogin}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Username</label>
                                <input style={inputStyle} type="text" value={loginForm.username}
                                    onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                    onFocus={e => e.target.style.borderColor = '#4f7fff'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                                    required />
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Password</label>
                                <input style={inputStyle} type="password" value={loginForm.password}
                                    onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                    onFocus={e => e.target.style.borderColor = '#4f7fff'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                                    required />
                            </div>
                            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} style={btnPrimary}>
                                {loading ? 'Signing in...' : 'Sign in'}
                            </motion.button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="register"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleRegister}
                            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        >
                            {[
                                { label: 'Username', key: 'username', type: 'text' },
                                { label: 'Email', key: 'email', type: 'email' },
                                { label: 'Password', key: 'password', type: 'password' },
                            ].map(({ label, key, type }) => (
                                <div key={key}>
                                    <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>{label}</label>
                                    <input style={inputStyle} type={type} value={regForm[key]}
                                        onChange={e => setRegForm({ ...regForm, [key]: e.target.value })}
                                        onFocus={e => e.target.style.borderColor = '#4f7fff'}
                                        onBlur={e => e.target.style.borderColor = 'var(--border-strong)'}
                                        required />
                                </div>
                            ))}
                            <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={loading} style={btnPrimary}>
                                {loading ? 'Creating account...' : 'Create account'}
                            </motion.button>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}

export default function LoginPage() {
    const [showAuth, setShowAuth] = useState(false)

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', overflowX: 'hidden' }}>

            {/* Background gradients */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                background: `
          radial-gradient(ellipse 70% 50% at 50% -5%, rgba(79,127,255,0.12) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 85% 30%, rgba(139,92,246,0.08) 0%, transparent 55%),
          radial-gradient(ellipse 40% 30% at 15% 70%, rgba(6,214,199,0.05) 0%, transparent 50%)
        `,
            }} />

            {/* Navbar */}
            <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 3rem',
                    borderBottom: '1px solid var(--border)',
                    background: 'rgba(10,10,15,0.8)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.85rem', color: 'white',
                    }}>E</div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>
                        ExpenseAI
                    </span>
                </div>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAuth(true)}
                    style={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)', padding: '0.5rem 1.25rem',
                        borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500,
                    }}
                >
                    Sign in
                </motion.button>
            </motion.nav>

            {/* Hero */}
            <section style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center', padding: '14rem 2rem 8rem',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.35rem 1rem', borderRadius: 99,
                        border: '1px solid rgba(79,127,255,0.3)',
                        background: 'rgba(79,127,255,0.08)',
                        color: '#4f7fff', fontSize: '0.78rem', fontWeight: 500,
                        marginBottom: '2rem', letterSpacing: '0.04em',
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f7fff', display: 'inline-block' }} />
                        Fully local. Zero cloud. Complete privacy.
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.8rem, 6vw, 5rem)',
                        fontWeight: 800, lineHeight: 1.08,
                        letterSpacing: '-0.03em',
                        color: 'var(--text-primary)',
                        maxWidth: '14ch', margin: '0 auto 1.5rem',
                    }}>
                        Your finances,{' '}
                        <span style={{ background: 'linear-gradient(135deg, #4f7fff, #8b5cf6, #06d6c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            intelligently
                        </span>{' '}
                        analyzed.
                    </h1>

                    <p style={{
                        color: 'var(--text-secondary)', fontSize: '1.1rem',
                        lineHeight: 1.7, maxWidth: '42ch', margin: '0 auto 3rem',
                    }}>
                        Upload your bank statements and get ML-powered insights — automatic categorization,
                        anomaly detection, subscription tracking, and spending forecasts. All on your machine.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <motion.button
                            whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(79,127,255,0.25)' }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setShowAuth(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.85rem 2rem', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                                color: 'white', fontWeight: 600, fontSize: '0.95rem',
                                cursor: 'pointer', letterSpacing: '-0.01em',
                            }}
                        >
                            Get started
                            <ArrowRight size={18} />
                        </motion.button>
                    </div>
                </motion.div>

                {/* Floating stats */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    style={{
                        display: 'flex', gap: '1.5rem', marginTop: '5rem',
                        flexWrap: 'wrap', justifyContent: 'center',
                    }}
                >
                    {[
                        { label: 'ML Accuracy', value: '95%+', accent: '#4f7fff' },
                        { label: 'Categories', value: '16', accent: '#8b5cf6' },
                        { label: 'Data stays local', value: '100%', accent: '#10e088' },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 }}
                            style={{
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                borderRadius: 14, padding: '1.25rem 2rem', textAlign: 'center', minWidth: 130,
                            }}
                        >
                            <p style={{ color: stat.accent, fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.02em' }}>{stat.value}</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>{stat.label}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Features */}
            <section style={{
                position: 'relative', zIndex: 1,
                maxWidth: 1100, margin: '0 auto', padding: '4rem 2rem 8rem',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '4rem' }}
                >
                    <h2 style={{
                        fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)',
                        fontWeight: 800, letterSpacing: '-0.02em',
                        color: 'var(--text-primary)', marginBottom: '1rem',
                    }}>
                        Everything you need to understand your money
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '48ch', margin: '0 auto' }}>
                        Built with Python, FastAPI, PostgreSQL, and scikit-learn. No third-party data sharing. Ever.
                    </p>
                </motion.div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {features.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
                </div>
            </section>

            {/* CTA */}
            <section style={{
                position: 'relative', zIndex: 1,
                textAlign: 'center', padding: '4rem 2rem 8rem',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{
                        maxWidth: 600, margin: '0 auto',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 24, padding: '3.5rem 2.5rem',
                    }}
                >
                    <h2 style={{
                        fontSize: '2rem', fontWeight: 800,
                        letterSpacing: '-0.02em', color: 'var(--text-primary)',
                        marginBottom: '1rem',
                    }}>
                        Ready to take control?
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                        Upload your first bank statement and get a complete financial picture in under a minute.
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(79,127,255,0.2)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAuth(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.85rem 2.25rem', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                            color: 'white', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                        }}
                    >
                        Get started for free
                        <ArrowRight size={18} />
                    </motion.button>
                </motion.div>
            </section>

            {/* Auth modal */}
            <AnimatePresence>
                {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
            </AnimatePresence>
        </div>
    )
}