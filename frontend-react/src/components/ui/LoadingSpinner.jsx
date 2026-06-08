import { motion } from 'framer-motion'

export function LoadingSpinner({ text = 'Loading...' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem' }}>
            <div style={{ position: 'relative', width: 48, height: 48 }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{
                        width: 48, height: 48, borderRadius: '50%',
                        border: '2px solid transparent',
                        borderTopColor: '#4f7fff',
                        borderRightColor: '#8b5cf6',
                        position: 'absolute',
                    }}
                />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{text}</p>
        </div>
    )
}