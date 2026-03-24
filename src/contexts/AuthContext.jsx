// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'

const AuthContext = createContext(null)

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
}

async function isAllowedUser(email) {
  try {
    const snap = await getDoc(doc(db, 'allowedUsers', email))
    return snap.exists()
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let unsubscribe = () => {}

    const init = async () => {
      // 모바일 리다이렉트 결과가 있으면 먼저 처리
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) {
          const allowed = await isAllowedUser(result.user.email)
          if (!allowed) {
            await signOut(auth)
            setUser(null)
            setAuthError('접근 권한이 없습니다. 관리자에게 문의하세요.')
            setLoading(false)
            return
          }
          // 허용된 사용자면 그대로 진행 (onAuthStateChanged가 setUser 처리)
        }
      } catch (err) {
        if (err.code !== 'auth/popup-closed-by-user') {
          console.error('Redirect result error:', err)
        }
      }

      // 인증 상태 감지
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
    }

    init()
    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    setAuthError(null)
    try {
      if (isMobile()) {
        await signInWithRedirect(auth, googleProvider)
        // 페이지가 리로드되므로 이후 코드는 실행 안 됨
      } else {
        const result = await signInWithPopup(auth, googleProvider)
        const allowed = await isAllowedUser(result.user.email)
        if (!allowed) {
          await signOut(auth)
          setAuthError('접근 권한이 없습니다. 관리자에게 문의하세요.')
          return false
        }
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
