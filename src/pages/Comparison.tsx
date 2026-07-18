import { headerBar, scrollArea } from '../ui.tsx'
import { NationwideComparison } from '../components/NationwideComparison.tsx'

export function ComparisonPage() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', animation: 'mfade .25s ease-out' }}>
      <div style={headerBar}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.02em' }}>전국 재배면적 비교</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>전 지역·전 작물 등록면적을 평년값과 한눈에</div>
      </div>
      <div style={scrollArea}>
        <NationwideComparison />
      </div>
    </div>
  )
}
