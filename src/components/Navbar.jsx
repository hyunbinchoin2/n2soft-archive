// src/components/Navbar.jsx
import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore'
import { db } from '../services/firebase'

const LAST_READ_KEY = 'chat_last_read' // localStorage key

function getLastRead() {
  try {
    const raw = localStorage.getItem(LAST_READ_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setLastRead(roomId) {
  try {
    const all = getLastRead()
    all[roomId] = Date.now()
    localStorage.setItem(LAST_READ_KEY, JSON.stringify(all))
  } catch {}
}

export default function Navbar() {
  const { user, userInfo, logout, isAdmin } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const [queryStr, setQueryStr] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const isOnChatPage = location.pathname.includes('chat')

  const handleSearch = (e) => {
    e.preventDefault()
    if (queryStr.trim()) navigate(`/search?q=${encodeURIComponent(queryStr.trim())}`)
  }

  const initial = userInfo?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  // 채팅 안읽음 감지
  useEffect(() => {
    if (!user?.email) return

    // 채팅 페이지 진입 시 → 현재 방 읽음 처리 (ChatPage에서 처리하므로 여기선 dot만 끔)
    if (isOnChatPage) {
      setHasUnread(false)
      return
    }

    const lastRead = getLastRead()
    const globalLastRead = lastRead['global'] || 0

    // 전체 채팅 - 마지막 읽은 시간 이후 메시지 감지
    const globalQ = query(
      collection(db, 'chat_global'),
      orderBy('createdAt', 'desc'),
      limit(20)
    )

    const unsub = onSnapshot(globalQ, snap => {
      const hasNew = snap.docs.some(d => {
        const msg = d.data()
        if (msg.senderEmail === user.email) return false
        const ts = msg.createdAt?.toMillis ? msg.createdAt.toMillis() : 0
        return ts > globalLastRead
      })
      if (hasNew) {
        setHasUnread(true)
        return
      }
      setHasUnread(false)
    })

    return unsub
  }, [user?.email, isOnChatPage])

  // 채팅 페이지 벗어날 때 현재 시간 저장
  useEffect(() => {
    if (!isOnChatPage) return
    setLastRead('global')
    setHasUnread(false)

    return () => {
      // 채팅 페이지 떠날 때 읽음 처리
      setLastRead('global')
    }
  }, [isOnChatPage])

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

        {/* 채팅 — 빨간 점 */}
        <NavLink
          to="/chat"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ position: 'relative' }}
          onClick={() => {
            setHasUnread(false)
            setLastRead('global')
          }}
        >
          채팅
          {hasUnread && !isOnChatPage && (
            <span style={{
              position: 'absolute', top: 2, right: -2,
              width: 7, height: 7,
              background: 'var(--red)',
              borderRadius: '50%',
              border: '1.5px solid var(--bg)'
            }} />
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
