// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

// ─── 전역 싱글톤 — 컴포넌트 외부에 선언해서 재마운트에도 유지 ────
let globalLastReadTime = (() => {
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    return all['global'] || 0
  } catch { return 0 }
})()

function saveLastRead() {
  globalLastReadTime = Date.now()
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    all['global'] = globalLastReadTime
    localStorage.setItem('chat_last_read', JSON.stringify(all))
  } catch {}
}

export default function Navbar() {
  const { user, userInfo, logout, isAdmin } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [queryStr, setQueryStr] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const isOnChatPage = location.pathname.includes('chat')
  const isOnChatPageRef = useRef(isOnChatPage)

  useEffect(() => {
    isOnChatPageRef.current = isOnChatPage
  }, [isOnChatPage])

  // 채팅 페이지 진입 시 읽음 처리
  useEffect(() => {
    if (!isOnChatPage) return
    saveLastRead()
    setUnreadCount(0)
  }, [isOnChatPage])

  // 채팅 메시지 구독 — 한 번만 구독, 재마운트 없음
  useEffect(() => {
    if (!user?.email) return

    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    let isInitialSnapshot = true

    const q = query(
      collection(db, 'chat_global'),
      orderBy('createdAt', 'asc')
    )

    const unsub = onSnapshot(q, snap => {
      if (isInitialSnapshot) {
        // 초기 로드: lastReadTime 이후 안읽은 메시지 카운트
        const count = snap.docs.filter(d => {
          const msg = d.data()
          if (msg.senderEmail === user.email) return false
          const ts = msg.createdAt?.toMillis?.() || 0
          return ts > globalLastReadTime
        }).length
        setUnreadCount(count)
        isInitialSnapshot = false
        return
      }

      // 실시간: 새로 추가된 메시지만 처리
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return
        const msg = change.doc.data()
        if (msg.senderEmail === user.email) return

        const ts = msg.createdAt?.toMillis?.() || 0
        if (ts <= globalLastReadTime) return

        // 채팅 페이지면 읽음 처리
        if (isOnChatPageRef.current) {
          saveLastRead()
          return
        }

        // 안읽음 카운트 증가
        setUnreadCount(prev => prev + 1)

        // 브라우저 알림
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💬 ${msg.senderName || '알 수 없음'}`, {
            body: msg.text,
            icon: '/n2soft-archive/favicon.svg',
            tag: 'n2soft-chat'
          })
        }
      })
    })

    return unsub
  // user.email 바뀔 때만 재구독
  }, [user?.email])

  const handleSearch = (e) => {
    e.preventDefault()
    if (queryStr.trim()) navigate(`/search?q=${encodeURIComponent(queryStr.trim())}`)
  }

  const initial = userInfo?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <nav className="nav">
      <NavLink to="/" className="nav-logo">
        N2<span>SOFT</span> Archive
      </NavLink>

      <form className="nav-search" onSubmit={handleSearch}>
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="아카이브 검색..."
          value={queryStr}
          onChange={e => setQueryStr(e.target.value)}
        />
      </form>

      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>홈</NavLink>
        <NavLink to="/upload" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>업로드</NavLink>
        <NavLink to="/qa" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Q&A</NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>통계</NavLink>

        {/* 채팅 — 안읽음 뱃지 */}
        <NavLink
          to="/chat"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ position: 'relative' }}
          onClick={() => {
            saveLastRead()
            setUnreadCount(0)
          }}
        >
          채팅
          {unreadCount > 0 && !isOnChatPage && (
            <span style={{
              position: 'absolute', top: -2, right: -8,
              background: 'var(--red)', color: '#fff',
              borderRadius: 100, padding: '1px 5px',
              fontSize: '0.65rem', fontWeight: 700,
              minWidth: 16, textAlign: 'center', lineHeight: 1.6
            }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </NavLink>

        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>관리자</NavLink>
        )}

        <div style={{ position: 'relative' }}>
          <button
            className="nav-avatar"
            onClick={() => setShowMenu(v => !v)}
            title={userInfo?.name || user?.email}
          >
            <div className="nav-avatar-fallback">{initial}</div>
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '8px',
              minWidth: 200, boxShadow: 'var(--shadow)', zIndex: 200
            }}>
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>
                  {userInfo?.name || '이름 없음'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
                  {user?.email}
                </div>
                {isAdmin && (
                  <span className="badge badge-amber" style={{ marginTop: 6 }}>관리자</span>
                )}
              </div>
              <button
                onClick={() => { setShowMenu(false); logout() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 12px',
                  borderRadius: 6, color: 'var(--red)',
                  fontSize: '0.875rem', marginTop: 4,
                  transition: 'background 0.15s', background: 'none', cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
