// src/pages/QAPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getQuestions, CATEGORIES } from '../services/archiveService'

export default function QAPage() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all') // all | open | resolved
  const [category, setCategory]   = useState('전체')

  useEffect(() => {
    getQuestions()
      .then(setQuestions)
      .finally(() => setLoading(false))
  }, [])

  const filtered = questions.filter(q => {
    const statusMatch = filter === 'all' || q.status === filter
    const catMatch = category === '전체' || q.category === category
    return statusMatch && catMatch
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 28, gap: 16, flexWrap: 'wrap'
      }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>Q&A 아카이브</h1>
          <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
            질문하고 답하며 팀의 지식을 쌓아갑니다
          </p>
        </div>
        <button
          onClick={() => navigate('/qa/ask')}
          className="btn btn-primary"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          새 질문
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20
      }}>
        {/* Status filter */}
        {[
          { key: 'all',      label: '전체' },
          { key: 'open',     label: '미해결' },
          { key: 'resolved', label: '해결됨' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            style={{
              padding: '5px 14px', borderRadius: 100, fontSize: '0.8rem',
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: filter === t.key ? 'var(--accent-bg)' : 'var(--surface)',
              color: filter === t.key ? 'var(--accent2)' : 'var(--text2)',
              border: filter === t.key ? '1px solid var(--accent-border)' : '1px solid var(--border)'
            }}
          >{t.label}</button>
        ))}

        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />

        {/* Category filter */}
        {CATEGORIES.slice(0, 5).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '5px 14px', borderRadius: 100, fontSize: '0.8rem',
              fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: category === cat ? 'var(--surface2)' : 'transparent',
              color: category === cat ? 'var(--text)' : 'var(--text3)',
              border: '1px solid transparent'
            }}
          >{cat}</button>
        ))}
      </div>

      {/* Question list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          color: 'var(--text3)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>💬</div>
          <p style={{ fontSize: '1rem', color: 'var(--text2)' }}>아직 질문이 없습니다</p>
          <button
            onClick={() => navigate('/qa/ask')}
            className="btn btn-primary"
            style={{ marginTop: 16 }}
          >첫 번째로 질문하기</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(q => (
            <button
              key={q.id}
              onClick={() => navigate(`/qa/${q.id}`)}
              style={{
                display: 'flex', gap: 16, padding: '16px 20px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', textAlign: 'left',
                cursor: 'pointer', transition: 'all 0.15s', width: '100%'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--border2)'
                e.currentTarget.style.background = 'var(--surface)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg2)'
              }}
            >
              {/* Answer count badge */}
              <div style={{
                width: 48, flexShrink: 0, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: q.status === 'resolved' ? 'var(--green-bg)' : 'var(--surface)',
                borderRadius: 8, padding: '6px 0',
                border: `1px solid ${q.status === 'resolved' ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`
              }}>
                <span style={{
                  fontSize: '1.2rem', fontWeight: 700,
                  color: q.status === 'resolved' ? 'var(--green)' : 'var(--text)'
                }}>{q.answers?.length || 0}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>답변</span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                    {q.title}
                  </span>
                  {q.status === 'resolved' && <span className="badge badge-green">해결됨</span>}
                  <span className="badge badge-blue">{q.category}</span>
                </div>
                <p style={{
                  fontSize: '0.825rem', color: 'var(--text2)',
                  marginTop: 4, lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 1, WebkitBoxOrient: 'vertical'
                }}>
                  {q.body}
                </p>
                <div style={{
                  display: 'flex', gap: 12, marginTop: 6,
                  fontSize: '0.75rem', color: 'var(--text3)', flexWrap: 'wrap'
                }}>
                  <span>👤 {q.author?.name}</span>
                  {q.tags?.slice(0, 3).map(t => (
                    <span key={t} className="tag" style={{ fontSize: '0.7rem', padding: '0 6px' }}>#{t}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
