// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

// ─── 모듈 레벨 변수 ─────────────────────────────────────────
let _lastReadTime = (() => {
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    return all['global'] || 0
  } catch { return 0 }
})()

let _unsubscribe = null
let _globalSetUnread = null

// 항상 최신 값을 읽는 getter (클로저 stale 값 방지)
function getLastReadTime() {
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    const stored = all['global'] || 0
    // 메모리와 localStorage 중 더 큰 값 반환
    return Math.max(_lastReadTime, stored)
  } catch { return _lastReadTime }
}

function markAsRead() {
  _lastReadTime = Date.now()
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    all['global'] = _lastReadTime
    localStorage.setItem('chat_last_read', JSON.stringify(all))
  } catch {}
}

function subscribeChat(userEmail) {
  if (_unsubscribe) return

  let initialized = false

  _unsubscribe = onSnapshot(
    query(collection(db, 'chat_global'), orderBy('createdAt', 'asc')),
    snap => {
      if (!initialized) {
        const lastRead = getLastReadTime() // 매번 새로 읽음
        const count = snap.docs.filter(d => {
          const msg = d.data()
          if (msg.senderEmail === userEmail) return false
          const ts = msg.createdAt?.toMillis?.() || 0
          return ts > lastRead
        }).length
        _globalSetUnread?.(count)
        initialized = true
        return
      }

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return
        const msg = change.doc.data()
        if (msg.senderEmail === userEmail) return
        const ts = msg.createdAt?.toMillis?.() || 0
        const lastRead = getLastReadTime() // 매번 새로 읽음
        if (ts <= lastRead) return

        if (window.__isOnChatPage) {
          markAsRead()
          return
        }

        _globalSetUnread?.(prev => prev + 1)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💬 ${msg.senderName || '알 수 없음'}`, {
            body: msg.text,
            icon: '/n2soft-archive/favicon.svg',
            tag: 'n2soft-chat'
          })
        }
      })
    }
  )
}

export default function Navbar() {
  const { user, userInfo, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [queryStr, setQueryStr] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const isOnChatPage = location.pathname.includes('chat')

  // 전역 setter 등록
  useEffect(() => {
    _globalSetUnread = setUnreadCount
    return () => { _globalSetUnread = null }
  }, [])

  // 채팅 페이지 여부를 window에 저장 (모듈 레벨 콜백에서 접근)
  useEffect(() => {
    window.__isOnChatPage = isOnChatPage
    if (isOnChatPage) {
      markAsRead()
      setUnreadCount(0)
    }
  }, [isOnChatPage])

  // 구독 시작 (한 번만)
  useEffect(() => {
    if (!user?.email) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    subscribeChat(user.email, userInfo?.name || user.email)
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

        <NavLink
          to="/chat"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ position: 'relative' }}
          onClick={() => { markAsRead(); setUnreadCount(0) }}
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
          <button className="nav-avatar" onClick={() => setShowMenu(v => !v)} title={userInfo?.name || user?.email}>
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
                {isAdmin && <span className="badge badge-amber" style={{ marginTop: 6 }}>관리자</span>}
              </div>
              <button
                onClick={() => { setShowMenu(false); logout() }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '10px 12px', borderRadius: 6,
                  color: 'var(--red)', fontSize: '0.875rem', marginTop: 4,
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
