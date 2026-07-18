// 렌더/런타임 오류 격리 경계 — 하위 트리에서 예외가 나도 앱 전체가 흰 화면으로 죽지 않게 한다.
// 지도 상세 패널처럼 네트워크·데이터 의존 영역에서 특정 타일 하나의 오류가 SPA 전체를 무너뜨리는 것을 방지.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { card } from '../ui.tsx'

interface Props {
  children: ReactNode
  label?: string
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] 하위 렌더 오류:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ ...card, marginTop: 14, color: '#B91C1C', fontSize: 13, lineHeight: 1.6 }}>
          {this.props.label ?? '이 항목을 표시하는 중 문제가 발생했습니다.'}
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
            다른 지역을 선택하면 계속 사용할 수 있습니다.
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
