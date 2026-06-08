import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getDashboardSummary, getInsights } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { Metric } from '../components/ui/Metric'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { MonthPicker } from '../components/ui/MonthPicker'
import { format, subMonths } from 'date-fns'

const formatNPR = (n) => `NPR ${Number(n).toLocaleString()}`

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

export default function OverviewPage() {
    const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'))
    const [summary, setSummary] = useState(null)
    const [insights, setInsights] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        Promise.all([
            getDashboardSummary(month),
            getInsights(month),
        ]).then(([s, i]) => {
            setSummary(s.data?.data || null)
            setInsights(i.data?.data || [])
        }).catch(console.error)
            .finally(() => setLoading(false))
    }, [month])

    if (loading) return <LoadingSpinner text="Loading overview..." />

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Overview</h1>
                <MonthPicker value={month} onChange={setMonth} />
            </div>

            {!summary ? (
                <Card>
                    <p className="text-slate-400 text-center py-8">
                        No data for this month. Upload a CSV from the Transactions page.
                    </p>
                </Card>
            ) : (
                <>
                    {/* KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        <Metric
                            label="Income"
                            value={formatNPR(summary.income)}
                            color="text-green-400"
                        />
                        <Metric
                            label="Expenses"
                            value={formatNPR(summary.expenses)}
                            color="text-red-400"
                        />
                        <Metric
                            label="Savings"
                            value={formatNPR(Math.abs(summary.savings))}
                            sub={summary.savings < 0 ? '⚠ Overspent' : '✓ Saved'}
                            color={summary.savings < 0 ? 'text-red-400' : 'text-green-400'}
                        />
                        <Metric
                            label="Health Score"
                            value={`${summary.health_score} / 100`}
                            color={
                                summary.health_score >= 70 ? 'text-green-400'
                                    : summary.health_score >= 40 ? 'text-yellow-400'
                                        : 'text-red-400'
                            }
                        />
                    </div>

                    {/* Charts + Health */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        {/* Category bar chart */}
                        <Card className="flex flex-col justify-between">
                            <div>
                                <CardTitle>Spending by Category</CardTitle>
                                {summary.top_categories?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <BarChart data={summary.top_categories} margin={{ top: 15, right: 10, left: 10, bottom: 65 }}>
                                            <XAxis
                                                dataKey="category"
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                angle={-35}
                                                textAnchor="end"
                                                interval={0}
                                            />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <Tooltip
                                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                                labelStyle={{ color: '#f1f5f9' }}
                                                formatter={(v) => [formatNPR(v), 'Spent']}
                                            />
                                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                                {summary.top_categories.map((_, i) => (
                                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-slate-500 text-sm py-10">No category data.</p>
                                )}
                            </div>
                        </Card>

                        {/* Health breakdown */}
                        <Card>
                            <CardTitle>Health Score Breakdown</CardTitle>
                            <div className="space-y-6 py-2">
                                {Object.entries(summary.health_components || {}).map(([key, val]) => {
                                    const pct = Math.round((val.score / val.max) * 100)
                                    const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    return (
                                        <div key={key} className="space-y-1.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-200 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                                <span className="text-slate-400 font-mono">{val.score}/{val.max}</span>
                                            </div>
                                            <div className="w-full bg-slate-700/60 rounded-full h-2.5">
                                                <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                            </div>
                                            <p className="text-slate-400 text-xs leading-relaxed">{val.detail}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Insights */}
                    <Card>
                        <CardTitle>💡 Insights</CardTitle>
                        {insights.length === 0 ? (
                            <p className="text-slate-500 text-sm py-2">No insights for this month.</p>
                        ) : (
                            <div className="space-y-4 mt-2">
                                {insights.slice(0, 6).map((ins, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 p-4 bg-slate-700/30 border border-slate-700/40 rounded-xl hover:bg-slate-700/40 transition-colors"
                                    >
                                        <div className="shrink-0">
                                            <Badge variant={ins.severity}>{ins.severity}</Badge>
                                        </div>
                                        <p className="text-slate-200 text-sm leading-relaxed font-medium">{ins.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Bottom row */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card>
                            <CardTitle>🚨 Anomalies</CardTitle>
                            {summary.anomaly_count > 0 ? (
                                <p className="text-red-400 font-medium">{summary.anomaly_count} anomalous transaction(s) detected.</p>
                            ) : (
                                <p className="text-green-400 font-medium">✓ No anomalies this month.</p>
                            )}
                        </Card>
                        <Card>
                            <CardTitle>📋 Transactions</CardTitle>
                            <p className="text-slate-300 font-medium">{summary.transaction_count} transactions recorded.</p>
                        </Card>
                    </div>
                </>
            )}
        </div>
    )
}