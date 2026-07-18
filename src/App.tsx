import { HashRouter, Routes, Route, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext.tsx'
import { LoginPage } from './pages/Login.tsx'
import { MapPage } from './pages/Map.tsx'
import { RegisterPage } from './pages/Register.tsx'
import { ComparisonPage } from './pages/Comparison.tsx'
import { DashboardPage } from './pages/Dashboard.tsx'
import { ProfilePage } from './pages/Profile.tsx'

const TABS: [string, string, string][] = [
  ['◧', '지도', '/map'],
  ['✎', '등록', '/register'],
  ['▤', '비교', '/comparison'],
  ['◨', '통계', '/dashboard'],
  ['◔', '내정보', '/me'],
]

function TabBar() {
  const { pathname } = useLocation()
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 78, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(12px)', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'flex-start', padding: '10px 14px 0', boxSizing: 'border-box', zIndex: 10 }}>
      {TABS.map(([icon, label, to]) => {
        const active = pathname === to
        return (
          <NavLink key={to} to={to} style={{ flex: 1, textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: active ? '#15803D' : '#9CA3AF' }}>
            <span style={{ fontSize: 19 }}>{icon}</span>
            <span style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

/** 인증된 사용자만 접근하는 레이아웃(탭바 포함). 미인증이면 로그인으로. */
function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user) return <Navigate to="/login" replace />
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}

/** 로그인 화면 — 이미 인증됐으면 지도로. */
function LoginRoute() {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (user) return <Navigate to="/map" replace />
  return <LoginPage />
}

function Splash() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803D', fontSize: 15, fontWeight: 700 }}>
      고루고루농 불러오는 중…
    </div>
  )
}

function Frame() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px 0', boxSizing: 'border-box' }}>
      <div style={{ position: 'relative', width: 390, height: 844, background: '#F8FAF9', borderRadius: 44, boxShadow: '0 24px 70px rgba(17,24,39,.28)', overflow: 'hidden', border: '1px solid rgba(0,0,0,.06)' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedLayout />}>
              <Route path="/map" element={<MapPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/me" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Frame />
      </HashRouter>
    </AuthProvider>
  )
}
