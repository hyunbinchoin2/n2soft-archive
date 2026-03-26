// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

// ─── 모든 상태를 모듈 레벨에서 관리 ─────────────────────────────
let _count = 0
let _listeners = new Set()
let _subscribed = false

function getLastRead() {
  try {
    return JSON.parse(localStorage.getItem('chat_last_read') || '{}').global || 0
  } catch { return 0 }
}

function saveLastRead() {
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    all.global = Date.now()
    localStorage.setItem('chat_last_read', JSON.stringify(all))
  } catch {}
}

function setCount(val) {
  _count = typeof val === 'function' ? val(_count) : val
  _listeners.forEach(fn => fn(_count))
}

export function markChatRead() {
  saveLastRead()
  setCount(0)
}

function startSubscription(email) {
  if (_subscribed) return
  _subscribed = true

  let isFirst = true

  onSnapshot(
    query(collection(db, 'chat_global'), orderBy('createdAt', 'asc')),
    snap => {
      if (isFirst) {
        isFirst = false
        const c = snap.docs.filter(d => {
          const msg = d.data()
          if (msg.senderEmail === email) return false
          return (msg.createdAt?.toMillis?.() || 0) > getLastRead()
        }).length
        setCount(c)
        return
      }

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return
        const msg = change.doc.data()
        if (msg.senderEmail === email) return
        const ts = msg.createdAt?.toMillis?.() || 0
        if (ts <= getLastRead()) return

        if (window.__isOnChatPage) {
          markChatRead()
        } else {
          setCount(prev => prev + 1)
          if (Notification.permission === 'granted') {
            new Notification(`💬 ${msg.senderName || ''}`, {
              body: msg.text,
              icon: '/n2soft-archive/favicon.svg',
              tag: 'n2soft-chat'
            })
          }
        }
      })
    }
  )
}

// ─────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, userInfo, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [queryStr, setQueryStr] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(_count)

  const isOnChatPage = location.pathname.includes('chat')

  // 리스너 등록 — 등록 시 localStorage 기준으로 카운트 재계산
  useEffect(() => {
    _listeners.add(setUnreadCount)
    // _count 그대로 쓰지 않고 현재 카운트 그대로 동기화
    setUnreadCount(_count)
    return () => _listeners.delete(setUnreadCount)
  }, [])

  // 채팅 페이지 진입/이탈 시 읽음 처리
  useEffect(() => {
    window.__isOnChatPage = isOnChatPage
    markChatRead() // 진입할 때도, 떠날 때도 항상 읽음 처리
  }, [isOnChatPage])

  // 구독 시작 (최초 1회)
  useEffect(() => {
    if (!user?.email) return
    if (Notification.permission === 'default') Notification.requestPermission()
    startSubscription(user.email)
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
          onClick={markChatRead}
        >
          {({ isActive }) => (
            <>
              채팅
              {unreadCount > 0 && !isActive && !isOnChatPage && (
                <span style={{
                  position: 'absolute', top: -2, right: -8,
                  background: 'var(--red)', color: '#fff',
                  borderRadius: 100, padding: '1px 5px',
                  fontSize: '0.65rem', fontWeight: 700,
                  minWidth: 16, textAlign: 'center', lineHeight: 1.6
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </>
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
