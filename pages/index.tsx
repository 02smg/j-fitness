import Head from 'next/head'
import Link from 'next/link'
import useAuth from '../lib/useAuth'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      getDoc(doc(db, 'users', user.uid)).then((snap) => {
        const role = snap.exists() ? snap.data()?.role : 'member'
        router.push(role === 'admin' ? '/admin/dashboard' : '/member/dashboard')
      })
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-gray-950">
      <Head>
        <title>J휘트니스 - 스마트 피트니스 관리</title>
      </Head>

      <nav className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-xl">💪</span>
            </div>
            <span className="text-white font-bold text-xl">J휘트니스</span>
          </div>
          <div className="flex items-center gap-4">
            {!loading && !user && (
              <>
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
                >
                  시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8">
            <span>✨</span> 피트니스 운영의 새로운 기준
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            스마트한<br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              피트니스 관리
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
            회원 관리, 출석 체크, PT 스케줄, 라커 관리, 매출 분석까지<br />
            모든 것을 한 곳에서 간편하게 관리하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-2xl shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all transform hover:-translate-y-1"
            >
              무료로 시작하기 →
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all border border-gray-700"
            >
              로그인
            </Link>
          </div>
        </div>
      </main>

      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">주요 기능</h2>
          <p className="text-center text-gray-500 mb-12">피트니스 운영에 필요한 모든 기능을 제공합니다</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '👥', title: '회원 관리', desc: '회원 정보 등록, 수정, 만료일 관리' },
              { icon: '✅', title: '출석 체크', desc: '실시간 입퇴장 기록 및 통계' },
              { icon: '💪', title: 'PT 관리', desc: 'PT 세션 예약 및 트레이너 스케줄' },
              { icon: '🔐', title: '라커 관리', desc: '라커 배정 현황 한눈에 확인' },
              { icon: '💰', title: '매출 분석', desc: '일별, 월별 매출 리포트' },
              { icon: '📊', title: '통계 리포트', desc: '회원 현황 및 성장 추이 분석' },
              { icon: '📱', title: '반응형 디자인', desc: 'PC, 태블릿, 모바일 완벽 지원' },
              { icon: '☁️', title: '클라우드 저장', desc: 'Firebase 기반 안전한 데이터 보관' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 bg-gray-800 border border-gray-700 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
              >
                <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">{feature.icon}</span>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">지금 바로 시작하세요</h2>
          <p className="text-blue-100 mb-8">복잡한 설정 없이 바로 사용할 수 있습니다</p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold rounded-2xl shadow-2xl hover:shadow-white/30 transition-all transform hover:-translate-y-1"
          >
            무료로 시작하기
          </Link>
        </div>
      </section>

      <footer className="py-8 px-6 bg-gray-950 border-t border-gray-800 text-center">
        <p className="text-gray-600 text-sm">© 2026 J휘트니스. All rights reserved.</p>
      </footer>
    </div>
  )
}
