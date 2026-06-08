import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

function AnimatedNumber({ value }) {
    const str = String(value)

    // If value contains letters or dashes (date, text like "MEDIUM") — render as-is, no animation
    const isText = /[a-zA-Z\-\/]/.test(str)

    const [display, setDisplay] = useState(isText ? str : 0)
    const num = isText ? 0 : parseFloat(str.replace(/[^0-9.]/g, '')) || 0
    const prefix = isText ? '' : str.match(/^[^0-9]*/)?.[0] || ''
    const suffix = isText ? '' : str.match(/[^0-9.]*$/)?.[0] || ''

    useEffect(() => {
        if (isText) {
            setDisplay(str)
            return
        }
        let start = null
        const duration = 900
        const step = (timestamp) => {
            if (!start) start = timestamp
            const progress = Math.min((timestamp - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.floor(eased * num))
            if (progress < 1) requestAnimationFrame(step)
            else setDisplay(num)
        }
        requestAnimationFrame(step)
    }, [num, isText, str])

    if (isText) return <span>{str}</span>
    return <span>{prefix}{typeof display === 'number' ? display.toLocaleString() : display}{suffix}</span>
}

export function Metric({ label, value, sub, accent = '#4f7fff' }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            style={{
                borderRadius: 16,
                border: '1px solid var(--border)',
                padding: '1.75rem 1.75rem',
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
            }}
        >
            {/* Accent glow */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.08,
                background: `radial-gradient(circle at top right, ${accent}, transparent 70%)`,
            }} />

            <p style={{
                color: 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
            }}>
                {label}
            </p>

            <p style={{
                color: 'var(--text-primary)',
                fontSize: '1.65rem',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
            }}>
                <AnimatedNumber value={value} />
            </p>

            {sub && (
                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    lineHeight: 1.4,
                }}>
                    {sub}
                </p>
            )}
        </motion.div>
    )
}