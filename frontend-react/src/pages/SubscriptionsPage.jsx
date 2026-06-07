import { useState, useEffect } from 'react'
import { getSubscriptions, detectSubscriptions } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { Metric } from '../components/ui/Metric'
import { Badge } from '../components/ui/Badge'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'
import { RefreshCw } from 'lucide-react'

const formatNPR = (n) => `NPR ${Number(n).toLocaleString()}`

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState([])
    const [loading, setLoading] = useState(true)
    const [detecting, setDetecting] = useState(false)
    const [detectResult, setDetectResult] = useState(null)

    const fetchSubs = () => {
        getSubscriptions()
            .then(res => setSubscriptions(res.data.data || []))
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchSubs() }, [])

    const handleDetect = async () => {
        setDetecting(true)
        try {
            const res = await detectSubscriptions()
            setDetectResult(res.data.data)
            fetchSubs()
        } finally {
            setDetecting(false)
        }
    }

    if (loading) return <LoadingSpinner text="Loading subscriptions..." />

    const active = subscriptions.filter(s => s.is_active)
    const inactive = subscriptions.filter(s => !s.is_active)
    const monthlyTotal = active.reduce((s, sub) => s + sub.amount, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Subscription Tracker</h1>
                <button
                    onClick={handleDetect}
                    disabled={detecting}
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                    <RefreshCw size={16} className={detecting ? 'animate-spin' : ''} />
                    {detecting ? 'Detecting...' : 'Re-detect'}
                </button>
            </div>

            {detectResult && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">
                    Found {detectResult.detected} new, updated {detectResult.updated} existing subscriptions.
                </div>
            )}

            {subscriptions.length === 0 ? (
                <EmptyState icon="🔄" title="No subscriptions detected" message="Upload more transaction history to improve detection accuracy." />
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-4">
                        <Metric label="Active Subscriptions" value={active.length} color="text-blue-400" />
                        <Metric label="Monthly Total" value={formatNPR(monthlyTotal)} color="text-red-400" />
                        <Metric label="Annual Projected" value={formatNPR(monthlyTotal * 12)} color="text-yellow-400" />
                    </div>

                    {/* Active */}
                    <Card>
                        <CardTitle>Active Subscriptions</CardTitle>
                        {active.length === 0 ? (
                            <p className="text-slate-500 text-sm">No active subscriptions.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            {['Merchant', 'Amount', 'Frequency', 'Last Charged', 'Next Expected'].map(h => (
                                                <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {active.map(s => (
                                            <tr key={s.subscription_id} className="hover:bg-slate-700/30">
                                                <td className="py-3 pr-4 text-slate-200 font-medium">{s.merchant}</td>
                                                <td className="py-3 pr-4 text-red-400">{formatNPR(s.amount)}</td>
                                                <td className="py-3 pr-4">
                                                    <Badge variant="info">{s.frequency}</Badge>
                                                </td>
                                                <td className="py-3 pr-4 text-slate-400">{s.last_seen_date}</td>
                                                <td className="py-3 text-slate-400">{s.next_expected_date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* Inactive */}
                    {inactive.length > 0 && (
                        <Card>
                            <CardTitle>Inactive / Cancelled ({inactive.length})</CardTitle>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            {['Merchant', 'Amount', 'Frequency', 'Last Seen'].map(h => (
                                                <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {inactive.map(s => (
                                            <tr key={s.subscription_id} className="hover:bg-slate-700/30 opacity-60">
                                                <td className="py-3 pr-4 text-slate-300">{s.merchant}</td>
                                                <td className="py-3 pr-4 text-slate-400">{formatNPR(s.amount)}</td>
                                                <td className="py-3 pr-4 text-slate-400">{s.frequency}</td>
                                                <td className="py-3 text-slate-400">{s.last_seen_date}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}
        </div>
    )
}