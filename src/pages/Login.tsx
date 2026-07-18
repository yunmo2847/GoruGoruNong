import { useState } from 'react'
import farmImg from '../assets/farm.png'
import { LoginForm } from '../components/LoginForm.tsx'
import { SignupForm } from '../components/SignupForm.tsx'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={{ position: 'relative', height: 288, flex: 'none', overflow: 'hidden' }}>
        <img src={farmImg} alt="농장 전경" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(6,20,10,.5) 0%,rgba(6,20,10,.18) 50%,rgba(248,250,249,.99) 100%)' }} />
        <div style={{ position: 'relative', padding: '58px 24px 0', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.22)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>고</span>
            <span style={{ fontSize: 17, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,.3)' }}>고루고루농</span>
          </div>
          <div style={{ marginTop: 20, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', textShadow: '0 1px 6px rgba(0,0,0,.35)' }}>
            {mode === 'login' ? '다시 오신 것을 환영합니다' : '농가 계정 만들기'}
          </div>
          <div style={{ fontSize: 13.5, opacity: 0.92, marginTop: 4, textShadow: '0 1px 4px rgba(0,0,0,.3)' }}>
            전국 농산물 수급 불균형을 한눈에
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 40px', marginTop: 0 }}>
        {mode === 'login' ? <LoginForm onSwitch={() => setMode('signup')} /> : <SignupForm onSwitch={() => setMode('login')} />}
      </div>
    </div>
  )
}
