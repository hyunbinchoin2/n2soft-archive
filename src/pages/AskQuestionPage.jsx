// src/pages/AskQuestionPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createQuestion, CATEGORIES } from '../services/archiveService'

export default function AskQuestionPage() {
  const { user, userInfo } = useAuth()
  const navigate = useNavigate()
  const namedUser = { ...user, displayName: userInfo?.name || user?.displayName || user?.email }

  const [form, setForm] = useState({
    title: '', body: '', category: '일반', tags: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('제목을 입력해주세요'); return }
    if (!form.body.trim())  { setError('질문 내용을 입력해주세요'); return }

    setSubmitting(true)
    setError('')
    try {
      const data = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      const q = await createQuestion(data, namedUser)
      navigate(`/qa/${q.id}`)
    } catch (err) {
      console.error(err)
      setError('질문 등록 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <button
        onClick={() => navigate('/qa')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--text3)', fontSize: '0.875rem',
          background: 'none', marginBottom: 28, cursor: 'pointer',
          transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >← Q&A 목록</button>

      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>새 질문 작성</h1>
      <p style={{ color: 'var(--text3)', marginBottom: 32, fontSize: '0.9rem' }}>
        동료에게 질문하고 팀의 지식을 함께 쌓아가세요
      </p>

      {/* 작성자 정보 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', background: 'var(--surface)',
        borderRadius: 'var(--radius)', marginBottom: 24,
        border: '1px solid var(--border)'
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent-bg)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent2)', fontWeight: 700
        }}>{(namedUser.displayName)?.[0]?.toUpperCase()}</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{namedUser.displayName}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>질문 작성자로 기록됩니다</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            질문 제목 <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input type="text" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="질문을 한 줄로 요약해주세요"
            style={{ width: '100%', padding: '10px 14px' }} autoFocus />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            상세 내용 <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <textarea value={form.body}
            onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
            placeholder="질문 배경, 시도해본 것, 원하는 결과 등을 구체적으로 작성해주세요"
            rows={8} style={{ width: '100%', padding: '12px 14px', resize: 'vertical', lineHeight: 1.6 }} />
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 4 }}>
            {form.body.length} / 5000자
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>카테고리</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}>
              {CATEGORIES.filter(c => c !== '전체').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
              태그 <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(쉼표로 구분)</span>
            </label>
            <input type="text" value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="예: React, 배포, 오류"
              style={{ width: '100%', padding: '10px 14px' }} />
          </div>
        </div>

        {form.tags && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
              <span key={t} className="tag">#{t}</span>
            ))}
          </div>
        )}

        {error && (
          <div style={{
            background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            color: 'var(--red)', fontSize: '0.875rem'
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => navigate('/qa')} className="btn btn-ghost" disabled={submitting}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />등록 중...</>
              : '질문 등록'
            }
          </button>
        </div>
      </form>
    </div>
  )
}
