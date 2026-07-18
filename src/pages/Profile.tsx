import { useEffect, useState } from 'react'
import farmImg from '../assets/farm.png'
import { api, type Plan } from '../api.ts'
import { useAuth } from '../auth/AuthContext.tsx'
import { computeRiskTier } from '../lib/riskFormula.ts'
import { TierBadge, TIER_COLORS, fmtPyeong } from '../ui.tsx'
import { haToPyeong } from '../lib/units.ts'
import baselineFile from '../data/baseline.json'

const baselineMap = new Map(
  (baselineFile.rows as Array<{ region: string; crop: string; baselineHa: number }>).map((r) => [`${r.region}|${r.crop}`, r.baselineHa]),
)

export function ProfilePage() {
  const { user, logout } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api.myPlans().then((r) => setPlans(r.plans)).catch(() => setPlans([]))
  }, [])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setDeleteError('')
    try {
      await api.deletePlan(id)
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } catch (e) {
      setDeleteError((e as Error).message)
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  const totalPyeong = haToPyeong(plans.reduce((s, p) => s + p.area, 0))
  const enriched = plans.map((p) => {
    const base = baselineMap.get(`${p.region}|${p.crop}`) ?? 0
    return { ...p, ...computeRiskTier(p.area, base) }
  })
  const alertCount = enriched.filter((p) => p.tier !== '정상').length

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={{ position: 'relative', height: 208, flex: 'none', overflow: 'hidden' }}>
        <img src={farmImg} alt="농장" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(6,20,10,.4),rgba(6,20,10,.62))' }} />
        <div style={{ position: 'relative', padding: '56px 22px 0', color: '#fff' }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>내 정보</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px 96px', marginTop: -28, position: 'relative' }}>
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 18, padding: 18, boxShadow: '0 6px 20px rgba(17,24,39,.1)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 99, background: '#15803D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>{user?.name?.[0] ?? '?'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{user?.name} 님</div>
            <div style={{ fontSize: 12.5, color: '#6B7280' }}>{user?.email}</div>
          </div>
          <span style={{ padding: '4px 11px', borderRadius: 99, background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>인증 농가</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 14 }}>
          <Stat value={plans.length} label="등록 계획" color="#15803D" />
          <Stat value={alertCount} label="경보" color="#EA580C" />
          <Stat value={totalPyeong.toLocaleString()} label="총 평" color="#111827" />
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, margin: '22px 0 10px' }}>내 재배계획</div>
        {deleteError && <div style={{ fontSize: 12.5, color: '#B91C1C', marginBottom: 8 }}>{deleteError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {enriched.length === 0 && <div style={{ fontSize: 13, color: '#9CA3AF' }}>아직 등록한 재배계획이 없습니다.</div>}
          {enriched.map((r) => {
            const confirming = confirmingId === r.id
            const deleting = deletingId === r.id
            return (
              <div key={r.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderLeft: `4px solid ${TIER_COLORS[r.tier].border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{r.region} <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>{r.crop}</span></div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmtPyeong(r.area)}</div>
                </div>
                {confirming ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
                    <span style={{ fontSize: 11.5, color: '#B91C1C', whiteSpace: 'nowrap' }}>삭제할까요?</span>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting}
                      style={{ border: 'none', background: '#B91C1C', color: '#fff', cursor: 'pointer', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, opacity: deleting ? 0.6 : 1 }}
                    >
                      {deleting ? '삭제 중…' : '삭제'}
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      disabled={deleting}
                      style={{ border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280', cursor: 'pointer', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600 }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <>
                    <TierBadge tier={r.tier} size="sm" />
                    <button
                      onClick={() => setConfirmingId(r.id)}
                      aria-label={`${r.region} ${r.crop} 삭제`}
                      style={{ border: 'none', background: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4, fontSize: 15, flex: 'none' }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
        <button onClick={logout} style={{ width: '100%', marginTop: 20, border: '1px solid #FECACA', background: '#fff', color: '#B91C1C', cursor: 'pointer', padding: 13, borderRadius: 12, fontSize: 14, fontWeight: 600 }}>로그아웃</button>
      </div>
    </div>
  )
}

function Stat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  )
}
