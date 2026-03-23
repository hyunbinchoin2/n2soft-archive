import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const allowed = await isAllowedUser(currentUser.email)
        if (allowed) {
          setUser(currentUser)
          setAuthError(null)
        } else {
          await signOut(auth)
          setUser(null)
          setAuthError('접근 권한이 없습니다. 관리자에게 문의하세요.')
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const isAllowedUser = async (email) => {
    try {
      const snap = await getDoc(doc(db, 'allowedUsers', email))
      return snap.exists()
    } catch {
      return false
    }
  }

  const loginWithGoogle = async () => {
    setAuthError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const allowed = await isAllowedUser(result.user.email)
      if (!allowed) {
        await signOut(auth)
        setAuthError('접근 권한이 없습니다. 관리자에게 문의하세요.')
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
    user, loading, authError,
    loginWithGoogle, logout,
    isAuthenticated: !!user
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}