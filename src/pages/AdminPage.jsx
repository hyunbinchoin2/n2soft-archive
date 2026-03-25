// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  collection, getDocs, doc, setDoc, deleteDoc
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser as fbDeleteUser,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { db, auth, secondaryAuth } from '../services/firebase'

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [message, setMessage]         = useState(null)

  const [form, setForm] = useState({
    email: '', password: '', name: '', role: 'user'
  })

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    fetchUsers()
  }, [isAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'allowedUsers'))
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.name) return
    setSubmitting(true)
    setMessage(null)

    try {
      // Firebase Auth에 계정 생성 (secondaryAuth 사용 - 현재 로그인 유지)
      const secondary = secondaryAuth
      const cred = await createUserWithEmailAndPassword(secondary, form.email, form.password)

      // Firestore allowedUsers에 추가
      await setDoc(doc(db, 'allowedUsers', form.email), {
        name: form.name,
        email: form.email,
        role: form.role,
        createdAt: new Date().toISOString(),
        createdBy: user.email
      })

      // secondary auth 로그아웃 (현재 관리자 세션 유지)
      await signOut(secondary)

      setMessage({ type: 'success', text: `${form.name}(${form.email}) 계정이 생성됐습니다.` })
      setForm({ email: '', password: '', name: '', role: 'user' })
      setShowAddForm(false)
      fetchUsers()
    } catch (err) {
      let msg = '계정 생성 중 오류가 발생했습니다.'
      if (err.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일입니다.'
      if (err.code === 'auth/weak-password') msg = '비밀번호는 6자 이상이어야 합니다.'
      setMessage({ type: 'error', text: msg })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage({ type: 'success', text: `${email}로 비밀번호 재설정 이메일을 발송했습니다.` })
    } catch {
      setMessage({ type: 'error', text: '이메일 발송에 실패했습니다.' })
    }
  }

  const handleDeleteUser = async (email, name) => {
    if (!window.confirm(`${name}(${email}) 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return
    try {
      await deleteDoc(doc(db, 'allowedUsers', email))
      setMessage({ type: 'success', text: `${name} 계정이 삭제됐습니다.` })
      fetchUsers()
    } catch {
      setMessage({ type: 'error', text: '계정 삭제 중 오류가 발생했습니다.' })
    }
  }

  const handleRoleChange = async (email, newRole) => {
    try {
      await setDoc(doc(db, 'allowedUsers', email), { role: newRole }, { merge: true })
      fetchUsers()
    } catch {
      setMessage({ type: 'error', text: '권한 변경 중 오류가 발생했습니다.' })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>사용자 관리</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
            총 {users.length}명의 사용자
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(v => !v); setMessage(null) }}
          className="btn btn-primary"
        >
          {showAddForm ? '취소' : '+ 사용자 추가'}
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          border: `1px solid ${message.type === 'success' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 'var(--radius)', padding: '12px 16px',
          color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
          fontSize: '0.875rem', marginBottom: 20
        }}>{message.text}</div>
      )}

      {/* 사용자 추가 폼 */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>새 사용자 추가</h2>
          <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  이름 *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="홍길동"
                  style={{ width: '100%', padding: '10px 14px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  이메일 *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="hong@example.com"
                  style={{ width: '100%', padding: '10px 14px' }}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  초기 비밀번호 * (6자 이상)
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="초기 비밀번호"
                  style={{ width: '100%', padding: '10px 14px' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>
                  권한
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}
                >
                  <option value="user">일반 사용자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>
            <div style={{
              background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              fontSize: '0.8rem', color: 'var(--amber)'
            }}>
              ⚠️ 초기 비밀번호를 사용자에게 직접 전달해주세요. 첫 로그인 후 비밀번호를 변경하도록 안내하세요.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-ghost">취소</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 사용자 목록 */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                {/* 아바타 */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: u.role === 'admin' ? 'var(--amber-bg)' : 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1rem',
                  color: u.role === 'admin' ? 'var(--amber)' : 'var(--accent2)'
                }}>
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.name}</span>
                    <span className={`badge ${u.role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>
                      {u.role === 'admin' ? '관리자' : '일반'}
                    </span>
                    {u.id === user?.email && (
                      <span className="badge badge-green">나</span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 2 }}>
                    {u.email}
                    {u.createdAt && (
                      <span style={{ marginLeft: 8 }}>
                        · 등록일: {new Date(u.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    )}
                  </div>
                </div>

                {/* 액션 버튼 */}
                {u.id !== user?.email && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                    <select
                      value={u.role}
                      onChange={e => handleRoleChange(u.email, e.target.value)}
                      style={{
                        padding: '5px 10px', fontSize: '0.78rem',
                        borderRadius: 6, cursor: 'pointer',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        color: 'var(--text2)'
                      }}
                    >
                      <option value="user">일반</option>
                      <option value="admin">관리자</option>
                    </select>
                    <button
                      onClick={() => handleResetPassword(u.email)}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                    >비밀번호 초기화</button>
                    <button
                      onClick={() => handleDeleteUser(u.email, u.name)}
                      className="btn btn-danger"
                      style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                    >삭제</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
