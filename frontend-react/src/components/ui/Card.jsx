export function Card({ children, className = '' }) {
    return (
        <div className={`bg-slate-800 rounded-xl border border-slate-700 p-6 ${className}`}>
            {children}
        </div>
    )
}

export function CardTitle({ children }) {
    return <h3 className="text-slate-200 font-semibold text-lg mb-4">{children}</h3>
}