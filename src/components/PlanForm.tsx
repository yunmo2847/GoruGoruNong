import { useMemo, useState } from 'react'
import { api } from '../api.ts'
import { Field, inputStyle, primaryBtn } from '../ui.tsx'
import { pyeongToHa, haToPyeong } from '../lib/units.ts'
import sigungu from '../data/sigungu.json'
import cropData from '../data/cropSuitability.json'

interface FormState {
  region: string
  crop: string
  area: string
  plant: string
  harvest: string
}
const EMPTY: FormState = { region: '', crop: '', area: '', plant: '', harvest: '' }

export function PlanForm({ onDone }: { onDone: (summary: string) => void }) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errs, setErrs] = useState<Partial<Record<keyof FormState, string>>>({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  const regions = useMemo(
    () => [...sigungu.regions].sort((a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name)),
    [],
  )
  const crops = cropData.crops

  const set = (k: keyof FormState, v: string) => {
    setForm((s) => ({ ...s, [k]: v }))
    setErrs((s) => ({ ...s, [k]: '' }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.region) next.region = '시군구를 선택해 주세요.'
    if (!form.crop) next.crop = '작물을 선택해 주세요.'
    const pyeong = parseFloat(form.area)
    if (!form.area || isNaN(pyeong) || pyeong <= 0) next.area = '0보다 큰 면적을 입력해 주세요.'
    if (form.plant && form.harvest && form.harvest <= form.plant) next.harvest = '수확시기는 정식시기 이후여야 합니다.'
    if (Object.keys(next).length) {
      setErrs(next)
      return
    }
    setBusy(true)
    setServerError('')
    try {
      const { plan } = await api.createPlan({
        region: form.region,
        crop: form.crop,
        area: pyeongToHa(pyeong), // 서버는 항상 ha 기준
        plant: form.plant || undefined,
        harvest: form.harvest || undefined,
      })
      onDone(`${plan.region} · ${plan.crop} · ${haToPyeong(plan.area).toLocaleString()}평`)
      setForm(EMPTY)
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <Field label="시군구" error={errs.region}>
        <select value={form.region} onChange={(e) => set('region', e.target.value)} style={inputStyle(!!errs.region)}>
          <option value="">시군구 선택 (전국 {regions.length}곳)</option>
          {regions.map((r) => (
            <option key={r.code} value={r.name}>
              {r.name} ({r.province})
            </option>
          ))}
        </select>
      </Field>
      <Field label="작물" error={errs.crop}>
        <select value={form.crop} onChange={(e) => set('crop', e.target.value)} style={inputStyle(!!errs.crop)}>
          <option value="">작물 선택 ({crops.length}종)</option>
          {crops.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} — {c.group}
            </option>
          ))}
        </select>
      </Field>
      <Field label="재배면적 (평)" error={errs.area}>
        <input type="number" min="0" step="1" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="예: 3,780" style={inputStyle(!!errs.area)} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="정식시기">
          <input type="month" value={form.plant} onChange={(e) => set('plant', e.target.value)} style={inputStyle()} />
        </Field>
        <Field label="수확시기" error={errs.harvest}>
          <input type="month" value={form.harvest} onChange={(e) => set('harvest', e.target.value)} style={inputStyle(!!errs.harvest)} />
        </Field>
      </div>
      {serverError && <div style={{ fontSize: 12.5, color: '#B91C1C' }}>{serverError}</div>}
      <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.6 : 1 }}>
        {busy ? '등록 중…' : '재배계획 등록'}
      </button>
    </form>
  )
}
