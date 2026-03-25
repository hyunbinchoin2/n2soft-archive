// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const AuthContext = createContext(null)

async function getUserInfo(email) {
  try {
    const snap = await getDoc(doc(db, 'allowedUsers', email))
    if (snap.exists()) return snap.data()
    return null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [userInfo, setUserInfo]   = useState(null) // role 등 추가 정보
  const [loading, setLoading]     = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const info = await getUserInfo(currentUser.email)
        if (info) {
          setUser(currentUser)
          setUserInfo(info)
          setAuthError(null)
        } else {
          await signOut(auth)
          setUser(null)
          setUserInfo(null)
          setAuthError('접근 권한이 없습니다. 관리자에게 문의하세요.')
        }
      } else {
        setUser(null)
        setUserInfo(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email, password) => {
    setAuthError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setAuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
          break
        case 'auth/too-many-requests':
          setAuthError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.')
          break
        default:
          setAuthError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      return false
    }
  }

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return true
    } catch {
      return false
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setUserInfo(null)
  }

  const isAdmin = userInfo?.role === 'admin'

  const value = {
    user, userInfo, loading, authError,
    login, logout, resetPassword,
    isAuthenticated: !!user,
    isAdmin
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
