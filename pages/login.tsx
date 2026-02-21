import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../lib/firebase'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { doc, getDoc } from 'firebase/firestore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
      const role = userDoc.exists() ? userDoc.data()?.role : 'member'
      router.push(role === 'admin' ? '/admin/dashboard' : '/member/dashboard')
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-credential'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl shadow-blue-500/20 mb-4">
            <span className="text-4xl">💪</span>
          </div>
          <h1 className="text-3xl font-bold text-white">J휘트니스</h1>
          <p className="text-blue-400 mt-2">피트니스 관리 시스템</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">로그인</h2>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">이메일</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">📧</span>
                <input
                  type="email"
                  className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">비밀번호</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔒</span>
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> 로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              계정이 없으신가요?{' '}
              <Link href="/signup" className="text-blue-400 font-medium hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-sm mt-8">
          © 2026 J휘트니스. All rights reserved.
        </p>
      </div>
    </div>
  )
}
