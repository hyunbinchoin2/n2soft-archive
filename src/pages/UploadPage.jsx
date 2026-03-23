// src/pages/UploadPage.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { uploadDocument, CATEGORIES } from '../services/archiveService'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [file, setFile]           = useState(null)
  const [dragOver, setDragOver]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '기타',
    tags: ''
  })

  const handleFile = (f) => {
    if (!f) return
    if (f.size > MAX_FILE_SIZE) {
      setError('파일 크기는 50MB 이하여야 합니다')
      return
    }
    setFile(f)
    if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, '') }))
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { setError('파일을 선택해주세요'); return }
    if (!form.title.trim()) { setError('제목을 입력해주세요'); return }

    setUploading(true)
    setError('')

    try {
      const metadata = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      }
      const doc = await uploadDocument(file, metadata, user, setProgress)
      setSuccess(true)
      setTimeout(() => navigate(`/documents/${doc.id}`), 1500)
    } catch (err) {
      console.error(err)
      setError('업로드 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>✅</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>업로드 완료!</h2>
        <p style={{ color: 'var(--text3)' }}>문서 페이지로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>문서 업로드</h1>
      <p style={{ color: 'var(--text3)', marginBottom: 32, fontSize: '0.9rem' }}>
        아카이브에 문서를 추가합니다. 업로드자 정보는 자동으로 기록됩니다.
      </p>

      {/* Uploader info */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        marginBottom: 24,
        border: '1px solid var(--border)'
      }}>
        {user?.photoURL
          ? <img src={user.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          : <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent-bg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent2)', fontWeight: 700
            }}>{user?.email?.[0]?.toUpperCase()}</div>
        }
        <div>
          <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{user?.displayName || user?.email}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>업로드 이력에 자동 기록됩니다</div>
        </div>
        <span className="badge badge-green" style={{ marginLeft: 'auto' }}>인증된 사용자</span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent)' : file ? 'var(--green)' : 'var(--border2)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: dragOver ? 'var(--accent-bg)' : file ? 'var(--green-bg)' : 'var(--surface)'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
            accept="*/*"
          />

          {file ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{getFileEmoji(file.name.split('.').pop())}</div>
              <div style={{ fontWeight: 600, color: 'var(--text)' }}>{file.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text3)', marginTop: 4 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null) }}
                style={{
                  marginTop: 10, fontSize: '0.8rem', color: 'var(--red)',
                  background: 'none', textDecoration: 'underline'
                }}
              >파일 변경</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📂</div>
              <div style={{ fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                파일을 드래그하거나 클릭하여 선택
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>
                PDF, 이미지, Word, Excel, PowerPoint 등 최대 50MB
              </div>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            제목 <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="문서 제목"
            style={{ width: '100%', padding: '10px 14px' }}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
            설명
          </label>
          <textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="문서에 대한 간단한 설명 (선택)"
            rows={3}
            style={{ width: '100%', padding: '10px 14px', resize: 'vertical' }}
          />
        </div>

        {/* Category + Tags row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
              카테고리
            </label>
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}
            >
              {CATEGORIES.filter(c => c !== '전체').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: '0.875rem' }}>
              태그 <span style={{ color: 'var(--text3)', fontWeight: 400' }}>(쉼표로 구분)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="예: 서버, 배포, AWS"
              style={{ width: '100%', padding: '10px 14px' }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--red-bg)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--red)',
            fontSize: '0.875rem'
          }}>{error}</div>
        )}

        {/* Progress */}
        {uploading && (
          <div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 6, fontSize: '0.8rem', color: 'var(--text3)'
            }}>
              <span>업로드 중...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-ghost"
            disabled={uploading}
          >취소</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !file}
          >
            {uploading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />업로드 중...</>
            ) : '업로드'}
          </button>
        </div>
      </form>
    </div>
  )
}

function getFileEmoji(type) {
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📋', pptx: '📋', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
    mp4: '🎬', mp3: '🎵', zip: '📦', txt: '📃'
  }
  return map[type?.toLowerCase()] || '📁'
}
