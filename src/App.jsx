// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
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

export default function App() {
  const { isAuthenticated } = useAuth()

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

        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
