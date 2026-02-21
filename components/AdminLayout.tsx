import Link from 'next/link'
import { useRouter } from 'next/router'
import useAuth from '../lib/useAuth'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useState, useEffect } from 'react'

const menuItems = [
  { href: '/admin/dashboard', label: '대시보드', icon: '📊' },
  { href: '/admin/members', label: '회원관리', icon: '👥' },
  { href: '/admin/register', label: '회원등록', icon: '➕' },
  { href: '/admin/attendance', label: '출석관리', icon: '✅' },
  { href: '/admin/lockers', label: '라커관리', icon: '🔐' },
  { href: '/admin/pt', label: 'PT관리', icon: '💪' },
  { href: '/admin/requests', label: '신청관리', icon: '📝' },
  { href: '/admin/daily-sales', label: '일별매출', icon: '💰' },
  { href: '/admin/monthly-sales', label: '월별매출', icon: '📈' },
  { href: '/admin/reports', label: '통계리포트', icon: '📋' },
  { href: '/admin/settings', label: '설정', icon: '⚙️' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [router.pathname])

  const onLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gray-900 border-r border-gray-800 text-white transition-all duration-300 flex flex-col
        fixed inset-y-0 left-0 z-50 md:static md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              💪
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-bold text-lg tracking-tight text-white">J휘트니스</h1>
                <p className="text-xs text-blue-400">Management System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-xl w-8 text-center">{item.icon}</span>
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-gray-200">{user?.email || '관리자'}</p>
                <p className="text-xs text-blue-400">관리자</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                title="로그아웃"
              >
                🚪
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="w-full p-2 hover:bg-gray-800 rounded-lg transition-colors text-center text-gray-400"
              title="로그아웃"
            >
              🚪
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors md:hidden"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors hidden md:block"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-white">
                  {menuItems.find((m) => router.pathname.startsWith(m.href))?.label || '관리자'}
                </h2>
                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">{currentTime}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/admin/register"
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all text-sm"
              >
                <span>➕</span>
                <span className="font-medium hidden sm:inline">신규등록</span>
              </Link>

              <button className="relative p-2 hover:bg-gray-800 rounded-xl transition-colors">
                <span className="text-xl">🔔</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              </button>

              <div className="relative hidden md:block">
                <input
                  type="text"
                  placeholder="회원 검색..."
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-3 md:p-6 overflow-auto">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2026 J휘트니스. All rights reserved.</p>
            <p>v2.0.0</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
