export function Metric({ label, value, sub, color = 'text-white' }) {
    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <p className="text-slate-400 text-sm mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
    )
}