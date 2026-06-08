import { motion } from 'framer-motion'

export function EmptyState({ icon, title, message }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '1rem', textAlign: 'center' }}
        >
            {icon && <div style={{ fontSize: '3rem', opacity: 0.3 }}>{icon}</div>}
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
            {message && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '24rem' }}>{message}</p>}
        </motion.div>
    )
}