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
function useGlobalChatNotification(user) {
  const location = useLocation()
  const locationRef = useRef(location.pathname)

  // location 바뀌어도 ref만 업데이트 (재구독 방지)
  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!user?.email) return

    // 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // 처음 마운트 시 기존 메시지 무시
    let isInitialLoad = true

    const q = query(
      collection(db, 'chat_global'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const unsub = onSnapshot(q, snap => {
      // 첫 스냅샷은 무시 (기존 메시지 added 방지)
      if (isInitialLoad) {
        isInitialLoad = false
        return
      }

      snap.docChanges().forEach(change => {
        if (change.type !== 'added') return

        const msg = change.doc.data()

        // 내가 보낸 메시지 무시
        if (msg.senderEmail === user.email) return

        // 채팅 페이지 보고 있으면 무시
        if (locationRef.current.includes('chat')) return

        // 브라우저 알림
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`💬 ${msg.senderName || '알 수 없음'}`, {
            body: msg.text,
            icon: '/n2soft-archive/favicon.svg',
            tag: 'chat-global'
          })
        }
      })
    })

    return unsub
  // user.email 바뀔 때만 재구독 (location 제거!)
  }, [user?.email])
}

export default function App() {
  const { isAuthenticated, user, userInfo } = useAuth()

  // 온라인 상태 추적
  useOnlineStatus(isAuthenticated ? user : null, userInfo)

  // 전역 채팅 알림
  useGlobalChatNotification(isAuthenticated ? user : null)

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
