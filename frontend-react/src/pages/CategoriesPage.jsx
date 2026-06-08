import { useState, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, LineChart, Line, Cell
} from 'recharts'
import { getTransactions } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const formatNPR = (n) => `NPR ${Number(n).toLocaleString()}`
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

export default function CategoriesPage() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCat, setSelectedCat] = useState(null)

    useEffect(() => {
        getTransactions({ limit: 200 })
            .then(res => {
                const data = res.data.data || []
                setTransactions(data)
                const cats = [...new Set(data.filter(t => t.transaction_type === 'debit' && t.category).map(t => t.category))]
                if (cats.length > 0) setSelectedCat(cats[0])
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingSpinner text="Loading categories..." />

    const expenses = transactions.filter(t => t.transaction_type === 'debit' && t.category)

    // Monthly totals per category
    const monthlyMap = {}
    expenses.forEach(t => {
        const m = t.date.slice(0, 7)
        if (!monthlyMap[m]) monthlyMap[m] = {}
        monthlyMap[m][t.category] = (monthlyMap[m][t.category] || 0) + Math.abs(t.amount)
    })
    const months = Object.keys(monthlyMap).sort()
    const categories = [...new Set(expenses.map(t => t.category))].sort()

    const barData = months.map(m => ({ month: m, ...monthlyMap[m] }))

    // Selected category detail
    const catTxns = expenses.filter(t => t.category === selectedCat)
    const catMonthly = months.map(m => ({
        month: m,
        amount: monthlyMap[m]?.[selectedCat] || 0
    }))
    const topMerchants = Object.entries(
        catTxns.reduce((acc, t) => {
            acc[t.merchant] = (acc[t.merchant] || 0) + Math.abs(t.amount)
            return acc
        }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 8)

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Category Analytics</h1>

            {/* Monthly stacked bar */}
            <Card>
                <CardTitle>Monthly Spend by Category</CardTitle>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <Tooltip
                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                            formatter={(v) => [formatNPR(v)]}
                        />
                        {categories.map((cat, i) => (
                            <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[i % COLORS.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            {/* Deep dive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <Card className="flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <CardTitle>Category Deep Dive</CardTitle>
                            <select
                                value={selectedCat || ''}
                                onChange={e => setSelectedCat(e.target.value)}
                                className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {selectedCat && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-slate-700/40 border border-slate-700/50 rounded-xl p-3.5 text-center">
                                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total</p>
                                        <p className="text-white font-bold text-base mt-1.5">
                                            {formatNPR(catTxns.reduce((s, t) => s + Math.abs(t.amount), 0))}
                                        </p>
                                    </div>
                                    <div className="bg-slate-700/40 border border-slate-700/50 rounded-xl p-3.5 text-center">
                                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avg</p>
                                        <p className="text-white font-bold text-base mt-1.5">
                                            {catTxns.length > 0
                                                ? formatNPR(catTxns.reduce((s, t) => s + Math.abs(t.amount), 0) / catTxns.length)
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-700/40 border border-slate-700/50 rounded-xl p-3.5 text-center">
                                        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Count</p>
                                        <p className="text-white font-bold text-base mt-1.5">{catTxns.length}</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <LineChart data={catMonthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                                formatter={(v) => [formatNPR(v)]}
                                            />
                                            <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <Card>
                    <CardTitle>Top Merchants — {selectedCat}</CardTitle>
                    <div className="space-y-6 mt-4 py-1">
                        {topMerchants.map(([merchant, amount], i) => {
                            const max = topMerchants[0][1]
                            const pct = Math.round((amount / max) * 100)
                            return (
                                <div key={merchant} className="space-y-2.5">
                                    <div className="flex justify-between items-center text-sm lg:text-base">
                                        <span className="text-slate-100 font-semibold tracking-wide">{merchant}</span>
                                        <span className="text-slate-400 font-mono text-xs lg:text-sm">{formatNPR(amount)}</span>
                                    </div>
                                    <div className="w-full bg-slate-700/50 rounded-full h-2.5">
                                        <div
                                            className="h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>
            </div>
        </div>
    )
}