// src/hooks/useOnlineStatus.js
// 로그인 중인 사용자의 lastSeen을 주기적으로 업데이트

import { useEffect } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../services/firebase'

const HEARTBEAT_INTERVAL = 60 * 1000 // 1분마다 업데이트
const ONLINE_THRESHOLD   = 5 * 60 * 1000 // 5분 이내 = 온라인

export function useOnlineStatus(user, userInfo) {
  useEffect(() => {
    if (!user?.email) return

    const updatePresence = async () => {
      try {
        await setDoc(
          doc(db, 'allowedUsers', user.email),
          {
            lastSeen: serverTimestamp(),
            name: userInfo?.name || user.displayName || user.email
          },
          { merge: true }
        )
      } catch (err) {
        console.warn('presence update failed:', err)
      }
    }

    // 즉시 1회 실행
    updatePresence()

    // 이후 1분마다 반복
    const interval = setInterval(updatePresence, HEARTBEAT_INTERVAL)

    // 탭 닫거나 이동 시 오프라인 처리
    const handleVisibilityChange = () => {
      if (!document.hidden) updatePresence()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.email, userInfo?.name])
}

export function isOnline(lastSeen) {
  if (!lastSeen) return false
  const ts = lastSeen?.toDate ? lastSeen.toDate() : new Date(lastSeen)
  return Date.now() - ts.getTime() < ONLINE_THRESHOLD
}
