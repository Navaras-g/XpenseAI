import { format, subMonths } from 'date-fns'

export function MonthPicker({ value, onChange, label = 'Period' }) {
    const months = Array.from({ length: 36 }, (_, i) => {
        const d = subMonths(new Date(), i)
        return format(d, 'yyyy-MM')
    })

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500 }}>{label}</label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)', borderRadius: 10, padding: '0.4rem 0.85rem',
                    fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
                }}
            >
                {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>
    )
}