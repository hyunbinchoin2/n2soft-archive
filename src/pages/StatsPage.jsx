// src/pages/StatsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../services/firebase'

export default function StatsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats]     = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [docSnap, qaSnap] = await Promise.all([
        getDocs(query(collection(db, 'documents'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'questions'), orderBy('createdAt', 'desc')))
      ])

      const docs = docSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      const qas  = qaSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // ── 업로드 랭킹 ──────────────────────────────────
      const uploadMap = {}
      docs.forEach(d => {
        const name = d.uploader?.name || d.uploader?.email || '알 수 없음'
        const email = d.uploader?.email || ''
        if (!uploadMap[email]) uploadMap[email] = { name, email, count: 0, items: [] }
        uploadMap[email].count++
        uploadMap[email].items.push(d.title)
      })
      const uploadRank = Object.values(uploadMap).sort((a, b) => b.count - a.count)

      // ── 질문 랭킹 ────────────────────────────────────
      const questionMap = {}
      qas.forEach(q => {
        const name = q.author?.name || q.author?.email || '알 수 없음'
        const email = q.author?.email || ''
        if (!questionMap[email]) questionMap[email] = { name, email, count: 0 }
        questionMap[email].count++
      })
      const questionRank = Object.values(questionMap).sort((a, b) => b.count - a.count)

      // ── 답변 랭킹 ────────────────────────────────────
      const answerMap = {}
      qas.forEach(q => {
        (q.answers || []).forEach(a => {
          const name = a.author?.name || a.author?.email || '알 수 없음'
          const email = a.author?.email || ''
          if (!answerMap[email]) answerMap[email] = { name, email, count: 0 }
          answerMap[email].count++
        })
      })
      const answerRank = Object.values(answerMap).sort((a, b) => b.count - a.count)

      // ── 조회수 TOP 문서 ──────────────────────────────
      const topViewed = [...docs].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 5)

      // ── 종합 활동 랭킹 (업로드 2점 + 질문 1점 + 답변 1점) ──
      const totalMap = {}
      const addScore = (email, name, score, type) => {
        if (!email) return
        if (!totalMap[email]) totalMap[email] = { name, email, score: 0, upload: 0, question: 0, answer: 0 }
        totalMap[email].score += score
        totalMap[email][type] += 1
        if (name) totalMap[email].name = name
      }
      docs.forEach(d => addScore(d.uploader?.email, d.uploader?.name, 2, 'upload'))
      qas.forEach(q => {
        addScore(q.author?.email, q.author?.name, 1, 'question')
        ;(q.answers || []).forEach(a => addScore(a.author?.email, a.author?.name, 1, 'answer'))
      })
      const totalRank = Object.values(totalMap).sort((a, b) => b.score - a.score)

      // ── 전체 요약 ────────────────────────────────────
      const summary = {
        totalDocs: docs.length,
        totalQA: qas.length,
        totalAnswers: qas.reduce((acc, q) => acc + (q.answers?.length || 0), 0),
        totalViews: docs.reduce((acc, d) => acc + (d.viewCount || 0), 0),
        totalMembers: new Set([
          ...docs.map(d => d.uploader?.email),
          ...qas.map(q => q.author?.email)
        ].filter(Boolean)).size
      }

      setStats({ uploadRank, questionRank, answerRank, topViewed, totalRank, summary })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 32 }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 240 }} />)}
      </div>
    </div>
  )

  if (!stats) return null

  const { uploadRank, questionRank, answerRank, topViewed, totalRank, summary } = stats

  return (
    <div className="page-container">
      {/* 헤더 */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 4 }}>활동 통계</h1>
        <p style={{ color: 'var(--text3)', fontSize: '0.9rem' }}>N2SOFT Archive 기여 현황</p>
      </div>

      {/* 요약 카드 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 36
      }}>
        {[
          { label: '총 문서', value: summary.totalDocs, emoji: '📄' },
          { label: 'Q&A',    value: summary.totalQA,   emoji: '💬' },
          { label: '총 답변', value: summary.totalAnswers, emoji: '✅' },
          { label: '총 조회수', value: summary.totalViews, emoji: '👁' },
          { label: '기여 멤버', value: summary.totalMembers, emoji: '👥' }
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{s.emoji}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent2)', lineHeight: 1 }}>
              {s.value.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 종합 랭킹 (왕관) */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>🏆 종합 활동 랭킹</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 20 }}>
          업로드 2점 + 질문 1점 + 답변 1점 기준
        </p>
        {totalRank.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {totalRank.slice(0, 10).map((u, i) => (
              <div key={u.email} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                background: i === 0 ? 'rgba(251,191,36,0.06)' : i === 1 ? 'rgba(180,180,180,0.06)' : i === 2 ? 'rgba(180,100,36,0.06)' : 'var(--surface)',
                borderRadius: 'var(--radius)',
                border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.25)' : i === 1 ? 'rgba(180,180,180,0.2)' : i === 2 ? 'rgba(180,100,36,0.2)' : 'var(--border)'}`
              }}>
                {/* 순위 */}
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {i === 0 ? <span style={{ fontSize: '1.3rem' }}>👑</span>
                   : i === 1 ? <span style={{ fontSize: '1.1rem' }}>🥈</span>
                   : i === 2 ? <span style={{ fontSize: '1.1rem' }}>🥉</span>
                   : <span style={{ fontSize: '0.85rem', color: 'var(--text3)', fontWeight: 600 }}>{i + 1}</span>
                  }
                </div>

                {/* 아바타 */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: i === 0 ? 'rgba(251,191,36,0.2)' : 'var(--accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1rem',
                    color: i === 0 ? 'var(--amber)' : 'var(--accent2)'
                  }}>
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  {i === 0 && (
                    <span style={{
                      position: 'absolute', top: -10, left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.9rem'
                    }}>👑</span>
                  )}
                </div>

                {/* 이름 + 이메일 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: '0.9rem',
                    color: i === 0 ? 'var(--amber)' : 'var(--text)'
                  }}>{u.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 1 }}>
                    📄 {u.upload} &nbsp;💬 {u.question} &nbsp;✅ {u.answer}
                  </div>
                </div>

                {/* 점수 */}
                <div style={{
                  fontWeight: 800, fontSize: '1.1rem',
                  color: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--text2)' : i === 2 ? '#cd7f32' : 'var(--text3)'
                }}>
                  {u.score}점
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3개 카테고리 랭킹 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, marginBottom: 28
      }}>
        {/* 업로드 랭킹 */}
        <RankCard
          title="📤 업로드 랭킹"
          desc="문서를 가장 많이 올린 사람"
          data={uploadRank.slice(0, 5)}
          unit="개"
        />

        {/* 질문 랭킹 */}
        <RankCard
          title="❓ 질문 랭킹"
          desc="질문을 가장 많이 한 사람"
          data={questionRank.slice(0, 5)}
          unit="건"
        />

        {/* 답변 랭킹 */}
        <RankCard
          title="💡 답변 랭킹"
          desc="답변을 가장 많이 한 사람"
          data={answerRank.slice(0, 5)}
          unit="개"
        />
      </div>

      {/* 인기 문서 TOP 5 */}
      <div className="card">
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>🔥 인기 문서 TOP 5</h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 20 }}>조회수 기준</p>
        {topViewed.length === 0 ? <EmptyState /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topViewed.map((doc, i) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/documents/${doc.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', textAlign: 'left',
                  cursor: 'pointer', transition: 'all 0.15s', width: '100%'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border2)'
                  e.currentTarget.style.background = 'var(--surface2)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--surface)'
                }}
              >
                <span style={{
                  width: 24, textAlign: 'center', flexShrink: 0,
                  fontSize: '0.85rem', fontWeight: 700,
                  color: i === 0 ? 'var(--amber)' : 'var(--text3)'
                }}>
                  {i === 0 ? '🔥' : `${i + 1}`}
                </span>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{getFileEmoji(doc.fileType)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500, fontSize: '0.875rem', color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{doc.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>
                    {doc.uploader?.name} · {doc.category}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.875rem', fontWeight: 600,
                  color: i === 0 ? 'var(--amber)' : 'var(--text2)',
                  flexShrink: 0
                }}>
                  👁 {doc.viewCount || 0}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RankCard({ title, desc, data, unit }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 16 }}>{desc}</p>
      {data.length === 0 ? <EmptyState /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((u, i) => (
            <div key={u.email} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px',
              background: i === 0 ? 'rgba(251,191,36,0.06)' : 'var(--surface)',
              borderRadius: 8,
              border: `1px solid ${i === 0 ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`
            }}>
              {/* 순위 */}
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text3)', fontWeight: 600 }}>{i + 1}</span>
                )}
              </div>

              {/* 아바타 */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: i === 0 ? 'rgba(251,191,36,0.2)' : 'var(--accent-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.85rem',
                  color: i === 0 ? 'var(--amber)' : 'var(--accent2)'
                }}>
                  {u.name?.[0]?.toUpperCase() || '?'}
                </div>
                {i === 0 && (
                  <span style={{
                    position: 'absolute', top: -9, left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.75rem'
                  }}>👑</span>
                )}
              </div>

              {/* 이름 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 500, fontSize: '0.875rem',
                  color: i === 0 ? 'var(--amber)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>{u.name}</div>
              </div>

              {/* 카운트 */}
              <div style={{
                fontWeight: 700, fontSize: '0.95rem',
                color: i === 0 ? 'var(--amber)' : 'var(--text2)',
                flexShrink: 0
              }}>
                {u.count}{unit}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      textAlign: 'center', padding: '20px',
      color: 'var(--text3)', fontSize: '0.85rem'
    }}>아직 데이터가 없습니다</div>
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
