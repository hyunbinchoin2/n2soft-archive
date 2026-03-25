// src/pages/LoginPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect } from 'react'

export default function LoginPage() {
  const { login, resetPassword, isAuthenticated, authError, loading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent]   = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setIsLogging(true)
    await login(email.trim(), password)
    setIsLogging(false)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setResetLoading(true)
    const ok = await resetPassword(resetEmail.trim())
    setResetLoading(false)
    if (ok) setResetSent(true)
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
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, background: 'var(--bg)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(79,127,255,0.06) 0%, transparent 70%)'
      }} />

      <div className="card fade-in" style={{
        maxWidth: 400, width: '100%',
        textAlign: 'center', padding: '48px 40px', position: 'relative'
      }}>
        {/* 로고 */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '1.8rem', fontWeight: 800,
          color: 'var(--accent2)'
        }}>N</div>

        <h1 style={{
          fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--text)', marginBottom: 8, letterSpacing: '-0.02em'
        }}>N2SOFT Archive</h1>

        {!showReset ? (
          <>
            <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 32, lineHeight: 1.6 }}>
              내부 임직원 전용 지식 아카이브입니다.
            </p>

            {/* 에러 메시지 */}
            {authError && (
              <div style={{
                background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 'var(--radius)', padding: '12px 16px',
                marginBottom: 20, color: 'var(--red)', fontSize: '0.875rem', textAlign: 'left'
              }}>{authError}</div>
            )}

            {/* 로그인 폼 */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  style={{ width: '100%', padding: '11px 14px' }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  비밀번호
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    style={{ width: '100%', padding: '11px 44px 11px 14px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none', color: 'var(--text3)',
                      fontSize: '0.8rem', cursor: 'pointer'
                    }}
                  >{showPassword ? '숨기기' : '보기'}</button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLogging}
                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem', fontWeight: 600, marginTop: 4 }}
              >
                {isLogging ? (
                  <><div className="spinner" style={{ width: 18, height: 18, borderTopColor: '#fff' }} />로그인 중...</>
                ) : '로그인'}
              </button>
            </form>

            <button
              onClick={() => { setShowReset(true); setResetEmail(email) }}
              style={{
                marginTop: 16, fontSize: '0.8rem',
                color: 'var(--accent2)', background: 'none', cursor: 'pointer'
              }}
            >비밀번호를 잊으셨나요?</button>

            <div style={{
              marginTop: 24, padding: '14px',
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              fontSize: '0.8rem', color: 'var(--text3)', lineHeight: 1.6
            }}>
              🔒 <strong style={{ color: 'var(--text2)' }}>접근 제한</strong><br />
              관리자에게 등록된 계정만 로그인할 수 있습니다.
            </div>
          </>
        ) : (
          <>
            {/* 비밀번호 재설정 */}
            <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.6 }}>
              가입한 이메일 주소를 입력하면<br />비밀번호 재설정 링크를 보내드립니다.
            </p>

            {resetSent ? (
              <div style={{
                background: 'var(--green-bg)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 'var(--radius)', padding: '16px',
                color: 'var(--green)', fontSize: '0.875rem', marginBottom: 20
              }}>
                ✅ 재설정 이메일을 발송했습니다.<br />
                받은 편지함을 확인해주세요.
              </div>
            ) : (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  style={{ width: '100%', padding: '11px 14px' }}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resetLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontWeight: 600 }}
                >
                  {resetLoading ? '전송 중...' : '재설정 이메일 보내기'}
                </button>
              </form>
            )}

            <button
              onClick={() => { setShowReset(false); setResetSent(false) }}
              style={{
                marginTop: 16, fontSize: '0.8rem',
                color: 'var(--text2)', background: 'none', cursor: 'pointer'
              }}
            >← 로그인으로 돌아가기</button>
          </>
        )}
      </div>
    </div>
  )
}
