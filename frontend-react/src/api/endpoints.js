import client from './client'

// ── Auth ─────────────────────────────────────────────────────────────
export const login = (username, password) => {
    const form = new FormData()
    form.append('username', username)
    form.append('password', password)
    return client.post('/auth/login', form)
}

export const register = (username, email, password) =>
    client.post('/auth/register', { username, email, password })

export const getMe = () => client.get('/auth/me')

// ── Dashboard ────────────────────────────────────────────────────────
export const getDashboardSummary = (month) =>
    client.get('/dashboard-summary', { params: { month } })

// ── Transactions ─────────────────────────────────────────────────────
export const getTransactions = (params) =>
    client.get('/transactions', { params })

export const updateCategory = (transactionId, categoryId) =>
    client.patch(`/transactions/${transactionId}/category`, null, {
        params: { category_id: categoryId },
    })

export const uploadCSV = (file) => {
    const form = new FormData()
    form.append('file', file)
    return client.post('/upload-transactions', form)
}

// ── Anomalies ────────────────────────────────────────────────────────
export const getAnomalies = (params) =>
    client.get('/anomalies', { params })

// ── Subscriptions ────────────────────────────────────────────────────
export const getSubscriptions = (params) =>
    client.get('/subscriptions', { params })

export const detectSubscriptions = () =>
    client.post('/subscriptions/detect')

// ── Insights ─────────────────────────────────────────────────────────
export const getInsights = (month) =>
    client.get('/insights', { params: { month } })

// ── Forecast ─────────────────────────────────────────────────────────
export const getForecast = (monthsAhead = 1) =>
    client.get('/forecast', { params: { months_ahead: monthsAhead } })

// ── ML ───────────────────────────────────────────────────────────────
export const retrainCategorizer = () =>
    client.post('/ml/retrain-categorizer')

export const retrainAnomalyDetector = () =>
    client.post('/ml/retrain-anomaly-detector')

export const scoreAllTransactions = () =>
    client.post('/ml/score-all-transactions')