export function EmptyState({ icon = '📭', title, message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <span className="text-5xl">{icon}</span>
            <h3 className="text-slate-300 font-semibold text-lg">{title}</h3>
            {message && <p className="text-slate-500 text-sm max-w-sm">{message}</p>}
        </div>
    )
}