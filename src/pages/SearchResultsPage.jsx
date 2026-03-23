// src/pages/SearchResultsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchDocuments } from '../services/archiveService'

export default function SearchResultsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''

  const [results, setResults]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState('all') // all | document | question
  const [query, setQuery]       = useState(q)

  const doSearch = useCallback(async (kw) => {
    if (!kw.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await searchDocuments(kw)
      setResults(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { doSearch(q); setQuery(q) }, [q, doSearch])

  const filtered = filter === 'all' ? results
    : results.filter(r => r.type === filter)

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const docCount = results.filter(r => r.type === 'document').length
  const qaCount  = results.filter(r => r.type === 'question').length

  return (
    <div className="page-container">
      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center'
        }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 100, padding: '10px 20px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                fontSize: '1rem', color: 'var(--text)'
              }}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); setResults([]) }}
                style={{ color: 'var(--text3)', background: 'none', lineHeight: 0 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ borderRadius: 100 }}>검색</button>
        </div>
      </form>

      {/* Result summary + filter tabs */}
      {!loading && q && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, flexWrap: 'wrap', gap: 12, flexDirection: 'column'
        }}>
          <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>
            <strong style={{ color: 'var(--text)' }}>"{q}"</strong> 검색 결과{' '}
            <strong style={{ color: 'var(--accent2)' }}>{results.length}건</strong>
          </p>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all',      label: `전체 ${results.length}` },
              { key: 'document', label: `문서 ${docCount}` },
              { key: 'question', label: `Q&A ${qaCount}` }
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                style={{
                  padding: '5px 14px', borderRadius: 100,
                  fontSize: '0.8rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: filter === t.key ? 'var(--accent-bg)' : 'var(--surface)',
                  color: filter === t.key ? 'var(--accent2)' : 'var(--text2)',
                  border: filter === t.key ? '1px solid var(--accent-border)' : '1px solid var(--border)'
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          color: 'var(--text3)'
        }}>
          {q
            ? <>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: '1rem', color: 'var(--text2)' }}>"{q}"에 대한 검색 결과가 없습니다</p>
                <p style={{ fontSize: '0.85rem', marginTop: 8 }}>다른 키워드로 검색하거나 문서를 업로드해보세요</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="btn btn-primary"
                  style={{ marginTop: 20 }}
                >문서 업로드하기</button>
              </>
            : <p>검색어를 입력하세요</p>
          }
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(item => (
            item.type === 'document'
              ? <DocResult key={item.id} item={item} navigate={navigate} query={q} />
              : <QAResult  key={item.id} item={item} navigate={navigate} query={q} />
          ))}
        </div>
      )}
    </div>
  )
}

function highlight(text = '', keyword = '') {
  if (!keyword || !text) return text
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent-bg)', color: 'var(--accent2)', borderRadius: 3 }}>
        {text.slice(idx, idx + keyword.length)}
      </mark>
      {text.slice(idx + keyword.length)}
    </>
  )
}

function DocResult({ item, navigate, query }) {
  return (
    <button
      onClick={() => navigate(`/documents/${item.id}`)}
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
      <span style={{ fontSize: '1.6rem', lineHeight: 1.2 }}>{getFileEmoji(item.fileType)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
            {highlight(item.title, query)}
          </span>
          <span className="badge badge-blue">{item.fileType?.toUpperCase()}</span>
          <span className="badge badge-blue">{item.category}</span>
        </div>
        {item.description && (
          <p style={{
            fontSize: '0.825rem', color: 'var(--text2)', marginTop: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {highlight(item.description, query)}
          </p>
        )}
        <div style={{
          display: 'flex', gap: 12, marginTop: 6,
          fontSize: '0.75rem', color: 'var(--text3)'
        }}>
          <span>📁 문서</span>
          <span>👤 {item.uploader?.name}</span>
          <span>👁 {item.viewCount || 0}</span>
          {item.tags?.slice(0, 3).map(t => (
            <span key={t} className="tag" style={{ fontSize: '0.7rem', padding: '0 6px' }}>#{t}</span>
          ))}
        </div>
      </div>
    </button>
  )
}

function QAResult({ item, navigate, query }) {
  const ans = item.answers?.length || 0
  return (
    <button
      onClick={() => navigate(`/qa/${item.id}`)}
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
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: item.status === 'resolved' ? 'var(--green-bg)' : 'var(--amber-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 0
      }}>
        <span style={{ fontSize: '0.65rem', color: item.status === 'resolved' ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
          답변
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 700, color: item.status === 'resolved' ? 'var(--green)' : 'var(--amber)', lineHeight: 1 }}>
          {ans}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
            {highlight(item.title, query)}
          </span>
          {item.status === 'resolved' && <span className="badge badge-green">해결됨</span>}
        </div>
        <p style={{
          fontSize: '0.825rem', color: 'var(--text2)', marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {highlight(item.body, query)}
        </p>
        <div style={{
          display: 'flex', gap: 12, marginTop: 6,
          fontSize: '0.75rem', color: 'var(--text3)'
        }}>
          <span>💬 Q&A</span>
          <span>👤 {item.author?.name}</span>
        </div>
      </div>
    </button>
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
