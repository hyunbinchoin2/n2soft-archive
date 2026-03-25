// src/pages/AdminPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  collection, getDocs, doc, setDoc, deleteDoc, getDoc
} from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { db, auth } from '../services/firebase'

export default function AdminPage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [message, setMessage]         = useState(null)
  const [activeTab, setActiveTab]     = useState('users')

  const [form, setForm] = useState({ email: '', name: '', role: 'user' })

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    fetchUsers()
  }, [isAdmin])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'allowedUsers'))
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      console.log('Fetched users:', list)
      setUsers(list)
    } catch (err) {
      console.error('fetchUsers error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!form.email || !form.name) return
    setSubmitting(true)
    setMessage(null)
    try {
      const existing = users.find(u => u.email === form.email)
      if (existing) {
        setMessage({ type: 'error', text: '이미 등록된 이메일입니다.' })
        setSubmitting(false)
        return
      }
      await setDoc(doc(db, 'allowedUsers', form.email), {
        name: form.name,
        email: form.email,
        role: form.role,
        createdAt: new Date().toISOString(),
        createdBy: user.email
      })
      setMessage({ type: 'success', text: `${form.name}(${form.email}) 등록 완료! Firebase Console에서 Auth 계정도 만들어주세요.` })
      setForm({ email: '', name: '', role: 'user' })
      setShowAddForm(false)
      fetchUsers()
    } catch (err) {
      console.error('handleAddUser error:', err)
      setMessage({ type: 'error', text: `등록 오류: ${err.message}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage({ type: 'success', text: `${email}로 비밀번호 재설정 이메일을 발송했습니다.` })
    } catch (err) {
      console.error('handleResetPassword error:', err)
      setMessage({ type: 'error', text: `이메일 발송 실패: ${err.message}` })
    }
  }

  const handleDeleteUser = async (email, name) => {
    if (!window.confirm(`${name}(${email}) 계정을 삭제하시겠습니까?`)) return
    console.log('Deleting user:', email)
    console.log('Current user:', user?.email)
    console.log('Is admin:', isAdmin)
    try {
      // 삭제 전 문서 존재 확인
      const docRef = doc(db, 'allowedUsers', email)
      const docSnap = await getDoc(docRef)
      console.log('Document exists:', docSnap.exists())
      console.log('Document path:', docRef.path)

      await deleteDoc(docRef)
      console.log('Delete success!')
      setMessage({ type: 'success', text: `${name} 계정이 삭제됐습니다.` })
      fetchUsers()
    } catch (err) {
      console.error('handleDeleteUser error code:', err.code)
      console.error('handleDeleteUser error message:', err.message)
      console.error('handleDeleteUser full error:', err)
      setMessage({ type: 'error', text: `삭제 오류 (${err.code}): ${err.message}` })
    }
  }

  const handleRoleChange = async (email, newRole) => {
    try {
      await setDoc(doc(db, 'allowedUsers', email), { role: newRole }, { merge: true })
      setMessage({ type: 'success', text: '권한이 변경됐습니다.' })
      fetchUsers()
    } catch (err) {
      console.error('handleRoleChange error:', err)
      setMessage({ type: 'error', text: `권한 변경 오류: ${err.message}` })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>관리자 페이지</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>사용자 접근 권한을 관리합니다</p>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {[
          { key: 'users', label: `사용자 목록 (${users.length})` },
          { key: 'guide', label: '신규 사용자 추가 방법' }
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: '0.875rem',
            fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            background: activeTab === t.key ? 'var(--accent-bg)' : 'var(--surface)',
            color: activeTab === t.key ? 'var(--accent2)' : 'var(--text2)',
            border: activeTab === t.key ? '1px solid var(--accent-border)' : '1px solid var(--border)'
          }}>{t.label}</button>
        ))}
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)',
          border: `1px solid ${message.type === 'success' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
          borderRadius: 'var(--radius)', padding: '12px 16px',
          color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
          fontSize: '0.875rem', marginBottom: 20, lineHeight: 1.6
        }}>{message.text}</div>
      )}

      {/* 사용자 목록 탭 */}
      {activeTab === 'users' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => { setShowAddForm(v => !v); setMessage(null) }} className="btn btn-primary">
              {showAddForm ? '취소' : '+ 사용자 추가'}
            </button>
          </div>

          {showAddForm && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>접근 권한 등록</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 16, lineHeight: 1.6 }}>
                여기서 등록 후 <strong style={{ color: 'var(--amber)' }}>Firebase Console → Authentication → Users</strong>에서 동일 이메일로 계정도 만들어야 로그인이 가능합니다.
              </p>
              <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>이름 *</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="홍길동" style={{ width: '100%', padding: '10px 14px' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>이메일 *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="hong@example.com" style={{ width: '100%', padding: '10px 14px' }} required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text3)', marginBottom: 6 }}>권한</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="user">일반 사용자</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-ghost">취소</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? '등록 중...' : '권한 등록'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {users.map(u => (
                <div key={u.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: u.role === 'admin' ? 'var(--amber-bg)' : 'var(--accent-bg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1rem',
                      color: u.role === 'admin' ? 'var(--amber)' : 'var(--accent2)'
                    }}>
                      {u.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{u.name}</span>
                        <span className={`badge ${u.role === 'admin' ? 'badge-amber' : 'badge-blue'}`}>
                          {u.role === 'admin' ? '관리자' : '일반'}
                        </span>
                        {u.id === user?.email && <span className="badge badge-green">나</span>}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 2 }}>
                        {u.email}
                        {u.createdAt && <span style={{ marginLeft: 8 }}>· {new Date(u.createdAt).toLocaleDateString('ko-KR')}</span>}
                      </div>
                    </div>
                    {u.id !== user?.email && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                        <select value={u.role} onChange={e => handleRoleChange(u.email, e.target.value)}
                          style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: 6, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                          <option value="user">일반</option>
                          <option value="admin">관리자</option>
                        </select>
                        <button onClick={() => handleResetPassword(u.email)} className="btn btn-ghost"
                          style={{ fontSize: '0.78rem', padding: '5px 10px' }}>비밀번호 초기화</button>
                        <button onClick={() => handleDeleteUser(u.email, u.name)} className="btn btn-danger"
                          style={{ fontSize: '0.78rem', padding: '5px 10px' }}>삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 가이드 탭 */}
      {activeTab === 'guide' && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>신규 사용자 추가 방법</h2>
          {[
            { step: '1', title: 'Firebase Console에서 Auth 계정 생성', content: 'Firebase Console → Authentication → Users → "+ 사용자 추가" → 이메일/비밀번호 입력 후 저장' },
            { step: '2', title: '아카이브 관리자 페이지에서 권한 등록', content: '"사용자 목록" 탭 → "+ 사용자 추가" → 동일 이메일과 이름 입력 → 권한 선택 → "권한 등록" 클릭' },
            { step: '3', title: '사용자에게 초기 비밀번호 전달', content: 'Firebase Console에서 설정한 초기 비밀번호를 사용자에게 직접 전달하거나 비밀번호 초기화 이메일을 발송하세요.' },
            { step: '4', title: '사용자가 첫 로그인 후 비밀번호 변경', content: '로그인 페이지 → "비밀번호를 잊으셨나요?" → 이메일로 재설정 링크 발송 → 새 비밀번호 설정' }
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, marginBottom: i < 3 ? 20 : 0,
              paddingBottom: i < 3 ? 20 : 0, borderBottom: i < 3 ? '1px solid var(--border)' : 'none'
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-bg)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '0.8rem', color: 'var(--accent2)'
              }}>{item.step}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text2)', lineHeight: 1.6 }}>{item.content}</div>
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 20, padding: '14px 16px',
            background: 'var(--amber-bg)', border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: 'var(--radius)', fontSize: '0.825rem', color: 'var(--amber)', lineHeight: 1.6
          }}>
            ⚠️ Firebase Auth 계정 생성과 아카이브 권한 등록 두 가지를 모두 해야 로그인이 가능합니다.
          </div>
        </div>
      )}
    </div>
  )
}
