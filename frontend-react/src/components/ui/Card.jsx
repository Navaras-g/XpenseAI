import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false, gradient = false, style = {} }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={hover ? { y: -2, borderColor: 'rgba(79,127,255,0.25)' } : {}}
            style={{
                background: gradient ? 'linear-gradient(135deg, #1a1a2e, #16162a)' : 'var(--bg-surface)',
                borderRadius: 18,
                border: '1px solid var(--border)',
                padding: '1.75rem 2rem',
                transition: 'border-color 0.2s',
                ...style,
            }}
        >
            {children}
        </motion.div>
    )
}

export function CardTitle({ children }) {
    return (
        <h3 style={{
            color: 'var(--text-muted)',
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
        }}>
            {children}
        </h3>
    )
}