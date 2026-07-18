import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { headerBar } from '../ui.tsx'
import { useAuth } from '../auth/AuthContext.tsx'
import { PlanForm } from '../components/PlanForm.tsx'

export function RegisterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [done, setDone] = useState<string | null>(null)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={headerBar}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>재배계획 등록</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>
          <b>{user?.name}</b> 님 소유로 저장되어 지도에 즉시 반영됩니다
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 96px' }}>
        {done ? (
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, padding: '34px 22px', textAlign: 'center', marginTop: 20, animation: 'mfade .25s ease-out' }}>
            <div style={{ width: 52, height: 52, borderRadius: 99, background: '#DCFCE7', color: '#15803D', fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>등록되었습니다</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{done}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => navigate('/map')} style={{ border: 'none', background: '#15803D', color: '#fff', cursor: 'pointer', padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>지도에서 확인</button>
              <button onClick={() => setDone(null)} style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#374151', cursor: 'pointer', padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700 }}>계속 등록</button>
            </div>
          </div>
        ) : (
          <PlanForm onDone={setDone} />
        )}
      </div>
    </div>
  )
}
