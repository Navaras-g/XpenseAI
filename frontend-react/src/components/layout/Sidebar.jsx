import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
    LayoutDashboard, CreditCard, FolderOpen,
    AlertTriangle, RefreshCw, TrendingUp, Heart, LogOut
} from 'lucide-react'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/transactions', icon: CreditCard, label: 'Transactions' },
    { to: '/categories', icon: FolderOpen, label: 'Categories' },
    { to: '/anomalies', icon: AlertTriangle, label: 'Anomalies' },
    { to: '/subscriptions', icon: RefreshCw, label: 'Subscriptions' },
    { to: '/forecast', icon: TrendingUp, label: 'Forecast' },
    { to: '/health', icon: Heart, label: 'Health Score' },
]

export function Sidebar() {
    const { logout, username } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <aside className="w-64 min-h-screen bg-slate-900 border-r border-slate-700 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-slate-700">
                <h1 className="text-xl font-bold text-white">💰 ExpenseAI</h1>
                <p className="text-slate-400 text-xs mt-1">@{username}</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                ? 'bg-blue-600 text-white font-medium'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors w-full"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>
        </aside>
    )
}