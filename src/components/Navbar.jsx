// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../services/firebase'

export default function Navbar() {
  const { user, userInfo, logout, isAdmin } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [query_, setQuery] = useState('')
  const [showMenu, setShowMenu]   = useState(false)
  const [chatUnread, setChatUnread] = useState(0)

  const handleSearch = (e) => {
    e.preventDefault()
    if (query_.trim()) navigate(`/search?q=${encodeURIComponent(query_.trim())}`)
  }

  const initial = userInfo?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  // 채팅 페이지가 아닐 때만 전체 채팅 안읽음 감지
  useEffect(() => {
    if (!user?.email || location.pathname === '/n2soft-archive/chat' || location.pathname === '/chat') return

    const q = query(collection(db, 'chat_global'), orderBy('createdAt', 'desc'), limit(5))
    const unsub = onSnapshot(q, snap => {
      let count = 0
      snap.docChanges().forEach(change => {
        if (change.type === 'added' && change.doc.data().senderEmail !== user.email) {
          count++
        }
      })
      if (count > 0) setChatUnread(prev => prev + count)
    })
    return unsub
  }, [user?.email, location.pathname])

  // 채팅 페이지 진입 시 뱃지 초기화
  useEffect(() => {
    if (location.pathname.includes('chat')) setChatUnread(0)
  }, [location.pathname])

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
          value={query_}
          onChange={e => setQuery(e.target.value)}
        />
      </form>

      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>홈</NavLink>
        <NavLink to="/upload" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>업로드</NavLink>
        <NavLink to="/qa" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Q&A</NavLink>
        <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>통계</NavLink>

        {/* 채팅 — 안읽은 메시지 뱃지 */}
        <NavLink to="/chat" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          style={{ position: 'relative' }}
          onClick={() => setChatUnread(0)}
        >
          채팅
          {chatUnread > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -6,
              background: 'var(--red)', color: '#fff',
              borderRadius: 100, padding: '1px 5px',
              fontSize: '0.65rem', fontWeight: 700,
              minWidth: 16, textAlign: 'center', lineHeight: 1.4
            }}>{chatUnread > 99 ? '99+' : chatUnread}</span>
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
