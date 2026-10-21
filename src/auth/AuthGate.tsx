import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth'
import { firebaseAuth, firebaseConfigured } from './firebase'

export function AuthGate({ children }: { children: (user: User | null, signOutUser?: () => Promise<void>, requestLogin?: () => void) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(firebaseConfigured)
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('ongyeol-local-mode') === 'true')
  const [register, setRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseAuth) return
    return onAuthStateChanged(firebaseAuth, (nextUser) => { setUser(nextUser); setLoading(false) })
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!firebaseAuth) return
    setError('')
    try {
      if (register) await createUserWithEmailAndPassword(firebaseAuth, email, password)
      else await signInWithEmailAndPassword(firebaseAuth, email, password)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '로그인하지 못했습니다.')
    }
  }

  async function googleLogin() {
    if (!firebaseAuth) return
    setError('')
    try { await signInWithPopup(firebaseAuth, new GoogleAuthProvider()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Google 로그인에 실패했습니다.') }
  }

  if (!firebaseConfigured) return children(null)
  if (localMode) return children(user, firebaseAuth && user ? () => signOut(firebaseAuth) : undefined, () => { localStorage.removeItem('ongyeol-local-mode'); setLocalMode(false) })
  if (loading) return <main className="splash">로그인 상태를 확인하는 중…</main>
  if (user) return children(user, () => signOut(firebaseAuth!))
  return <main className="auth-page"><section className="auth-card card"><span className="eyebrow">온결 계정</span><h1>{register ? '계정 만들기' : '로그인'}</h1><p>계정은 Firebase Authentication으로 관리됩니다. 현재 식사 기록은 이 브라우저에만 저장됩니다.</p><form className="stack" onSubmit={submit}><label>이메일<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>비밀번호<input type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary">{register ? '가입하고 시작하기' : '이메일로 로그인'}</button></form><button className="google-button" type="button" onClick={() => void googleLogin()}>Google로 계속하기</button><button className="text-button" type="button" onClick={() => setRegister((value) => !value)}>{register ? '이미 계정이 있어요' : '새 계정을 만들고 싶어요'}</button><button className="text-button" type="button" onClick={() => { localStorage.setItem('ongyeol-local-mode', 'true'); setLocalMode(true) }}>로그인 없이 이 기기에서 사용</button></section></main>
}
