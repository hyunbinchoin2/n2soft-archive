import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getDocuments, updateDocument, deleteDocument,
  incrementViewCount, addComment, getComments,
  deleteComment, CATEGORIES
} from '../services/archiveService'

export default function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [doc, setDoc]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: '', tags: ''
  })

  useEffect(() => {
    Promise.all([
      getDocuments(),
      getComments(id)
    ]).then(([docs, cmts]) => {
      const found = docs.find(d => d.id === id)
      setDoc(found || null)
      setComments(cmts)
      if (found) {
        setForm({
          title: found.title || '',
          description: found.description || '',
          category: found.category || '기타',
          tags: found.tags?.join(', ') || ''
        })
        incrementViewCount(id).catch(() => {})
      }
    }).finally(() => setLoading(false))
  }, [id])

  const handleUpdate = async () => {
    await updateDocument(id, {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
    })
    setDoc(prev => ({ ...prev, ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }))
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    setDeleting(true)
    await deleteDocument(id, doc.storagePath)
    navigate('/')
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const newComment = await addComment(id, 'document', commentText.trim(), user)
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

  const isOwner = user?.uid === doc?.uploader?.uid

  if (loading) return (
    <div className="page-container">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 60, marginBottom: 12 }} />
      ))}
    </div>
  )

  if (!doc) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--text3)' }}>문서를 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ marginTop: 16 }}>홈으로</button>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 760 }}>
      <button onClick={() => navigate(-1)} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: 'var(--text3)', fontSize: '0.875rem',
        background: 'none', marginBottom: 24, cursor: 'pointer'
      }}>← 뒤로가기</button>

      {/* 문서 정보 */}
      <div className="card" style={{ marginBottom: 20 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>문서 수정</h2>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="제목" style={{ width: '100%', padding: '10px 14px' }} />
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="설명" rows={3} style={{ width: '100%', padding: '10px 14px', resize: 'vertical' }} />
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
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '3rem', lineHeight: 1 }}>{getFileEmoji(doc.fileType)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span className="badge badge-blue">{doc.fileType?.toUpperCase()}</span>
                  <span className="badge badge-blue">{doc.category}</span>
                </div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>{doc.title}</h1>
                {doc.description && (
                  <p style={{ color: 'var(--text2)', lineHeight: 1.6, fontSize: '0.9rem' }}>{doc.description}</p>
                )}
                {doc.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {doc.tags.map(t => <span key={t} className="tag">#{t}</span>)}
                  </div>
                )}
              </div>
            </div>

            <hr className="divider" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--text3)', flexWrap: 'wrap' }}>
                <span>👁 {doc.viewCount || 0}회</span>
                <span>📦 {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                <span>👤 {doc.uploader?.name}</span>
              </div>
              {isOwner && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    ✏️ 수정
                  </button>
                  <button onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    🗑 삭제
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 다운로드 */}
      <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer"
        className="btn btn-primary" style={{ display: 'inline-flex', marginBottom: 24, textDecoration: 'none' }}>
        ⬇️ 파일 다운로드
      </a>

      {/* 업로드 이력 */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>업로드 이력</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(doc.uploadHistory || []).map((h, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'center',
              padding: '10px 14px', background: 'var(--surface)',
              borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              flexWrap: 'wrap'
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{h.name}</span>
                <span style={{ color: 'var(--text3)', fontSize: '0.8rem', marginLeft: 8 }}>{h.email}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                {h.uploadedAt ? new Date(h.uploadedAt).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                }) : ''}
              </div>
              <span className="badge badge-blue">{h.action === 'upload' ? '최초 업로드' : h.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 댓글 */}
      <div className="card">
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>
          댓글 {comments.length}개
        </h2>

        {comments.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '20px',
            color: 'var(--text3)', fontSize: '0.875rem',
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1px dashed var(--border)', marginBottom: 16
          }}>첫 번째 댓글을 남겨보세요!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {comments.map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: 10, padding: '12px 14px',
                background: 'var(--surface)', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)'
              }}>
                <Avatar user={c.author} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.author?.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text3)', marginLeft: 8 }}>
                        {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                    {c.author?.uid === user?.uid && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        style={{ fontSize: '0.75rem', color: 'var(--red)', background: 'none', cursor: 'pointer' }}>
                        삭제
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text)', marginTop: 4, lineHeight: 1.6 }}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 댓글 입력 */}
        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar user={{ photoURL: user?.photoURL, name: user?.displayName || user?.email }} size={32} />
          <div style={{ flex: 1 }}>
            <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="댓글을 입력하세요..." rows={2}
              style={{ width: '100%', padding: '10px 14px', resize: 'none', marginBottom: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary"
                disabled={submittingComment || !commentText.trim()}
                style={{ fontSize: '0.85rem', padding: '7px 16px' }}>
                {submittingComment ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
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
        color: 'var(--accent2)', fontWeight: 700, fontSize: size * 0.4
      }}>{initial}</div>
}

function getFileEmoji(type) {
  const map = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    ppt: '📋', pptx: '📋', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
    gif: '🖼️', mp4: '🎬', mp3: '🎵', zip: '📦', txt: '📃'
  }
  return map[type?.toLowerCase()] || '📁'
}