import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, register as apiRegister } from '../api/endpoints'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [username, setUsername] = useState(localStorage.getItem('username'))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const login = async (username, password) => {
        setLoading(true)
        setError(null)
        try {
            const res = await apiLogin(username, password)
            const t = res.data.access_token
            localStorage.setItem('token', t)
            localStorage.setItem('username', username)
            setToken(t)
            setUsername(username)
            return true
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed.')
            return false
        } finally {
            setLoading(false)
        }
    }

    const register = async (username, email, password) => {
        setLoading(true)
        setError(null)
        try {
            await apiRegister(username, email, password)
            return true
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed.')
            return false
        } finally {
            setLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        setToken(null)
        setUsername(null)
    }

    return (
        <AuthContext.Provider value={{
            token, username, loading, error,
            login, register, logout,
            isAuthenticated: !!token,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)