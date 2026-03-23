// src/pages/HomePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getDocuments, getQuestions, CATEGORIES } from '../services/archiveService'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [recentDocs, setRecentDocs] = useState([])
  const [recentQA, setRecentQA]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDocuments(), getQuestions()])
      .then(([docs, qas]) => {
        setRecentDocs(docs.slice(0, 4))
        setRecentQA(qas.slice(0, 3))
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const firstName = user?.displayName?.split(' ')[0] || '안녕하세요'

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)' }}>
      {/* ── Hero Search Section ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px 60px',
        textAlign: 'center'
      }}>
        <p style={{
          fontSize: '0.85rem', color: 'var(--text3)',
          marginBottom: 12, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase'
        }}>
          {firstName}님, 무엇을 찾고 계신가요?
        </p>

        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)',
          fontWeight: 800,
          color: 'var(--text)',
          letterSpacing: '-0.04em',
          marginBottom: 40,
          lineHeight: 1.1
        }}>
          N2SOFT<br/>
          <span style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>Knowledge Archive</span>
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ width: '100%', maxWidth: 640 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 100,
            padding: '6px 6px 6px 24px',
            gap: 8,
            boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--accent-border)'
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.3), 0 0 0 3px var(--accent-bg)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border2)'
            e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.3)'
          }}
          >
            <span style={{ color: 'var(--text3)', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="문서, Q&A, 태그 검색..."
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '1.05rem', padding: '10px 4px',
                color: 'var(--text)'
              }}
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: 100, padding: '10px 24px', fontWeight: 600, fontSize: '0.9rem' }}
            >
              검색
            </button>
          </div>
        </form>

        {/* Quick category filters */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8,
          justifyContent: 'center', marginTop: 20
        }}>
          {CATEGORIES.filter(c => c !== '전체').map(cat => (
            <button
              key={cat}
              onClick={() => navigate(`/search?q=${encodeURIComponent(cat)}`)}
              style={{
                padding: '5px 14px',
                borderRadius: 100,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-bg)'
                e.currentTarget.style.borderColor = 'var(--accent-border)'
                e.currentTarget.style.color = 'var(--accent2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface)'
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text2)'
              }}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* ── Recent Content ── */}
      <div className="page-container" style={{ paddingTop: 0 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 100 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {/* Recent Documents */}
            <section>
              <SectionHeader title="최근 업로드" href="/search?q=" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentDocs.length === 0 ? (
                  <EmptyState text="아직 문서가 없습니다" />
                ) : recentDocs.map(doc => (
                  <DocCard key={doc.id} doc={doc} navigate={navigate} />
                ))}
              </div>
            </section>

            {/* Recent Q&A */}
            <section>
              <SectionHeader title="최근 Q&A" href="/qa" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentQA.length === 0 ? (
                  <EmptyState text="아직 질문이 없습니다" />
                ) : recentQA.map(q => (
                  <QACard key={q.id} qa={q} navigate={navigate} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginTop: 32
        }}>
          <QuickAction
            icon="📤"
            title="문서 업로드"
            desc="PDF, 이미지, 문서 파일 업로드"
            onClick={() => navigate('/upload')}
          />
          <QuickAction
            icon="💬"
            title="질문하기"
            desc="동료에게 질문하고 아카이브 확장"
            onClick={() => navigate('/qa/ask')}
          />
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, href }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12
    }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{title}</h2>
      <button
        onClick={() => navigate(href)}
        style={{ fontSize: '0.8rem', color: 'var(--accent2)', background: 'none', cursor: 'pointer' }}
      >전체 보기 →</button>
    </div>
  )
}

function DocCard({ doc, navigate }) {
  return (
    <button
      onClick={() => navigate(`/documents/${doc.id}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: '100%'
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
      <span style={{ fontSize: '1.4rem' }}>{getFileEmoji(doc.fileType)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500, fontSize: '0.875rem', color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{doc.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
          {doc.uploader?.name} · {doc.category}
        </div>
      </div>
      <span className="badge badge-blue">{doc.fileType?.toUpperCase()}</span>
    </button>
  )
}

function QACard({ qa, navigate }) {
  const answerCount = qa.answers?.length || 0
  return (
    <button
      onClick={() => navigate(`/qa/${qa.id}`)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 14px',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: '100%'
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
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: qa.status === 'resolved' ? 'var(--green-bg)' : 'var(--amber-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.75rem', fontWeight: 700,
        color: qa.status === 'resolved' ? 'var(--green)' : 'var(--amber)'
      }}>
        {answerCount}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500, fontSize: '0.875rem', color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{qa.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
          {qa.author?.name} · 답변 {answerCount}개
        </div>
      </div>
      {qa.status === 'resolved' && (
        <span className="badge badge-green">해결</span>
      )}
    </button>
  )
}

function QuickAction({ icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', textAlign: 'left', border: '1px solid var(--border)',
        transition: 'all 0.2s', width: '100%'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent-border)'
        e.currentTarget.style.background = 'var(--surface)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'var(--bg2)'
      }}
    >
      <span style={{ fontSize: '1.8rem' }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
      </div>
    </button>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: '24px', textAlign: 'center',
      color: 'var(--text3)', fontSize: '0.85rem',
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      border: '1px dashed var(--border)'
    }}>
      {text}
    </div>
  )
}

function getFileEmoji(type) {
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📋', pptx: '📋', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '📦', txt: '📃'
  }
  return map[type?.toLowerCase()] || '📁'
}
