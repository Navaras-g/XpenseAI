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
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                {['Date', 'Merchant', 'Amount', 'Score', 'Reason'].map(h => (
                                    <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {anomalies.map((a) => (
                                <tr key={a.anomaly_id} className="hover:bg-slate-700/30">
                                    <td className="py-3 pr-4 text-slate-400">{a.date}</td>
                                    <td className="py-3 pr-4 text-slate-200 font-medium">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={14} className="text-red-400 shrink-0" />
                                            {a.merchant}
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 text-red-400 font-medium">{formatNPR(a.amount)}</td>
                                    <td className="py-3 pr-4 text-slate-400 font-mono text-xs">{a.anomaly_score}</td>
                                    <td className="py-3 text-slate-400 text-xs max-w-xs">{a.reason}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    )
}