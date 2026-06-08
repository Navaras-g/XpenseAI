import { useState, useEffect } from 'react'
import { getAnomalies } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { Metric } from '../components/ui/Metric'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { AlertTriangle } from 'lucide-react'

const formatNPR = (n) => `NPR ${Number(n).toLocaleString()}`

export default function AnomaliesPage() {
    const [anomalies, setAnomalies] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getAnomalies({ is_anomaly: true })
            .then(res => setAnomalies(res.data.data || []))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <LoadingSpinner text="Loading anomalies..." />

    if (anomalies.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">Anomaly Center</h1>
                <EmptyState icon="✅" title="No anomalies detected" message="Your spending looks normal. No unusual transactions found." />
            </div>
        )
    }

    const totalSpend = anomalies.reduce((s, a) => s + a.amount, 0)
    const highest = Math.max(...anomalies.map(a => a.amount))

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Anomaly Center</h1>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <Metric label="Total Anomalies" value={anomalies.length} color="text-red-400" />
                <Metric label="Total Anomalous Spend" value={formatNPR(totalSpend)} color="text-red-400" />
                <Metric label="Highest Amount" value={formatNPR(highest)} color="text-yellow-400" />
            </div>

            {/* Table */}
            <Card>
                <CardTitle>Flagged Transactions</CardTitle>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Date', 'Merchant', 'Amount', 'Score', 'Reason'].map(h => (
                                    <th key={h} style={{
                                        textAlign: 'left',
                                        color: 'var(--text-muted)',
                                        fontWeight: 500,
                                        fontSize: '0.72rem',
                                        letterSpacing: '0.07em',
                                        textTransform: 'uppercase',
                                        padding: '0 1rem 1rem 0',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {anomalies.map((a) => (
                                <tr
                                    key={a.anomaly_id}
                                    style={{
                                        borderBottom: '1px solid var(--border)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {a.date}
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertTriangle size={14} style={{ color: '#ff4f6a', flexShrink: 0 }} />
                                            {a.merchant}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: '#ff4f6a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {formatNPR(a.amount)}
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                        {a.anomaly_score}
                                    </td>
                                    <td style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '16rem' }}>
                                        {a.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}