// src/components/Navbar.jsx
import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore'
import { db } from '../services/firebase'

// ─── 모듈 레벨 ───────────────────────────────────────────────────
let _count = 0
let _listeners = new Set()
let _subscribed = false

function getLastRead() {
  try {
    const v = JSON.parse(localStorage.getItem('chat_last_read') || '{}').global || 0
    console.log('[READ] getLastRead =', v)
    return v
  } catch { return 0 }
}

function getDMLastRead(roomId) {
  try {
    return JSON.parse(localStorage.getItem('chat_last_read') || '{}')[roomId] || 0
  } catch { return 0 }
}

function saveLastRead() {
  const now = Date.now()
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    all.global = now
    localStorage.setItem('chat_last_read', JSON.stringify(all))
    console.log('[READ] saveLastRead =', now)
  } catch {}
}

function markDMRead(roomId) {
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    all[roomId] = Date.now()
    localStorage.setItem('chat_last_read', JSON.stringify(all))
  } catch {}
  setCount(0) // 카운트도 초기화
}

function setCount(val) {
  const next = typeof val === 'function' ? val(_count) : val
  console.log('[COUNT] setCount', _count, '->', next)
  _count = next
  _listeners.forEach(fn => fn(_count))
}

export function markChatRead() {
  console.log('[READ] markChatRead called, _count before =', _count)
  // 전체 채팅 + 모든 DM 읽음 처리
  try {
    const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
    const now = Date.now()
    // 모든 키(전체채팅 + DM)를 현재 시간으로 업데이트
    Object.keys(all).forEach(key => { all[key] = now })
    all.global = now
    localStorage.setItem('chat_last_read', JSON.stringify(all))
    console.log('[READ] saveLastRead all =', now)
  } catch {}
  setCount(0)
}

function getDMRoomId(email1, email2) {
  return [email1, email2].sort().join('__')
}

function startSubscription(email, allUsers) {
  if (_subscribed) {
    console.log('[SUB] already subscribed, skip')
    return
  }
  _subscribed = true
  console.log('[SUB] starting subscription for', email)

  // ── 전체 채팅 구독 ──────────────────────────────────────────
  let isFirst = true
  onSnapshot(
    query(collection(db, 'chat_global'), orderBy('createdAt', 'asc')),
    snap => {
      if (isFirst) {
        isFirst = false
        const lastRead = getLastRead()
        const count = snap.docs.filter(d => {
          const msg = d.data()
          if (msg.senderEmail === email) return false
          const ts = msg.createdAt?.toMillis?.() || 0
          console.log('[INIT] msg ts:', ts, 'lastRead:', lastRead, 'unread:', ts > lastRead)
          return ts > lastRead
        }).length
        console.log('[INIT] initial unread count =', count)
        setCount(c => c + count)
        return
      }

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return
        const msg = change.doc.data()
        if (msg.senderEmail === email) return
        const ts = msg.createdAt?.toMillis?.() || 0
        const lastRead = getLastRead()
        console.log('[NEW] new msg ts:', ts, 'lastRead:', lastRead, 'onChat:', window.__isOnChatPage)
        if (ts <= lastRead) return

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

  // ── DM 구독 ────────────────────────────────────────────────
  allUsers.filter(u => u !== email).forEach(peerEmail => {
    const roomId = getDMRoomId(email, peerEmail)
    let isDMFirst = true

    onSnapshot(
      query(collection(db, `chat_dm/${roomId}/messages`), orderBy('createdAt', 'asc')),
      snap => {
        if (isDMFirst) {
          isDMFirst = false
          const lastRead = getDMLastRead(roomId)
          const count = snap.docs.filter(d => {
            const msg = d.data()
            if (msg.senderEmail === email) return false
            return (msg.createdAt?.toMillis?.() || 0) > lastRead
          }).length
          if (count > 0) setCount(c => c + count)
          return
        }

        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return
          const msg = change.doc.data()
          if (msg.senderEmail === email) return
          const ts = msg.createdAt?.toMillis?.() || 0
          const lastRead = getDMLastRead(roomId)
          if (ts <= lastRead) return

          if (window.__isOnChatPage) {
            markDMRead(roomId)
          } else {
            setCount(prev => prev + 1)
            if (Notification.permission === 'granted') {
              new Notification(`💌 ${msg.senderName || ''}`, {
                body: msg.text,
                icon: '/n2soft-archive/favicon.svg',
                tag: `n2soft-dm-${roomId}`
              })
            }
          }
        })
      }
    )
  })
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

  useEffect(() => {
    console.log('[NAV] listener registered, _count =', _count)
    _listeners.add(setUnreadCount)
    setUnreadCount(_count)
    return () => {
      console.log('[NAV] listener removed')
      _listeners.delete(setUnreadCount)
    }
  }, [])

  // 채팅 페이지 진입 시에만 읽음 처리
  useEffect(() => {
    window.__isOnChatPage = isOnChatPage
    if (isOnChatPage) {
      markChatRead()
    }
  }, [isOnChatPage])

  // 구독 시작 (최초 1회)
  useEffect(() => {
    if (!user?.email) return
    if (Notification.permission === 'default') Notification.requestPermission()
    // 사용자 목록 불러와서 DM 구독
    getDocs(collection(db, 'allowedUsers')).then(snap => {
      const emails = snap.docs.map(d => d.id)
      startSubscription(user.email, emails)
    })
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
