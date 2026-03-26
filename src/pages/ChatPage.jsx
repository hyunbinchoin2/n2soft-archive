// src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  collection, addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp, getDocs, doc, setDoc, getDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { isOnline } from '../hooks/useOnlineStatus'

function getDMRoomId(email1, email2) {
  return [email1, email2].sort().join('__')
}

// 브라우저 알림 권한 요청
async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function showNotification(title, body) {
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return // 앱이 포커스 중이면 알림 안 보냄
  new Notification(title, { body, icon: '/n2soft-archive/favicon.svg' })
}

export default function ChatPage() {
  const { user, userInfo } = useAuth()
  const myName = userInfo?.name || user?.displayName || user?.email

  const [users, setUsers]           = useState([])
  const [activeRoom, setActiveRoom] = useState('global')
  const [activePeer, setActivePeer] = useState(null)
  const [messages, setMessages]     = useState([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [unread, setUnread]         = useState({}) // roomId → count
  const [lastRead, setLastRead]     = useState({}) // roomId → timestamp
  const [recentRooms, setRecentRooms] = useState([]) // 최근 채팅한 방 순서

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const activeRoomRef  = useRef(activeRoom)
  const prevMsgCount   = useRef({}) // roomId → last msg count (알림용)

  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  // 알림 권한 요청
  useEffect(() => { requestNotificationPermission() }, [])

  // 사용자 목록 로드
  useEffect(() => {
    getDocs(collection(db, 'allowedUsers')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, email: d.id, ...d.data() })))
    })
  }, [])

  // 현재 방 메시지 실시간 구독
  useEffect(() => {
    const colPath = activeRoom === 'global'
      ? 'chat_global'
      : `chat_dm/${activeRoom}/messages`

    const q = query(collection(db, colPath), orderBy('createdAt', 'asc'), limit(100))

    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setMessages(msgs)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

      // 읽음 처리 — localStorage에 현재 시간 저장
      try {
        const all = JSON.parse(localStorage.getItem('chat_last_read') || '{}')
        all[activeRoom] = Date.now()
        localStorage.setItem('chat_last_read', JSON.stringify(all))
      } catch {}

      setUnread(prev => ({ ...prev, [activeRoom]: 0 }))
    })
    return unsub
  }, [activeRoom])

  // 백그라운드 방들 안읽음 감지 (전체 채팅 + DM들)
  useEffect(() => {
    if (!user?.email || users.length === 0) return

    const unsubs = []

    // 전체 채팅 감시
    const globalQ = query(collection(db, 'chat_global'), orderBy('createdAt', 'desc'), limit(1))
    unsubs.push(onSnapshot(globalQ, snap => {
      if (activeRoomRef.current === 'global') return
      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return
        const msg = change.doc.data()
        if (msg.senderEmail === user.email) return
        setUnread(prev => ({ ...prev, global: (prev.global || 0) + 1 }))
        showNotification(`💬 전체 채팅 — ${msg.senderName}`, msg.text)
      })
    }))

    // 각 DM 방 감시
    users.filter(u => u.email !== user.email).forEach(peer => {
      const roomId = getDMRoomId(user.email, peer.email)
      const dmQ = query(
        collection(db, `chat_dm/${roomId}/messages`),
        orderBy('createdAt', 'desc'),
        limit(1)
      )
      unsubs.push(onSnapshot(dmQ, snap => {
        if (activeRoomRef.current === roomId) return
        snap.docChanges().forEach(change => {
          if (change.type !== 'added') return
          const msg = change.doc.data()
          if (msg.senderEmail === user.email) return
          setUnread(prev => ({ ...prev, [roomId]: (prev[roomId] || 0) + 1 }))
          setRecentRooms(prev => [roomId, ...prev.filter(r => r !== roomId)])
          showNotification(`💌 ${peer.name}`, msg.text)
        })
      }))
    })

    return () => unsubs.forEach(u => u())
  }, [user?.email, users])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const colPath = activeRoom === 'global'
        ? 'chat_global'
        : `chat_dm/${activeRoom}/messages`

      await addDoc(collection(db, colPath), {
        text: input.trim(),
        senderEmail: user.email,
        senderName: myName,
        createdAt: serverTimestamp()
      })

      // 최근 방 업데이트
      if (activeRoom !== 'global') {
        setRecentRooms(prev => [activeRoom, ...prev.filter(r => r !== activeRoom)])
      }

      setInput('')
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const openRoom = (roomId, peer = null) => {
    setActiveRoom(roomId)
    setActivePeer(peer)
    setMessages([])
    setUnread(prev => ({ ...prev, [roomId]: 0 }))
    if (roomId !== 'global') {
      setRecentRooms(prev => [roomId, ...prev.filter(r => r !== roomId)])
    }
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const otherUsers = users.filter(u => u.email !== user.email)
  const onlineCount = otherUsers.filter(u => isOnline(u.lastSeen)).length

  // 스마트 소팅: 현재 채팅 중인 방 → 최근 채팅 순 → 온라인 → 마지막 접속 순 → 가나다
  const sortedUsers = [...otherUsers].sort((a, b) => {
    const aRoomId = getDMRoomId(user.email, a.email)
    const bRoomId = getDMRoomId(user.email, b.email)

    // 1. 현재 채팅 중인 상대 최상단
    const aIsActive = activeRoom === aRoomId
    const bIsActive = activeRoom === bRoomId
    if (aIsActive && !bIsActive) return -1
    if (!aIsActive && bIsActive) return 1

    // 2. 최근 채팅한 방 순서
    const aRecentIdx = recentRooms.indexOf(aRoomId)
    const bRecentIdx = recentRooms.indexOf(bRoomId)
    if (aRecentIdx !== -1 && bRecentIdx !== -1) return aRecentIdx - bRecentIdx
    if (aRecentIdx !== -1) return -1
    if (bRecentIdx !== -1) return 1

    // 3. 온라인 우선
    const aOnline = isOnline(a.lastSeen)
    const bOnline = isOnline(b.lastSeen)
    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1

    // 4. 마지막 접속 시간 순
    const aTs = a.lastSeen?.toDate ? a.lastSeen.toDate().getTime() : 0
    const bTs = b.lastSeen?.toDate ? b.lastSeen.toDate().getTime() : 0
    if (aTs !== bTs) return bTs - aTs

    // 5. 가나다 순
    return (a.name || '').localeCompare(b.name || '', 'ko')
  })

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>

      {/* ── 사이드바 ── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* 전체 채팅방 */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            채팅방
          </div>
          <button
            onClick={() => activeRoom !== 'global' && openRoom('global')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px', borderRadius: 8,
              cursor: activeRoom === 'global' ? 'default' : 'pointer',
              background: activeRoom === 'global' ? 'var(--accent-bg)' : 'transparent',
              border: activeRoom === 'global' ? '1px solid var(--accent-border)' : '1px solid transparent',
              color: activeRoom === 'global' ? 'var(--accent2)' : 'var(--text2)',
              transition: 'all 0.15s', textAlign: 'left'
            }}
            onMouseEnter={e => { if (activeRoom !== 'global') e.currentTarget.style.background = 'var(--surface)' }}
            onMouseLeave={e => { if (activeRoom !== 'global') e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ fontSize: '1rem' }}>💬</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>전체 채팅</div>
            </div>
            {unread['global'] > 0 && (
              <div style={{
                background: 'var(--red)', color: '#fff',
                borderRadius: 100, padding: '1px 6px',
                fontSize: '0.7rem', fontWeight: 700, flexShrink: 0
              }}>{unread['global']}</div>
            )}
          </button>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 12px' }} />

        {/* 멤버 목록 */}
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            멤버 — 온라인 {onlineCount}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
          {sortedUsers.map(u => {
            const online = isOnline(u.lastSeen)
            const roomId = getDMRoomId(user.email, u.email)
            const isActive = activeRoom === roomId
            const unreadCount = unread[roomId] || 0

            return (
              <button
                key={u.email}
                onClick={() => !isActive && openRoom(roomId, u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  cursor: isActive ? 'default' : 'pointer',
                  background: isActive ? 'var(--accent-bg)' : 'transparent',
                  border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
                  color: isActive ? 'var(--accent2)' : 'var(--text2)',
                  transition: 'all 0.15s', textAlign: 'left', marginBottom: 2
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: online ? 'var(--green-bg)' : 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                    color: online ? 'var(--green)' : 'var(--text3)'
                  }}>
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 8, height: 8, borderRadius: '50%',
                    background: online ? 'var(--green)' : 'var(--text3)',
                    border: '1.5px solid var(--bg2)'
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.825rem', fontWeight: unreadCount > 0 ? 700 : 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: unreadCount > 0 ? 'var(--text)' : undefined
                  }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', color: online ? 'var(--green)' : 'var(--text3)' }}>
                    {online ? '온라인' : '오프라인'}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div style={{
                    background: 'var(--red)', color: '#fff',
                    borderRadius: 100, padding: '1px 6px',
                    fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                    minWidth: 18, textAlign: 'center'
                  }}>{unreadCount}</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 채팅 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 헤더 */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
        }}>
          {activeRoom === 'global' ? (
            <>
              <span style={{ fontSize: '1.2rem' }}>💬</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>전체 채팅</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                  모든 멤버 · 온라인 {onlineCount}명
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: isOnline(activePeer?.lastSeen) ? 'var(--green-bg)' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: isOnline(activePeer?.lastSeen) ? 'var(--green)' : 'var(--text3)'
                }}>
                  {activePeer?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{
                  position: 'absolute', bottom: 1, right: 1,
                  width: 10, height: 10, borderRadius: '50%',
                  background: isOnline(activePeer?.lastSeen) ? 'var(--green)' : 'var(--text3)',
                  border: '2px solid var(--bg2)'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{activePeer?.name}</div>
                <div style={{ fontSize: '0.75rem', color: isOnline(activePeer?.lastSeen) ? 'var(--green)' : 'var(--text3)' }}>
                  {isOnline(activePeer?.lastSeen) ? '온라인' : '오프라인'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 메시지 목록 */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.875rem', marginTop: 40 }}>
              {activeRoom === 'global'
                ? '전체 채팅에 첫 메시지를 보내보세요!'
                : `${activePeer?.name}님과 대화를 시작하세요!`
              }
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.senderEmail === user.email
            const prevMsg = messages[i - 1]
            const nextMsg = messages[i + 1]
            const showName = !isMine && (!prevMsg || prevMsg.senderEmail !== msg.senderEmail)
            const showTime = !nextMsg || nextMsg.senderEmail !== msg.senderEmail

            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: isMine ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 6,
                marginTop: showName ? 12 : 2
              }}>
                {!isMine && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-bg)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                    color: 'var(--accent2)',
                    visibility: showTime ? 'visible' : 'hidden'
                  }}>
                    {msg.senderName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}

                <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  {showName && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginBottom: 3, paddingLeft: 2 }}>
                      {msg.senderName}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: isMine ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMine ? 'var(--accent)' : 'var(--surface)',
                      color: isMine ? '#fff' : 'var(--text)',
                      fontSize: '0.875rem', lineHeight: 1.5,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      border: isMine ? 'none' : '1px solid var(--border)'
                    }}>
                      {msg.text}
                    </div>
                    {showTime && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', flexShrink: 0, paddingBottom: 2 }}>
                        {formatTime(msg.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <form onSubmit={sendMessage} style={{
          padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', flexShrink: 0
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--surface)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '6px 6px 6px 14px',
            transition: 'border-color 0.2s'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage(e)
                }
              }}
              placeholder={activeRoom === 'global' ? '전체 채팅 메시지 입력...' : `${activePeer?.name}님에게 메시지...`}
              rows={1}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '0.9rem', color: 'var(--text)', resize: 'none',
                lineHeight: 1.5, padding: '4px 0', maxHeight: 120, overflowY: 'auto'
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: input.trim() ? 'var(--accent)' : 'var(--surface2)',
                color: input.trim() ? '#fff' : 'var(--text3)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', fontSize: '1rem'
              }}
            >
              {sending ? '...' : '↑'}
            </button>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4, paddingLeft: 2 }}>
            Enter로 전송 · Shift+Enter로 줄바꿈
          </div>
        </form>
      </div>
    </div>
  )
}
