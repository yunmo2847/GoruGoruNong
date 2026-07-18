import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.tsx'
import { Field, inputStyle, primaryBtn } from '../ui.tsx'

export function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('demo@sugub.kr')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <Field label="이메일">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} autoComplete="email" />
      </Field>
      <Field label="비밀번호" error={error}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle(!!error)} autoComplete="current-password" />
      </Field>
      <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
        {busy ? '로그인 중…' : '로그인'}
      </button>
      <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
        계정이 없으신가요?{' '}
        <button type="button" onClick={onSwitch} style={{ all: 'unset', cursor: 'pointer', color: '#15803D', fontWeight: 700 }}>
          회원가입
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: '#9CA3AF', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
        데모 계정이 미리 입력되어 있습니다<br />demo@sugub.kr / demo1234
      </div>
    </form>
  )
}
