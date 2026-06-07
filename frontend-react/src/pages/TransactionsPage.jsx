import { useState, useEffect, useRef } from 'react'
import { getTransactions, uploadCSV, updateCategory } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Badge } from '../components/ui/Badge'
import { Upload, Check } from 'lucide-react'

const formatNPR = (n) => `NPR ${Math.abs(Number(n)).toLocaleString()}`

const CATEGORIES = {
    'Food & Dining': 1, 'Transport': 2, 'Utilities': 3, 'Shopping': 4,
    'Entertainment': 5, 'Health': 6, 'Subscriptions': 7, 'Education': 8,
    'Travel': 9, 'Rent & Housing': 10, 'Insurance': 11, 'Transfers': 12,
    'Other Expense': 13, 'Salary': 14, 'Freelance': 15, 'Other Income': 16,
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadResult, setUploadResult] = useState(null)
    const [search, setSearch] = useState('')
    const [editingId, setEditingId] = useState(null)
    const fileRef = useRef()

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const res = await getTransactions({ limit: 200 })
            setTransactions(res.data.data || [])
            setTotal(res.data.total || 0)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTransactions() }, [])

    const handleUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        setUploadResult(null)
        try {
            const res = await uploadCSV(file)
            setUploadResult(res.data)
            fetchTransactions()
        } catch (err) {
            setUploadResult({ success: false, message: 'Upload failed.' })
        } finally {
            setUploading(false)
        }
    }

    const handleCategoryChange = async (txnId, catName) => {
        const catId = CATEGORIES[catName]
        if (!catId) return
        try {
            await updateCategory(txnId, catId)
            setTransactions(prev =>
                prev.map(t => t.transaction_id === txnId ? { ...t, category: catName, is_user_corrected: true } : t)
            )
            setEditingId(null)
        } catch (e) {
            console.error(e)
        }
    }

    const filtered = transactions.filter(t =>
        t.merchant.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return <LoadingSpinner text="Loading transactions..." />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Transactions</h1>
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Search merchant..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => fileRef.current.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Upload size={16} />
                        {uploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleUpload} />
                </div>
            </div>

            {/* Upload result */}
            {uploadResult && (
                <div className={`p-4 rounded-lg border text-sm ${uploadResult.success
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}>
                    {uploadResult.success
                        ? `✓ Imported ${uploadResult.data?.inserted} transactions. Skipped ${uploadResult.data?.skipped_duplicates} duplicates.`
                        : uploadResult.message
                    }
                    {uploadResult.data?.warnings?.map((w, i) => (
                        <div key={i} className="mt-1 text-yellow-400">⚠ {w}</div>
                    ))}
                </div>
            )}

            {/* Table */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <CardTitle>All Transactions</CardTitle>
                    <span className="text-slate-500 text-sm">Showing {filtered.length} of {total}</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                {['Date', 'Merchant', 'Amount', 'Type', 'Category', 'Corrected'].map(h => (
                                    <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-4">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filtered.map((t) => (
                                <tr key={t.transaction_id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="py-3 pr-4 text-slate-400">{t.date}</td>
                                    <td className="py-3 pr-4 text-slate-200 font-medium">{t.merchant}</td>
                                    <td className={`py-3 pr-4 font-medium ${t.transaction_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                        {t.transaction_type === 'credit' ? '+' : '-'}{formatNPR(t.amount)}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <Badge variant={t.transaction_type === 'credit' ? 'success' : 'default'}>
                                            {t.transaction_type}
                                        </Badge>
                                    </td>
                                    <td className="py-3 pr-4">
                                        {editingId === t.transaction_id ? (
                                            <select
                                                defaultValue={t.category}
                                                onChange={e => handleCategoryChange(t.transaction_id, e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                className="bg-slate-600 border border-slate-500 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
                                            >
                                                {Object.keys(CATEGORIES).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <button
                                                onClick={() => setEditingId(t.transaction_id)}
                                                className="text-blue-400 hover:text-blue-300 text-xs underline underline-offset-2"
                                            >
                                                {t.category || 'Uncategorized'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="py-3">
                                        {t.is_user_corrected && (
                                            <Check size={14} className="text-green-400" />
                                        )}
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