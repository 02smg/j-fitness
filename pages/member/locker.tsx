import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'
import { getDaysRemaining } from '../../lib/plans'

type Locker = {
  id: string
  lockerNumber: number
  startDate: string
  endDate: string
  status: string
}

export default function MemberLocker() {
  const { user } = useAuth()
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadLockers()
  }, [user])

  const loadLockers = async () => {
    if (!user) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'lockers'), where('memberId', '==', user.uid)))
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Locker[]
    setLockers(items)
    setLoading(false)
  }

  const activeLockers = lockers.filter((l) => getDaysRemaining(l.endDate) > 0)

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">🔐 내 라커</h1>

        {activeLockers.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 ">
            <p className="text-6xl mb-4">🔐</p>
            <p className="text-lg mb-2">배정된 라커가 없습니다</p>
            <p className="text-sm text-gray-500">회원권 결제 시 라커를 추가할 수 있습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeLockers.map((locker) => {
              const remaining = getDaysRemaining(locker.endDate)
              return (
                <div key={locker.id} className="bg-gray-800 rounded-2xl  overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-700 to-gray-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">라커 번호</p>
                        <p className="text-5xl font-bold">{locker.lockerNumber}</p>
                      </div>
                      <div className="text-6xl">🔐</div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">시작일</p>
                        <p className="font-medium text-white">{locker.startDate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">종료일</p>
                        <p className="font-medium text-white">{locker.endDate}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        remaining <= 7 ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {remaining}일 남음
                      </span>
                      {remaining <= 7 && (
                        <span className="text-sm text-orange-500">⚠️ 곧 만료됩니다</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Usage Guide */}
        <div className="bg-blue-500/10 rounded-2xl p-5">
          <h2 className="font-semibold text-blue-400 mb-3">📌 라커 이용 안내</h2>
          <ul className="space-y-2 text-sm text-blue-400">
            <li>• 라커 비밀번호는 최초 등록 시 설정한 번호입니다</li>
            <li>• 비밀번호 분실 시 프런트 데스크에 문의해주세요</li>
            <li>• 귀중품은 보관하지 마세요</li>
            <li>• 이용 기간 만료 후 물품은 일괄 정리됩니다</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}
