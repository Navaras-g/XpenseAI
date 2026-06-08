import { useState, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell
} from 'recharts'
import { getForecast } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { Metric } from '../components/ui/Metric'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

const formatNPR = (n) => `NPR ${Number(n).toLocaleString()}`
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#f97316']

const trendIcon = (t) => t === 'increasing' ? '↑' : t === 'decreasing' ? '↓' : '→'
const confidenceColor = (c) => c === 'high' ? '#10e088' : c === 'medium' ? '#f5c842' : '#ff4f6a'

export default function ForecastPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [monthsAhead, setMonthsAhead] = useState(1)

    useEffect(() => {
        setLoading(true)
        setData(null)
        getForecast(monthsAhead)
            .then(res => setData(res.data.data || null))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [monthsAhead])

    if (loading) return <LoadingSpinner text="Generating forecast..." />

    const catForecasts = data?.category_forecasts?.filter(f => f.predicted_amount != null) || []
    const totalForecast = data?.total_forecasts?.[0] || null
    const firstMonth = catForecasts[0]?.month || ''
    const chartData = catForecasts
        .filter(f => f.month === firstMonth)
        .sort((a, b) => b.predicted_amount - a.predicted_amount)

    // Group all forecasts by month — this is what drives the breakdown section
    const allMonths = [...new Set(catForecasts.map(f => f.month))].sort()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Forecasting
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Months ahead</span>
                    {[1, 2, 3].map(n => (
                        <button
                            key={n}
                            onClick={() => setMonthsAhead(n)}
                            style={{
                                width: 34, height: 34, borderRadius: 8, border: 'none',
                                background: monthsAhead === n
                                    ? 'linear-gradient(135deg, #4f7fff, #8b5cf6)'
                                    : 'var(--bg-elevated)',
                                color: monthsAhead === n ? 'white' : 'var(--text-muted)',
                                fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Total forecast metrics */}
            {totalForecast && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                    <Metric
                        label="Predicted Total Spend"
                        value={totalForecast.predicted_total ? `NPR ${Number(totalForecast.predicted_total).toLocaleString()}` : 'N/A'}
                        sub={`Method: ${totalForecast.method?.replace('_', ' ') || 'N/A'}`}
                        accent="#4f7fff"
                    />
                    <Metric
                        label="Forecast From"
                        value={firstMonth}
                        accent="#8b5cf6"
                    />
                    <Metric
                        label="Confidence"
                        value={totalForecast.confidence
                            ? totalForecast.confidence.charAt(0).toUpperCase() + totalForecast.confidence.slice(1)
                            : 'N/A'}
                        accent="#06d6c7"
                    />
                </div>
            )}

            {/* Chart — always shows first month */}
            {chartData.length > 0 && (
                <Card>
                    <CardTitle>Predicted Spend by Category — {firstMonth}</CardTitle>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: 10, bottom: 60 }}>
                            <XAxis
                                dataKey="category"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                angle={-35}
                                textAnchor="end"
                            />
                            <YAxis tick={{ fill: '#9090b0', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}
                                formatter={(v) => [formatNPR(v), 'Predicted']}
                            />
                            <Bar dataKey="predicted_amount" radius={[4, 4, 0, 0]}>
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* Category breakdown — grouped by month */}
            <Card>
                <CardTitle>Category Breakdown — {monthsAhead} month{monthsAhead > 1 ? 's' : ''} ahead</CardTitle>
                {catForecasts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        Not enough data for category forecasts.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {allMonths.map(month => (
                            <div key={month}>
                                {/* Month header — only shown when months_ahead > 1 */}
                                {monthsAhead > 1 && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        marginBottom: '1rem',
                                    }}>
                                        <div style={{
                                            height: 1, flex: 1,
                                            background: 'var(--border)',
                                        }} />
                                        <span style={{
                                            color: 'var(--text-muted)', fontSize: '0.75rem',
                                            fontWeight: 600, letterSpacing: '0.06em',
                                            textTransform: 'uppercase', whiteSpace: 'nowrap',
                                        }}>
                                            {month}
                                        </span>
                                        <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {catForecasts
                                        .filter(f => f.month === month)
                                        .sort((a, b) => b.predicted_amount - a.predicted_amount)
                                        .map((f, i) => (
                                            <div
                                                key={`${month}-${f.category}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '0.85rem 1rem',
                                                    background: 'var(--bg-elevated)',
                                                    borderRadius: 10,
                                                    border: '1px solid var(--border)',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: COLORS[i % COLORS.length],
                                                        flexShrink: 0,
                                                    }} />
                                                    <div>
                                                        <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.88rem' }}>
                                                            {f.category}
                                                        </p>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.15rem' }}>
                                                            {f.method?.replace('_', ' ')} &nbsp;·&nbsp; {trendIcon(f.trend)} {f.trend}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>
                                                        {formatNPR(f.predicted_amount)}
                                                    </p>
                                                    <p style={{ fontSize: '0.72rem', marginTop: '0.15rem', color: confidenceColor(f.confidence) }}>
                                                        {f.confidence} confidence
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}