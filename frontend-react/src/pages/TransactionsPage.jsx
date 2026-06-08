import { useState, useEffect, useRef } from 'react'
import { getTransactions, uploadCSV, updateCategory } from '../api/endpoints'
import { Card, CardTitle } from '../components/ui/Card'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Transactions
                </h1>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        placeholder="Search merchant..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-primary)',
                            borderRadius: 10, padding: '0.6rem 1rem',
                            fontSize: '0.85rem', outline: 'none', width: 220,
                        }}
                    />
                    <button
                        onClick={() => fileRef.current.click()}
                        disabled={uploading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.25rem',
                            background: 'linear-gradient(135deg, #4f7fff, #8b5cf6)',
                            border: 'none', borderRadius: 10,
                            color: 'white', fontWeight: 600, fontSize: '0.85rem',
                            cursor: uploading ? 'not-allowed' : 'pointer',
                            opacity: uploading ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <Upload size={15} />
                        {uploading ? 'Uploading...' : 'Upload CSV'}
                    </button>
                    <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleUpload} />
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

            {/* Table Card wrapper */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <CardTitle>All Transactions</CardTitle>
                    <span className="text-slate-500 text-sm">Showing {filtered.length} of {total}</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Date', 'Merchant', 'Amount', 'Type', 'Category', 'Corrected'].map(h => (
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
                            {filtered.map((t) => (
                                <tr
                                    key={t.transaction_id}
                                    style={{
                                        borderBottom: '1px solid var(--border)',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {t.date}
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0', color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {t.merchant}
                                    </td>
                                    <td style={{
                                        padding: '1rem 1rem 1rem 0', fontWeight: 600, whiteSpace: 'nowrap',
                                        color: t.transaction_type === 'credit' ? '#10e088' : '#ff4f6a',
                                    }}>
                                        {t.transaction_type === 'credit' ? '+' : '-'}{formatNPR(t.amount)}
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0' }}>
                                        <span style={{
                                            padding: '0.25rem 0.65rem', borderRadius: 99,
                                            fontSize: '0.72rem', fontWeight: 500,
                                            background: t.transaction_type === 'credit' ? '#10e08818' : 'var(--bg-overlay)',
                                            color: t.transaction_type === 'credit' ? '#10e088' : 'var(--text-muted)',
                                            border: `1px solid ${t.transaction_type === 'credit' ? '#10e08830' : 'var(--border)'}`,
                                        }}>
                                            {t.transaction_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 1rem 1rem 0' }}>
                                        {editingId === t.transaction_id ? (
                                            <select
                                                defaultValue={t.category}
                                                onChange={e => handleCategoryChange(t.transaction_id, e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                style={{
                                                    background: 'var(--bg-overlay)',
                                                    border: '1px solid var(--border-strong)',
                                                    color: 'var(--text-primary)',
                                                    borderRadius: 8, padding: '0.3rem 0.6rem',
                                                    fontSize: '0.8rem', outline: 'none',
                                                }}
                                            >
                                                {Object.keys(CATEGORIES).map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <button
                                                onClick={() => setEditingId(t.transaction_id)}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: '#4f7fff', fontSize: '0.85rem',
                                                    textDecoration: 'underline', textUnderlineOffset: 3,
                                                    padding: 0,
                                                }}
                                            >
                                                {t.category || 'Uncategorized'}
                                            </button>
                                        )}
                                    </td>
                                    <td style={{ padding: '1rem 0' }}>
                                        {t.is_user_corrected && (
                                            <Check size={15} style={{ color: '#10e088' }} />
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