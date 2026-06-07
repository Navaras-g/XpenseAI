import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/layout/Layout'

import LoginPage from './pages/LoginPage'
import OverviewPage from './pages/OverviewPage'
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage'
import AnomaliesPage from './pages/AnomaliesPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import ForecastPage from './pages/ForecastPage'
import HealthPage from './pages/HealthPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout><OverviewPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute>
          <Layout><TransactionsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/categories" element={
        <ProtectedRoute>
          <Layout><CategoriesPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/anomalies" element={
        <ProtectedRoute>
          <Layout><AnomaliesPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/subscriptions" element={
        <ProtectedRoute>
          <Layout><SubscriptionsPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/forecast" element={
        <ProtectedRoute>
          <Layout><ForecastPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/health" element={
        <ProtectedRoute>
          <Layout><HealthPage /></Layout>
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}