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

const trendIcon = (t) => t === 'increasing' ? '📈' : t === 'decreasing' ? '📉' : '➡️'
const confidenceColor = (c) => c === 'high' ? 'text-green-400' : c === 'medium' ? 'text-yellow-400' : 'text-red-400'

export default function ForecastPage() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [monthsAhead, setMonthsAhead] = useState(1)

    useEffect(() => {
        setLoading(true)
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Forecasting</h1>
                <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm">Months ahead</span>
                    {[1, 2, 3].map(n => (
                        <button
                            key={n}
                            onClick={() => setMonthsAhead(n)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${monthsAhead === n
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>

            {/* Total forecast */}
            {totalForecast && (
                <div className="grid grid-cols-3 gap-4">
                    <Metric
                        label="Predicted Total Spend"
                        value={totalForecast.predicted_total ? formatNPR(totalForecast.predicted_total) : 'N/A'}
                        sub={`Method: ${totalForecast.method?.replace('_', ' ') || 'N/A'}`}
                        color="text-blue-400"
                    />
                    <Metric
                        label="Forecast Month"
                        value={totalForecast.month}
                        color="text-white"
                    />
                    <Metric
                        label="Confidence"
                        value={totalForecast.confidence?.toUpperCase() || 'N/A'}
                        color={confidenceColor(totalForecast.confidence)}
                    />
                </div>
            )}

            {/* Bar chart */}
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
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
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

            {/* Category breakdown */}
            <Card>
                <CardTitle>Category Breakdown</CardTitle>
                {catForecasts.length === 0 ? (
                    <p className="text-slate-500 text-sm">Not enough data for category forecasts.</p>
                ) : (
                    <div className="space-y-3">
                        {catForecasts
                            .filter(f => f.month === firstMonth)
                            .sort((a, b) => b.predicted_amount - a.predicted_amount)
                            .map((f, i) => (
                                <div key={f.category} className="flex items-center justify-between p-3 bg-slate-700/40 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{trendIcon(f.trend)}</span>
                                        <div>
                                            <p className="text-slate-200 font-medium text-sm">{f.category}</p>
                                            <p className="text-slate-500 text-xs">{f.method?.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold">{formatNPR(f.predicted_amount)}</p>
                                        <p className={`text-xs ${confidenceColor(f.confidence)}`}>
                                            {f.confidence} confidence
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </Card>
        </div>
    )
}