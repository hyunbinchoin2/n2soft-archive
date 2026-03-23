// src/pages/DocumentsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDocuments, CATEGORIES } from '../services/archiveService'

export default function DocumentsPage() {
  const navigate = useNavigate()
  const [allDocs, setAllDocs]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [category, setCategory] = useState('전체')

  // 전체를 한 번만 가져오고 클라이언트에서 필터링
  useEffect(() => {
    getDocuments()
      .then(setAllDocs)
      .finally(() => setLoading(false))
  }, [])

  const docs = category === '전체'
    ? allDocs
    : allDocs.filter(d => d.category === category)

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>전체 문서</h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>
          {category === '전체'
            ? `총 ${allDocs.length}개의 문서`
            : `'${category}' 카테고리 ${docs.length}개`
          }
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '5px 14px', borderRadius: 100,
              fontSize: '0.8rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              background: category === cat ? 'var(--accent-bg)' : 'var(--surface)',
              color: category === cat ? 'var(--accent2)' : 'var(--text2)',
              border: category === cat ? '1px solid var(--accent-border)' : '1px solid var(--border)'
            }}
          >{cat}</button>
        ))}
      </div>

      {/* 문서 목록 */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📂</div>
          <p style={{ fontSize: '1rem', color: 'var(--text2)' }}>
            {category === '전체' ? '아직 등록된 문서가 없습니다' : `'${category}' 카테고리에 문서가 없습니다`}
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="btn btn-primary"
            style={{ marginTop: 16 }}
          >문서 등록하기</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => (
            <button
              key={doc.id}
              onClick={() => navigate(`/documents/${doc.id}`)}
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
              <span style={{ fontSize: '1.6rem', lineHeight: 1.2, flexShrink: 0 }}>
                {getFileEmoji(doc.fileType)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)' }}>
                    {doc.title}
                  </span>
                  <span className="badge badge-blue">{doc.category}</span>
                  {doc.fileType && doc.fileType !== 'text' && (
                    <span className="badge badge-blue">{doc.fileType.toUpperCase()}</span>
                  )}
                </div>
                {doc.description && (
                  <p style={{
                    fontSize: '0.825rem', color: 'var(--text2)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{doc.description}</p>
                )}
                <div style={{
                  display: 'flex', gap: 12, marginTop: 6,
                  fontSize: '0.75rem', color: 'var(--text3)', flexWrap: 'wrap'
                }}>
                  <span>👤 {doc.uploader?.name}</span>
                  <span>👁 {doc.viewCount || 0}</span>
                  {doc.tags?.slice(0, 3).map(t => (
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

function getFileEmoji(type) {
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📋', pptx: '📋', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '📦', txt: '📃', text: '📝'
  }
  return map[type?.toLowerCase()] || '📁'
}
