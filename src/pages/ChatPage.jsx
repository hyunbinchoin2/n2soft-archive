// src/pages/ChatPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  collection, addDoc, query, orderBy, limit,
  onSnapshot, serverTimestamp, getDocs, doc, getDoc
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { isOnline } from '../hooks/useOnlineStatus'

// ─── 채팅방 ID 생성 (1:1) ────────────────────────────────────
function getDMRoomId(email1, email2) {
  return [email1, email2].sort().join('__')
}

export default function ChatPage() {
  const { user, userInfo } = useAuth()
  const myName = userInfo?.name || user?.displayName || user?.email

  const [users, setUsers]         = useState([])
  const [activeRoom, setActiveRoom] = useState('global') // 'global' | DM room id
  const [activePeer, setActivePeer] = useState(null) // 1:1 상대방 정보
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [sending, setSending]     = useState(false)
  const [unread, setUnread]       = useState({}) // roomId → count
  const messagesEndRef            = useRef(null)
  const inputRef                  = useRef(null)

  // 사용자 목록 로드
  useEffect(() => {
    getDocs(collection(db, 'allowedUsers')).then(snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, email: d.id, ...d.data() })))
    })
  }, [])

  // 메시지 실시간 구독
  useEffect(() => {
    const colPath = activeRoom === 'global'
      ? 'chat_global'
      : `chat_dm/${activeRoom}/messages`

    const q = query(
      collection(db, colPath),
      orderBy('createdAt', 'asc'),
      limit(100)
    )

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })

    return unsub
  }, [activeRoom])

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
      setInput('')
      inputRef.current?.focus()
    } finally {
      setSending(false)
    }
  }

  const openDM = (peer) => {
    const roomId = getDMRoomId(user.email, peer.email)
    setActiveRoom(roomId)
    setActivePeer(peer)
    setMessages([])
  }

  const openGlobal = () => {
    setActiveRoom('global')
    setActivePeer(null)
    setMessages([])
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

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden'
    }}>
      {/* ── 사이드바 ── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--border)',
        background: 'var(--bg2)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* 전체 채팅방 */}
        <div style={{ padding: '16px 12px 8px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            채팅방
          </div>
          <button
            onClick={openGlobal}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px',
              borderRadius: 8, cursor: 'pointer',
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
          {otherUsers.map(u => {
            const online = isOnline(u.lastSeen)
            const roomId = getDMRoomId(user.email, u.email)
            const isActive = activeRoom === roomId
            return (
              <button
                key={u.email}
                onClick={() => openDM(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '7px 10px',
                  borderRadius: 8, cursor: 'pointer',
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
                    fontSize: '0.825rem', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{u.name}</div>
                  <div style={{ fontSize: '0.7rem', color: online ? 'var(--green)' : 'var(--text3)' }}>
                    {online ? '온라인' : '오프라인'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 채팅 영역 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* 채팅 헤더 */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
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
          flex: 1, overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: 4
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center', color: 'var(--text3)',
              fontSize: '0.875rem', marginTop: 40
            }}>
              {activeRoom === 'global'
                ? '전체 채팅에 첫 메시지를 보내보세요!'
                : `${activePeer?.name}님과 대화를 시작하세요!`
              }
            </div>
          )}

          {messages.map((msg, i) => {
            const isMine = msg.senderEmail === user.email
            const prevMsg = messages[i - 1]
            const showName = !isMine && (
              !prevMsg || prevMsg.senderEmail !== msg.senderEmail
            )
            const showTime = !messages[i + 1] ||
              messages[i + 1].senderEmail !== msg.senderEmail

            return (
              <div key={msg.id} style={{
                display: 'flex',
                flexDirection: isMine ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 6,
                marginTop: showName ? 12 : 2
              }}>
                {/* 아바타 (상대방만) */}
                {!isMine && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent2)',
                    visibility: showTime ? 'visible' : 'hidden'
                  }}>
                    {msg.senderName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}

                <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                  {/* 발신자 이름 */}
                  {showName && (
                    <div style={{
                      fontSize: '0.75rem', color: 'var(--text3)',
                      marginBottom: 3, paddingLeft: 2
                    }}>{msg.senderName}</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, flexDirection: isMine ? 'row-reverse' : 'row' }}>
                    {/* 말풍선 */}
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

                    {/* 시간 */}
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
          padding: '12px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', flexShrink: 0
        }}>
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            background: 'var(--surface)', borderRadius: 12,
            border: '1px solid var(--border)', padding: '6px 6px 6px 14px',
            transition: 'border-color 0.2s'
          }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
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
