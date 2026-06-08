const variants = {
    alert: { bg: '#ff4f6a18', color: '#ff4f6a', border: '#ff4f6a30' },
    warning: { bg: '#f5c84218', color: '#f5c842', border: '#f5c84230' },
    info: { bg: '#4f7fff18', color: '#4f7fff', border: '#4f7fff30' },
    success: { bg: '#10e08818', color: '#10e088', border: '#10e08830' },
    default: { bg: '#ffffff0a', color: '#9090b0', border: '#ffffff15' },
}

export function Badge({ children, variant = 'default' }) {
    const v = variants[variant] || variants.default
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 99,
            fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
            background: v.bg, color: v.color,
            border: `1px solid ${v.border}`,
        }}>
            {children}
        </span>
    )
}