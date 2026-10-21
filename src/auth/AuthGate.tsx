import { useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from './firebase'

export function AuthGate({ children }: { children: (user: User | null, signOutUser?: () => Promise<void>, requestLogin?: () => void) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('ongyeol-local-mode') === 'true')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, (nextUser) => { setUser(nextUser); setLoading(false) })
  }, [])

  async function googleLogin() {
    if (!firebaseAuth) return
    setError('')
    try { await signInWithPopup(firebaseAuth, new GoogleAuthProvider()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Google 로그인에 실패했습니다.') }
  }

  if (!firebaseConfigured) return children(null)
  if (localMode) return children(user, firebaseAuth && user ? () => signOut(firebaseAuth!) : undefined, () => { localStorage.removeItem('ongyeol-local-mode'); setLocalMode(false) })
  if (loading) return <main className="splash">로그인 상태를 확인하는 중…</main>
  if (user) return children(user, () => signOut(firebaseAuth!))
  return <main className="auth-page"><section className="auth-card card"><span className="eyebrow">온결 계정</span><h1>로그인</h1><p>Google 계정은 Firebase Authentication으로 확인합니다. 식사 기록은 로그인 여부와 관계없이 현재 브라우저에만 저장됩니다.</p>{error && <p className="error" role="alert">{error}</p>}<button className="google-button" type="button" onClick={() => void googleLogin()}>Google로 계속하기</button><button className="text-button" type="button" onClick={() => { localStorage.setItem('ongyeol-local-mode', 'true'); setLocalMode(true) }}>로그인 없이 이 기기에서 사용</button></section></main>
}
