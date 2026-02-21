import Link from 'next/link'
import { useRouter } from 'next/router'
import useAuth from '../lib/useAuth'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useState, useEffect } from 'react'

const menuItems = [
  { href: '/member/dashboard', label: '내 정보', icon: '🏠' },
  { href: '/member/tickets', label: '내 회원권', icon: '🎫' },
  { href: '/member/purchase', label: '이용권 구매', icon: '🛒' },
  { href: '/member/attendance', label: '출석 기록', icon: '✅' },
  { href: '/member/locker', label: '라커', icon: '🔐' },
  { href: '/member/payments', label: '결제 내역', icon: '💳' },
  { href: '/member/requests', label: '정지/환불', icon: '📝' },
  { href: '/member/inquiry', label: '문의사항', icon: '💬' },
]

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const onLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile Header */}
      <header className="lg:hidden bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <span className="text-xl">💪</span>
            </div>
            <span className="font-bold text-lg text-white">J휘트니스</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-gray-800 py-2">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 ${
                  router.pathname === item.href ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400"
            >
              <span className="text-xl">🚪</span>
              <span>로그아웃</span>
            </button>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 min-h-screen bg-gray-900 border-r border-gray-800">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-2xl">💪</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">J휘트니스</h1>
                <p className="text-xs text-blue-400">회원 전용</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900 w-64">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-200">{user.email}</p>
                <p className="text-xs text-blue-400">일반 회원</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              로그아웃
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 min-h-screen pb-20 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}
