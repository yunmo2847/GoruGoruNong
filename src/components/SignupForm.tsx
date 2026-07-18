import { useState } from 'react'
import { useAuth } from '../auth/AuthContext.tsx'
import { Field, inputStyle, primaryBtn } from '../ui.tsx'

export function SignupForm({ onSwitch }: { onSwitch: () => void }) {
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await signup(email.trim(), name.trim(), password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <Field label="이메일">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle()} required autoComplete="email" />
      </Field>
      <Field label="이름">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle()} required />
      </Field>
      <Field label="비밀번호 (6자 이상)" error={error}>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle(!!error)} required autoComplete="new-password" />
      </Field>
      <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
        {busy ? '가입 중…' : '회원가입'}
      </button>
      <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
        이미 계정이 있으신가요?{' '}
        <button type="button" onClick={onSwitch} style={{ all: 'unset', cursor: 'pointer', color: '#15803D', fontWeight: 700 }}>
          로그인
        </button>
      </div>
    </form>
  )
}
