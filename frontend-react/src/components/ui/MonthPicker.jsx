import { format, subMonths } from 'date-fns'

export function MonthPicker({ value, onChange, label = 'Month' }) {
    const months = Array.from({ length: 36 }, (_, i) => {
        const d = subMonths(new Date(), i)
        return format(d, 'yyyy-MM')
    })

    return (
        <div className="flex items-center gap-3">
            <label className="text-slate-400 text-sm">{label}</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-slate-700 border border-slate-600 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                {months.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    )
}