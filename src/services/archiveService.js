// src/services/archiveService.js
// Firestore CRUD + Storage 업로드 로직

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore'
import { deleteObject } from 'firebase/storage'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage'
import { db, storage } from './firebase'

// ─── 컬렉션 이름 ────────────────────────────────────────────
const DOCS_COL = 'documents'   // 업로드된 파일/문서
const QA_COL   = 'questions'   // 질문 & 답변

// ─── 문서 업로드 ─────────────────────────────────────────────
export async function uploadDocument(file, metadata, user, onProgress) {
  // 1. Storage에 파일 업로드
  const ext = file.name.split('.').pop()
  const storagePath = `documents/${Date.now()}_${file.name}`
  const storageRef = ref(storage, storagePath)
  const uploadTask = uploadBytesResumable(storageRef, file)

  const downloadURL = await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref)
        resolve(url)
      }
    )
  })

  // 2. Firestore에 메타데이터 저장 (업로드 이력 포함)
  const docData = {
    title: metadata.title || file.name,
    description: metadata.description || '',
    tags: metadata.tags || [],
    category: metadata.category || '기타',
    fileName: file.name,
    fileType: ext.toLowerCase(),
    fileSize: file.size,
    downloadURL,
    storagePath,
    uploader: {
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null
    },
    uploadHistory: [{
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      uploadedAt: new Date().toISOString(),
      action: 'upload'
    }],
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  const docRef = await addDoc(collection(db, DOCS_COL), docData)
  return { id: docRef.id, ...docData }
}

// ─── 문서 목록 조회 ─────────────────────────────────────────
export async function getDocuments(category = null) {
  let q = query(collection(db, DOCS_COL), orderBy('createdAt', 'desc'))
  if (category) {
    q = query(
      collection(db, DOCS_COL),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── 검색 (Firestore 전체 fetch 후 클라이언트 필터) ──────────
// 규모가 커지면 Algolia 또는 Firebase Extensions(Full-text search)로 교체 권장
// 검색어를 토큰으로 분리 (공백, 언더스코어, 하이픈 기준)
function tokenize(str) {
  return str.toLowerCase().replace(/[_\-\.]/g, ' ').split(/\s+/).filter(Boolean)
}

// 텍스트가 검색 토큰을 하나라도 포함하는지 확인
function matchesTokens(text, tokens) {
  if (!text) return false
  const normalized = text.toLowerCase().replace(/[_\-\.]/g, ' ')
  return tokens.some(token => normalized.includes(token))
}

export async function searchDocuments(keyword) {
  const kw = keyword.toLowerCase().trim()
  if (!kw) return []
  const tokens = tokenize(kw)

  const [docSnap, qaSnap] = await Promise.all([
    getDocs(query(collection(db, DOCS_COL), orderBy('createdAt', 'desc'))),
    getDocs(query(collection(db, QA_COL), orderBy('createdAt', 'desc')))
  ])

const docs = docSnap.docs
    .map(d => ({ id: d.id, type: 'document', ...d.data() }))
    .filter(d =>
      matchesTokens(d.title, tokens) ||
      matchesTokens(d.description, tokens) ||
      matchesTokens(d.category, tokens) ||
      matchesTokens(d.fileName, tokens) ||
      d.tags?.some(t => matchesTokens(t, tokens))
    )

  const qas = qaSnap.docs
    .map(d => ({ id: d.id, type: 'question', ...d.data() }))
    .filter(d =>
      matchesTokens(d.title, tokens) ||
      matchesTokens(d.body, tokens) ||
      d.tags?.some(t => matchesTokens(t, tokens)) ||
      d.answers?.some(a => matchesTokens(a.body, tokens))
    )
  return [...docs, ...qas]
}

// ─── 조회수 증가 ─────────────────────────────────────────────
export async function incrementViewCount(docId) {
  await updateDoc(doc(db, DOCS_COL, docId), {
    viewCount: increment(1)
  })
}

// ─── 질문 등록 ───────────────────────────────────────────────
export async function createQuestion(data, user) {
  const q = {
    title: data.title,
    body: data.body,
    tags: data.tags || [],
    category: data.category || '일반',
    author: {
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null
    },
    answers: [],
    viewCount: 0,
    status: 'open', // open | resolved
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, QA_COL), q)
  return { id: ref.id, ...q }
}

// ─── 질문 목록 조회 ─────────────────────────────────────────
export async function getQuestions() {
  const snap = await getDocs(
    query(collection(db, QA_COL), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── 단일 질문 조회 ─────────────────────────────────────────
export async function getQuestion(id) {
  const snap = await getDoc(doc(db, QA_COL, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

// ─── 답변 등록 ───────────────────────────────────────────────
export async function addAnswer(questionId, body, user) {
  const answer = {
    id: `ans_${Date.now()}`,
    body,
    author: {
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null
    },
    createdAt: new Date().toISOString(),
    isAccepted: false
  }
  await updateDoc(doc(db, QA_COL, questionId), {
    answers: arrayUnion(answer),
    updatedAt: serverTimestamp()
  })
  return answer
}

// ─── 답변 채택 (질문 작성자만) ────────────────────────────────
export async function acceptAnswer(questionId, answerId) {
  const qSnap = await getDoc(doc(db, QA_COL, questionId))
  if (!qSnap.exists()) return

  const answers = qSnap.data().answers.map(a => ({
    ...a,
    isAccepted: a.id === answerId
  }))

  await updateDoc(doc(db, QA_COL, questionId), {
    answers,
    status: 'resolved',
    updatedAt: serverTimestamp()
  })
}

// ─── 카테고리 목록 ───────────────────────────────────────────
export const CATEGORIES = [
  '전체', '엔투소프트', '이기종 전문', '저축은행', '공공마이데이터/스크래핑', '대출 정책', '개발', '디자인', '기획', '인사/총무', '기타'
]
// ─── 문서 수정 ───────────────────────────────────────────────
export async function updateDocument(docId, metadata) {
  await updateDoc(doc(db, DOCS_COL, docId), {
    title: metadata.title,
    description: metadata.description,
    category: metadata.category,
    tags: metadata.tags,
    updatedAt: serverTimestamp()
  })
}

// ─── 문서 삭제 ───────────────────────────────────────────────
export async function deleteDocument(docId, storagePath) {
  // Storage 파일 삭제
  try {
    const fileRef = ref(storage, storagePath)
    await deleteObject(fileRef)
  } catch (e) {
    console.warn('Storage 파일 삭제 실패 (이미 없을 수 있음)', e)
  }
  // Firestore 문서 삭제
  await deleteDoc(doc(db, DOCS_COL, docId))
}

// ─── 질문 수정 ───────────────────────────────────────────────
export async function updateQuestion(questionId, data) {
  await updateDoc(doc(db, QA_COL, questionId), {
    title: data.title,
    body: data.body,
    category: data.category,
    tags: data.tags,
    updatedAt: serverTimestamp()
  })
}

// ─── 질문 삭제 ───────────────────────────────────────────────
export async function deleteQuestion(questionId) {
  await deleteDoc(doc(db, QA_COL, questionId))
}

// ─── 댓글 컬렉션 ─────────────────────────────────────────────
const COMMENTS_COL = 'comments'

// 댓글 추가
export async function addComment(targetId, targetType, body, user) {
  const comment = {
    targetId,
    targetType, // 'document' | 'question'
    body,
    author: {
      uid: user.uid,
      name: user.displayName || user.email,
      email: user.email,
      photoURL: user.photoURL || null
    },
    createdAt: serverTimestamp()
  }
  const ref = await addDoc(collection(db, COMMENTS_COL), comment)
  return { id: ref.id, ...comment }
}

// 댓글 목록 조회
export async function getComments(targetId) {
  const snap = await getDocs(
    query(
      collection(db, COMMENTS_COL),
      where('targetId', '==', targetId),
      orderBy('createdAt', 'asc')
    )
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// 댓글 삭제
export async function deleteComment(commentId) {
  await deleteDoc(doc(db, COMMENTS_COL, commentId))
}