// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'

const AuthContext = createContext(null)

const ALLOWED_DOMAIN = 'n2soft.co.kr'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const email = currentUser.email || ''
        if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setUser(currentUser)
          setAuthError(null)
        } else {
          // 허용되지 않은 도메인 → 강제 로그아웃
          signOut(auth)
          setUser(null)
          setAuthError(`N2SOFT 임직원(@${ALLOWED_DOMAIN}) 계정만 접근 가능합니다.`)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const loginWithGoogle = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email || ''
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth)
        setAuthError(`N2SOFT 임직원(@${ALLOWED_DOMAIN}) 계정만 접근 가능합니다.`)
        return false
      }
      return true
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      return false
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const value = {
    user,
    loading,
    authError,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
