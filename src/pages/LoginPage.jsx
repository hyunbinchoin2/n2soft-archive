// src/pages/LoginPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Google 로그인이 차단되는 브라우저 감지
function isDisallowedBrowser() {
  const ua = navigator.userAgent
  return (
    /KAKAOTALK/i.test(ua) ||       // 카카오톡 인앱
    /NAVER/i.test(ua) ||            // 네이버 앱 인앱
    /Line/i.test(ua) ||             // 라인 인앱
    /Instagram/i.test(ua) ||        // 인스타그램 인앱
    /Facebook/i.test(ua) ||         // 페이스북 인앱
    /SamsungBrowser/i.test(ua)      // 삼성 인터넷
  )
}

function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export default function LoginPage() {
  const { loginWithGoogle, isAuthenticated, authError, loading } = useAuth()
  const navigate = useNavigate()
  const [isLogging, setIsLogging] = useState(false)
  const [disallowed, setDisallowed] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
    setDisallowed(isDisallowedBrowser())
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
      display: 'flex', flexDirection: 'column',
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

        <p style={{ color: 'var(--text3)', fontSize: '0.9rem', marginBottom: 28, lineHeight: 1.6 }}>
          내부 임직원 전용 지식 아카이브입니다.<br />
          등록된 Google 계정으로 로그인하세요.
        </p>

        {/* 미지원 브라우저 경고 */}
        {disallowed && (
          <div style={{
            background: 'var(--amber-bg)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            marginBottom: 20,
            textAlign: 'left'
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--amber)', marginBottom: 6 }}>
              ⚠️ 현재 브라우저에서는 로그인이 안 됩니다
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6 }}>
              Google 로그인은 <strong>Chrome 브라우저</strong>에서만 가능합니다.<br />
              아래 방법으로 접속해주세요:
            </div>
            <div style={{
              marginTop: 10, padding: '10px 12px',
              background: 'var(--surface)', borderRadius: 8,
              fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.8
            }}>
              1. Chrome 앱 실행<br />
              2. 주소창에 아래 주소 입력:<br />
              <span style={{
                fontFamily: 'var(--mono)', fontSize: '0.75rem',
                color: 'var(--accent2)', wordBreak: 'break-all'
              }}>
                hyunbinchoin2.github.io/n2soft-archive/
              </span>
            </div>
          </div>
        )}

        {/* 모바일 Chrome 안내 (미지원은 아니지만 안내) */}
        {!disallowed && isMobileBrowser() && (
          <div style={{
            background: 'var(--accent-bg)',
            border: '1px solid var(--accent-border)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            marginBottom: 20,
            fontSize: '0.8rem',
            color: 'var(--text2)',
            textAlign: 'left'
          }}>
            💡 로그인 후 Google 계정 선택 화면으로 이동합니다. 잠시 기다려주세요.
          </div>
        )}

        {/* 에러 메시지 */}
        {authError && (
          <div style={{
            background: 'var(--red-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px', marginBottom: 20,
            color: 'var(--red)', fontSize: '0.875rem', textAlign: 'left'
          }}>
            {authError}
          </div>
        )}

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={isLogging || disallowed}
          className="btn btn-primary"
          style={{
            width: '100%', justifyContent: 'center',
            padding: '13px 24px', fontSize: '0.95rem', fontWeight: 600,
            opacity: disallowed ? 0.4 : 1,
            cursor: disallowed ? 'not-allowed' : 'pointer'
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
          marginTop: 24, padding: '14px',
          background: 'var(--surface)', borderRadius: 'var(--radius)',
          fontSize: '0.8rem', color: 'var(--text3)', lineHeight: 1.6
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
