import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const pageVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export function Layout({ children }) {
    const location = useLocation()

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
            <Sidebar />
            <main style={{
                flex: 1,
                padding: '2.5rem 3rem',
                overflowY: 'auto',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
            }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}