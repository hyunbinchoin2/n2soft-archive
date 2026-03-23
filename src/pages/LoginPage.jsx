// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { loginWithGoogle, isAuthenticated, authError, loading } = useAuth()
  const navigate = useNavigate()
  const [isLogging, setIsLogging] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleLogin = async () => {
    setIsLogging(true)
    await loginWithGoogle()
    setIsLogging(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background grid decoration */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(79,127,255,0.06) 0%, transparent 70%)',
        backgroundSize: '100% 100%'
      }} />

      <div className="card fade-in" style={{
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
        padding: '48px 40px',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64,
          borderRadius: 16,
          background: 'var(--accent-bg)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '1.8rem', fontWeight: 800,
          color: 'var(--accent2)'
        }}>N</div>

        <h1 style={{
          fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--text)', marginBottom: 8,
          letterSpacing: '-0.02em'
        }}>
          N2SOFT Archive
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 36, lineHeight: 1.6 }}>
          내부 임직원 전용 지식 아카이브입니다.<br />
          등록된 Google 계정으로 로그인하세요.
        </p>

        {authError && (
          <div style={{
            background: 'var(--red-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: 24,
            color: 'var(--red)',
            fontSize: '0.875rem',
            textAlign: 'left'
          }}>
            {authError}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLogging}
          className="btn btn-primary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '13px 24px',
            fontSize: '0.95rem',
            fontWeight: 600
          }}
        >
          {isLogging ? (
            <>
              <div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} />
              로그인 중...
            </>
          ) : (
            <>
              <GoogleIcon />
              Google 계정으로 로그인
            </>
          )}
        </button>

        <div style={{
          marginTop: 28,
          padding: '16px',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          fontSize: '0.8rem',
          color: 'var(--text3)',
          lineHeight: 1.6
        }}>
          🔒 <strong style={{ color: 'var(--text2)' }}>접근 제한</strong><br />
          관리자에게 등록된 Google 계정만 로그인할 수 있습니다.
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
