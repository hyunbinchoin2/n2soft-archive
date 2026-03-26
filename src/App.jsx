// src/App.jsx
import { useEffect, useRef } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from './services/firebase'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import SearchResultsPage from './pages/SearchResultsPage'
import UploadPage from './pages/UploadPage'
import DocumentsPage from './pages/DocumentsPage'
import QAPage from './pages/QAPage'
import QuestionDetailPage from './pages/QuestionDetailPage'
import AskQuestionPage from './pages/AskQuestionPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import AdminPage from './pages/AdminPage'
import StatsPage from './pages/StatsPage'
import ChatPage from './pages/ChatPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function FullPageSpinner() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16
    }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--text3)', fontSize: '0.875rem' }}>불러오는 중...</p>
    </div>
  )
}

// ─── 전역 채팅 알림 훅 ────────────────────────────────────────
function useGlobalChatNotification(user, userInfo) {
  const location = useLocation()
  const lastMsgId = useRef(null) // 중복 알림 방지

  useEffect(() => {
    if (!user?.email) return

    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // 전체 채팅 실시간 감지
    const q = query(
      collection(db, 'chat_global'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const unsub = onSnapshot(q, snap => {
      if (snap.empty) return

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return

        const msg = change.doc.data()
        const msgId = change.doc.id

        // 중복 방지
        if (msgId === lastMsgId.current) return
        lastMsgId.current = msgId

        // 내가 보낸 메시지는 알림 안 함
        if (msg.senderEmail === user.email) return

        // 채팅 페이지 보고 있으면 알림 안 함
        if (location.pathname.includes('chat')) return

        // 브라우저 알림
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💬 ${msg.senderName || '알 수 없음'}`, {
            body: msg.text,
            icon: '/n2soft-archive/favicon.svg',
            tag: 'chat-global' // 같은 tag면 기존 알림 대체
          })
        }
      })
    })

    return unsub
  }, [user?.email, location.pathname])
}

export default function App() {
  const { isAuthenticated, user, userInfo } = useAuth()

  // 온라인 상태 추적
  useOnlineStatus(isAuthenticated ? user : null, userInfo)

  // 전역 채팅 알림
  useGlobalChatNotification(isAuthenticated ? user : null, userInfo)

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <ProtectedRoute><HomePage /></ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute><SearchResultsPage /></ProtectedRoute>
        } />
        <Route path="/documents" element={
          <ProtectedRoute><DocumentsPage /></ProtectedRoute>
        } />
        <Route path="/documents/:id" element={
          <ProtectedRoute><DocumentDetailPage /></ProtectedRoute>
        } />
        <Route path="/upload" element={
          <ProtectedRoute><UploadPage /></ProtectedRoute>
        } />

        <Route path="/qa" element={
          <ProtectedRoute><QAPage /></ProtectedRoute>
        } />
        <Route path="/qa/ask" element={
          <ProtectedRoute><AskQuestionPage /></ProtectedRoute>
        } />
        <Route path="/qa/:id" element={
          <ProtectedRoute><QuestionDetailPage /></ProtectedRoute>
        } />

        <Route path="/stats" element={
          <ProtectedRoute><StatsPage /></ProtectedRoute>
        } />
        <Route path="/chat" element={
          <ProtectedRoute><ChatPage /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
