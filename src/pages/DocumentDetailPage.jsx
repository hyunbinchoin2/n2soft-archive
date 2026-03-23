// src/pages/DocumentDetailPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocuments, incrementViewCount } from '../services/archiveService'

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // getDocuments then filter by id (or add getDocument helper)
    getDocuments().then(docs => {
      const found = docs.find(d => d.id === id)
      setDoc(found || null)
      if (found) incrementViewCount(id).catch(() => {})
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="page-container">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12 }} />
      ))}
    </div>
  )

  if (!doc) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--text3)' }}>문서를 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ marginTop: 16 }}>
        홈으로
      </button>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'var(--text3)', fontSize: '0.875rem',
          background: 'none', marginBottom: 24,
          transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >
        ← 뒤로가기
      </button>

      {/* Doc header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '3rem', lineHeight: 1 }}>{getFileEmoji(doc.fileType)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="badge badge-blue">{doc.fileType?.toUpperCase()}</span>
              <span className="badge badge-blue">{doc.category}</span>
            </div>
            <h1 style={{
              fontSize: '1.4rem', fontWeight: 700,
              color: 'var(--text)', lineHeight: 1.3, marginBottom: 10
            }}>{doc.title}</h1>
            {doc.description && (
              <p style={{
                color: 'var(--text2)', lineHeight: 1.6,
                fontSize: '0.9rem'
              }}>{doc.description}</p>
            )}
            {doc.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                {doc.tags.map(t => (
                  <span key={t} className="tag">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <hr className="divider" />

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 20, fontSize: '0.8rem',
          color: 'var(--text3)', flexWrap: 'wrap'
        }}>
          <span>👁 조회 {doc.viewCount || 0}회</span>
          <span>📦 {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
          <span>📄 {doc.fileName}</span>
        </div>
      </div>

      {/* Download button */}
      <a
        href={doc.downloadURL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary"
        style={{
          display: 'inline-flex', marginBottom: 24,
          textDecoration: 'none'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        파일 다운로드
      </a>

      {/* Upload history */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
          업로드 이력
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(doc.uploadHistory || []).map((h, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '10px 14px',
              background: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)'
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{h.name}</span>
                <span style={{ color: 'var(--text3)', fontSize: '0.8rem', marginLeft: 8 }}>
                  {h.email}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                {h.uploadedAt
                  ? new Date(h.uploadedAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })
                  : '날짜 없음'
                }
              </div>
              <span className="badge badge-blue">
                {h.action === 'upload' ? '최초 업로드' : h.action}
              </span>
            </div>
          ))}
        </div>
      </div>
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
