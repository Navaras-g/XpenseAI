import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { motion } from 'framer-motion'
import {
    LayoutDashboard, CreditCard, FolderOpen,
    ShieldAlert, Repeat2, TrendingUp, Activity, LogOut
} from 'lucide-react'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/categories', icon: FolderOpen, label: 'Categories' },
    { to: '/anomalies', icon: ShieldAlert, label: 'Anomalies' },
    { to: '/subscriptions', icon: Repeat2, label: 'Subscriptions' },
    { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
    { to: '/health', icon: Activity, label: 'Health Score' },
]

export function Sidebar() {
    const { logout, username } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = () => { logout(); navigate('/login') }

    return (
        <motion.aside
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
                width: 240, minHeight: '100vh', flexShrink: 0,
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                position: 'sticky', top: 0, height: '100vh',
            }}
        >
            {/* Logo */}
            <div style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 800, color: 'white',
                    }}>E</div>
                    <div>
                        <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>XpenseAI</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>@{username}</p>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {navItems.map(({ to, icon: Icon, label }) => {
                    const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
                    return (
                        <NavLink key={to} to={to} end={to === '/'} style={{ textDecoration: 'none' }}>
                            <motion.div
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.6rem 0.85rem', borderRadius: 10,
                                    fontSize: '0.85rem', fontWeight: isActive ? 600 : 400,
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                    background: isActive ? 'var(--bg-elevated)' : 'transparent',
                                    transition: 'all 0.15s ease',
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        style={{
                                            position: 'absolute', left: 0, top: '20%', bottom: '20%',
                                            width: 3, borderRadius: 99,
                                            background: 'linear-gradient(180deg, #4f7fff, #8b5cf6)',
                                        }}
                                    />
                                )}
                                <Icon size={16} style={{ opacity: isActive ? 1 : 0.6 }} />
                                {label}
                            </motion.div>
                        </NavLink>
                    )
                })}
            </nav>

            {/* Logout */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <motion.button
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLogout}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '0.85rem',
                        transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff4f6a'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    <LogOut size={16} />
                    Sign out
                </motion.button>
            </div>
        </motion.aside>
    )
}