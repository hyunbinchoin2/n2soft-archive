import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getQuestion, addAnswer, acceptAnswer,
  updateQuestion, deleteQuestion,
  addComment, getComments, deleteComment, CATEGORIES
} from '../services/archiveService'

export default function QuestionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [question, setQuestion]   = useState(null)
  const [loading, setLoading]     = useState(true)
  const [answerText, setAnswer]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [comments, setComments]   = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: '', tags: '' })

  useEffect(() => {
    Promise.all([getQuestion(id), getComments(id)])
      .then(([q, cmts]) => {
        setQuestion(q)
        setComments(cmts)
        if (q) setForm({
          title: q.title || '',
          body: q.body || '',
          category: q.category || '일반',
          tags: q.tags?.join(', ') || ''
        })
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!answerText.trim()) return
    setSubmitting(true)
    try {
      const ans = await addAnswer(id, answerText.trim(), user)
      setQuestion(prev => ({ ...prev, answers: [...(prev.answers || []), ans] }))
      setAnswer('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (answerId) => {
    await acceptAnswer(id, answerId)
    setQuestion(prev => ({
      ...prev, status: 'resolved',
      answers: prev.answers.map(a => ({ ...a, isAccepted: a.id === answerId }))
    }))
  }

  const handleUpdate = async () => {
    await updateQuestion(id, {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    })
    setQuestion(prev => ({ ...prev, ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }))
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('질문을 삭제하시겠습니까?')) return
    await deleteQuestion(id)
    navigate('/qa')
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const newComment = await addComment(id, 'question', commentText.trim(), user)
      setComments(prev => [...prev, newComment])
      setCommentText('')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('댓글을 삭제하시겠습니까?')) return
    await deleteComment(commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const isAuthor = user?.uid === question?.author?.uid

  if (loading) return (
    <div className="page-container">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12 }} />
      ))}
    </div>
  )

  if (!question) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--text3)' }}>질문을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/qa')} className="btn btn-ghost" style={{ marginTop: 16 }}>목록으로</button>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      <button onClick={() => navigate('/qa')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'var(--text3)', fontSize: '0.875rem',
        background: 'none', marginBottom: 24, cursor: 'pointer'
      }}>← Q&A 목록</button>

      {/* 질문 */}
      <div className="card" style={{ marginBottom: 24 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>질문 수정</h2>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="제목" style={{ width: '100%', padding: '10px 14px' }} />
            <textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={6} style={{ width: '100%', padding: '10px 14px', resize: 'vertical' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={{ padding: '10px 14px' }}>
                {CATEGORIES.filter(c => c !== '전체').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                placeholder="태그 (쉼표로 구분)" style={{ padding: '10px 14px' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(false)} className="btn btn-ghost">취소</button>
              <button onClick={handleUpdate} className="btn btn-primary">저장</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className={`badge ${question.status === 'resolved' ? 'badge-green' : 'badge-amber'}`}>
                    {question.status === 'resolved' ? '해결됨' : '미해결'}
                  </span>
                  <span className="badge badge-blue">{question.category}</span>
                  {question.tags?.map(t => <span key={t} className="tag">#{t}</span>)}
                </div>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: 16, lineHeight: 1.4 }}>
                  {question.title}
                </h1>
                <p style={{ color: 'var(--text2)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                  {question.body}
                </p>
              </div>
            </div>

            <hr className="divider" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar user={question.author} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{question.author?.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{question.author?.email}</div>
                </div>
              </div>
              {isAuthor && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    ✏️ 수정
                  </button>
                  <button onClick={handleDelete} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    🗑 삭제
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 댓글 */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 14 }}>
          댓글 {comments.length}개
        </h3>
        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '16px',
            color: 'var(--text3)', fontSize: '0.875rem',
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)', marginBottom: 14
          }}>첫 번째 댓글을 남겨보세요!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {comments.map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: 10, padding: '10px 14px',
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <Avatar user={c.author} size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: '0.825rem' }}>{c.author?.name}</span>
                    {c.author?.uid === user?.uid && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        style={{ fontSize: '0.75rem', color: 'var(--red)', background: 'none', cursor: 'pointer' }}>
                        삭제
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', marginTop: 3, lineHeight: 1.5 }}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar user={{ photoURL: user?.photoURL, name: user?.displayName || user?.email }} size={28} />
          <div style={{ flex: 1 }}>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..." rows={2}
              style={{ width: '100%', padding: '8px 12px', resize: 'none', marginBottom: 6 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary"
                disabled={submittingComment || !commentText.trim()}
                style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                {submittingComment ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 답변 목록 */}
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 14 }}>
        답변 {question.answers?.length || 0}개
      </h2>

      {question.answers?.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px',
          background: 'var(--surface)', borderRadius: 'var(--radius)',
          border: '1px dashed var(--border)', marginBottom: 24,
          color: 'var(--text3)', fontSize: '0.875rem'
        }}>아직 답변이 없습니다. 첫 번째로 답변해보세요!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {question.answers.map((ans) => (
            <div key={ans.id} className="card" style={{
              borderColor: ans.isAccepted ? 'rgba(52,211,153,0.3)' : 'var(--border)',
              background: ans.isAccepted ? 'rgba(52,211,153,0.04)' : 'var(--bg2)',
              position: 'relative'
            }}>
              {ans.isAccepted && (
                <div style={{
                  position: 'absolute', top: -1, right: 16,
                  background: 'var(--green)', color: '#fff',
                  fontSize: '0.7rem', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '0 0 8px 8px'
                }}>✓ 채택된 답변</div>
              )}
              <p style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                {ans.body}
              </p>
              <hr className="divider" />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar user={ans.author} size={28} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.8rem' }}>{ans.author?.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text3)' }}>
                      {ans.createdAt ? new Date(ans.createdAt).toLocaleDateString('ko-KR') : ''}
                    </div>
                  </div>
                </div>
                {isAuthor && !question.answers.some(a => a.isAccepted) && (
                  <button onClick={() => handleAccept(ans.id)} style={{
                    padding: '5px 14px', borderRadius: 8,
                    background: 'var(--green-bg)', color: 'var(--green)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                  }}>✓ 채택</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 답변 작성 */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>답변 작성</h3>
        <form onSubmit={handleSubmitAnswer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar user={{ photoURL: user?.photoURL, name: user?.displayName || user?.email }} size={32} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.displayName || user?.email}</span>
          </div>
          <textarea value={answerText} onChange={e => setAnswer(e.target.value)}
            placeholder="답변을 작성해주세요..." rows={5}
            style={{ width: '100%', padding: '12px 14px', resize: 'vertical', marginBottom: 12 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || !answerText.trim()}>
              {submitting ? '등록 중...' : '답변 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Avatar({ user, size = 36 }) {
  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'
  return user?.photoURL
    ? <img src={user.photoURL} alt="" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
    : <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent2)', fontWeight: 700, fontSize: size * 0.4
      }}>{initial}</div>
}