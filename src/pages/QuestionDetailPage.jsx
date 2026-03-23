// src/pages/QuestionDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getQuestion, addAnswer, acceptAnswer } from '../services/archiveService'

export default function QuestionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [question, setQuestion] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [answerText, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getQuestion(id)
      .then(setQuestion)
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmitAnswer = async (e) => {
    e.preventDefault()
    if (!answerText.trim()) return
    setSubmitting(true)
    try {
      const ans = await addAnswer(id, answerText.trim(), user)
      setQuestion(prev => ({
        ...prev,
        answers: [...(prev.answers || []), ans]
      }))
      setAnswer('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (answerId) => {
    await acceptAnswer(id, answerId)
    setQuestion(prev => ({
      ...prev,
      status: 'resolved',
      answers: prev.answers.map(a => ({ ...a, isAccepted: a.id === answerId }))
    }))
  }

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
      <button onClick={() => navigate('/qa')} className="btn btn-ghost" style={{ marginTop: 16 }}>
        목록으로
      </button>
    </div>
  )

  const isAuthor = user?.uid === question.author?.uid

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      {/* Back */}
      <button
        onClick={() => navigate('/qa')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--text3)', fontSize: '0.875rem',
          background: 'none', marginBottom: 24,
          transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >
        ← Q&A 목록
      </button>

      {/* Question */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className={`badge ${question.status === 'resolved' ? 'badge-green' : 'badge-amber'}`}>
                {question.status === 'resolved' ? '해결됨' : '미해결'}
              </span>
              <span className="badge badge-blue">{question.category}</span>
              {question.tags?.map(t => (
                <span key={t} className="tag" style={{ fontSize: '0.75rem' }}>#{t}</span>
              ))}
            </div>
            <h1 style={{
              fontSize: '1.35rem', fontWeight: 700,
              color: 'var(--text)', marginBottom: 16, lineHeight: 1.4
            }}>{question.title}</h1>
            <p style={{
              color: 'var(--text2)', lineHeight: 1.7,
              fontSize: '0.95rem', whiteSpace: 'pre-wrap'
            }}>{question.body}</p>
          </div>
        </div>

        <hr className="divider" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar user={question.author} />
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{question.author?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>{question.author?.email}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text3)' }}>
            💬 답변 {question.answers?.length || 0}개
          </div>
        </div>
      </div>

      {/* Answers */}
      <h2 style={{
        fontSize: '1rem', fontWeight: 600,
        color: 'var(--text2)', marginBottom: 14
      }}>답변 {question.answers?.length || 0}개</h2>

      {question.answers?.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px',
          background: 'var(--surface)', borderRadius: 'var(--radius)',
          border: '1px dashed var(--border)', marginBottom: 24,
          color: 'var(--text3)', fontSize: '0.875rem'
        }}>
          아직 답변이 없습니다. 첫 번째로 답변해보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {question.answers.map((ans) => (
            <div
              key={ans.id}
              className="card"
              style={{
                borderColor: ans.isAccepted ? 'rgba(52,211,153,0.3)' : 'var(--border)',
                background: ans.isAccepted ? 'rgba(52,211,153,0.04)' : 'var(--bg2)',
                position: 'relative'
              }}
            >
              {ans.isAccepted && (
                <div style={{
                  position: 'absolute', top: -1, right: 16,
                  background: 'var(--green)',
                  color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                  padding: '3px 10px', borderRadius: '0 0 8px 8px'
                }}>✓ 채택된 답변</div>
              )}

              <p style={{
                color: 'var(--text)', lineHeight: 1.7,
                fontSize: '0.95rem', whiteSpace: 'pre-wrap',
                marginBottom: 16
              }}>{ans.body}</p>

              <hr className="divider" />

              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
              }}>
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
                  <button
                    onClick={() => handleAccept(ans.id)}
                    style={{
                      padding: '5px 14px', borderRadius: 8,
                      background: 'var(--green-bg)',
                      color: 'var(--green)', border: '1px solid rgba(52,211,153,0.2)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--green-bg)'}
                  >✓ 채택</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Answer form */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>답변 작성</h3>
        <form onSubmit={handleSubmitAnswer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar user={{ photoURL: user?.photoURL, name: user?.displayName || user?.email }} size={32} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {user?.displayName || user?.email}
            </span>
          </div>
          <textarea
            value={answerText}
            onChange={e => setAnswer(e.target.value)}
            placeholder="답변을 작성해주세요..."
            rows={5}
            style={{ width: '100%', padding: '12px 14px', resize: 'vertical', marginBottom: 12 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !answerText.trim()}
            >
              {submitting
                ? <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />등록 중...</>
                : '답변 등록'
              }
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
        background: 'var(--accent-bg)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent2)', fontWeight: 700,
        fontSize: size * 0.4
      }}>{initial}</div>
}
