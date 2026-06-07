import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
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
        if (ok) {
            setRegSuccess(true)
            setTab('login')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">💰 ExpenseAI</h1>
                    <p className="text-slate-400">Your personal finance analytics — fully local, fully private.</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
                    {/* Tabs */}
                    <div className="flex mb-6 bg-slate-900 rounded-lg p-1">
                        {['login', 'register'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {regSuccess && (
                        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                            Account created! Please log in.
                        </div>
                    )}

                    {tab === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Username</label>
                                <input
                                    type="text"
                                    value={loginForm.username}
                                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Password</label>
                                <input
                                    type="password"
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                            >
                                {loading ? 'Logging in...' : 'Login'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Username</label>
                                <input
                                    type="text"
                                    value={regForm.username}
                                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Email</label>
                                <input
                                    type="email"
                                    value={regForm.email}
                                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-slate-400 text-sm block mb-1">Password</label>
                                <input
                                    type="password"
                                    value={regForm.password}
                                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}