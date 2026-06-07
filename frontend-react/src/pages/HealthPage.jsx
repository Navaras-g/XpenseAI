import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getDashboardSummary } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MonthPicker } from '../components/ui/MonthPicker'
import { format, subMonths } from 'date-fns'

export default function HealthPage() {
    const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'))
    const [data, setData] = useState(null)
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        getDashboardSummary(month)
            .then(res => setData(res.data.data || null))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [month])

    // Load last 6 months for trend
    useEffect(() => {
        const months = Array.from({ length: 6 }, (_, i) =>
            format(subMonths(new Date(), i + 1), 'yyyy-MM')
        ).reverse()

        Promise.all(months.map(m =>
            getDashboardSummary(m).then(r => ({
                month: m,
                score: r.data.data?.health_score || null
            })).catch(() => ({ month: m, score: null }))
        )).then(results => setHistory(results.filter(r => r.score !== null)))
    }, [])

    if (loading) return <LoadingSpinner text="Computing health score..." />

    const score = data?.health_score
    const components = data?.health_components || {}
    const summary = data?.health_summary

    const scoreColor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'
    const scoreEmoji = score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴'

    const tips = {
        savings_rate: 'Increase savings by cutting discretionary spending like dining and entertainment.',
        spending_consistency: 'Spread spending evenly across the month to avoid large spikes.',
        anomaly_burden: 'Review flagged transactions — unexpected charges may indicate errors or fraud.',
        subscription_burden: 'Audit subscriptions and cancel unused ones.',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Financial Health</h1>
                <MonthPicker value={month} onChange={setMonth} />
            </div>

            {!data ? (
                <Card><p className="text-slate-400 text-center py-8">No data for this month.</p></Card>
            ) : (
                <>
                    {/* Score display */}
                    <Card>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Health Score — {month}</p>
                                <p className={`text-6xl font-black ${scoreColor}`}>
                                    {scoreEmoji} {score}
                                </p>
                                <p className="text-slate-300 text-sm mt-2 max-w-lg">{summary}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-xs">out of</p>
                                <p className="text-slate-400 text-4xl font-bold">100</p>
                            </div>
                        </div>
                        <div className="mt-4 w-full bg-slate-700 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all ${score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                    </Card>

                    {/* Components */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardTitle>Score Breakdown</CardTitle>
                            <div className="space-y-5">
                                {Object.entries(components).map(([key, val]) => {
                                    const pct = Math.round((val.score / val.max) * 100)
                                    const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    return (
                                        <div key={key}>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-slate-300 capitalize font-medium">
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-slate-400">{val.score}/{val.max} pts</span>
                                            </div>
                                            <div className="w-full bg-slate-700 rounded-full h-2">
                                                <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="text-slate-500 text-xs mt-1">{val.detail}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>

                        <Card>
                            <CardTitle>💡 Improvement Tips</CardTitle>
                            <div className="space-y-4">
                                {Object.entries(components).map(([key, val]) => {
                                    const pct = (val.score / val.max) * 100
                                    if (pct >= 70) return null
                                    return (
                                        <div key={key} className="p-3 bg-slate-700/50 rounded-lg">
                                            <p className="text-slate-300 text-sm font-medium capitalize mb-1">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-slate-400 text-xs">{tips[key]}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Historical trend */}
                    {history.length > 1 && (
                        <Card>
                            <CardTitle>Health Score Over Time</CardTitle>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={history}>
                                    <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                        formatter={(v) => [v, 'Score']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ fill: '#3b82f6', r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}