import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function MemberIndex() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/member/dashboard')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-400">대시보드로 이동 중...</p>
      </div>
    </div>
  )
}
