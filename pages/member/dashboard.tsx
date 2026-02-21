import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'
import { formatPrice, getDaysRemaining } from '../../lib/plans'
import Link from 'next/link'

type Ticket = {
  id: string
  program: string
  startDate: string
  endDate: string
  remaining: number
  price?: number
}

type AttendanceRecord = {
  id: string
  checkIn: any
  checkOut?: any
}

export default function MemberDashboard() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    // 사용자 정보
    const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)))
    if (!userSnap.empty) {
      setUserData({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() })
    }

    // 티켓
    const ticketSnap = await getDocs(query(collection(db, 'purchases'), where('uid', '==', user.uid)))
    const ticketItems = ticketSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Ticket[]
    setTickets(ticketItems)

    // 출석 기록 (최근 10개)
    const attendanceSnap = await getDocs(
      query(collection(db, 'attendance'), where('memberId', '==', user.uid))
    )
    const attendanceItems = attendanceSnap.docs
      .map((d) => ({ id: d.id, ...d.data() })) as AttendanceRecord[]
    // 클라이언트에서 정렬
    attendanceItems.sort((a, b) => {
      const aTime = a.checkIn?.seconds || 0
      const bTime = b.checkIn?.seconds || 0
      return bTime - aTime
    })
    attendanceItems.splice(10)
    setAttendance(attendanceItems)

    setLoading(false)
  }

  const activeTickets = tickets.filter((t) => getDaysRemaining(t.endDate) > 0)
  const thisMonthAttendance = attendance.filter((a) => {
    const date = a.checkIn?.toDate?.() || new Date(a.checkIn)
    const now = new Date()
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  })

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
        {/* Welcome */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            안녕하세요, {userData?.name || user?.email?.split('@')[0]}님! 👋
          </h1>
          <p className="text-blue-100">오늘도 건강한 하루 되세요!</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-2xl p-5 ">
            <div className="text-3xl mb-2">🎫</div>
            <p className="text-2xl font-bold text-white">{activeTickets.length}</p>
            <p className="text-sm text-gray-400">유효 회원권</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-5 ">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-2xl font-bold text-white">
              {activeTickets.length > 0 ? getDaysRemaining(activeTickets[0].endDate) : 0}일
            </p>
            <p className="text-sm text-gray-400">남은 기간</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-5 ">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-2xl font-bold text-white">{thisMonthAttendance.length}회</p>
            <p className="text-sm text-gray-400">이번 달 출석</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-5 ">
            <div className="text-3xl mb-2">🔥</div>
            <p className="text-2xl font-bold text-white">{attendance.length}회</p>
            <p className="text-sm text-gray-400">총 출석</p>
          </div>
        </div>

        {/* Active Memberships */}
        <div className="bg-gray-800 rounded-2xl  overflow-hidden">
          <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <span>🎫</span> 내 회원권
            </h2>
            <Link href="/member/tickets" className="text-sm text-blue-500 hover:underline">
              전체보기 →
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {activeTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-4">📭</p>
                <p>유효한 회원권이 없습니다</p>
                <Link
                  href="/member/purchase"
                  className="inline-block mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                >
                  회원권 구매하기
                </Link>
              </div>
            ) : (
              activeTickets.map((ticket) => {
                const remaining = getDaysRemaining(ticket.endDate)
                const isExpiring = remaining <= 7
                return (
                  <div key={ticket.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{ticket.program}</p>
                      <p className="text-sm text-gray-400">
                        {ticket.startDate} ~ {ticket.endDate}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          isExpiring
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {remaining}일 남음
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-gray-800 rounded-2xl  overflow-hidden">
          <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <span>✅</span> 최근 출석
            </h2>
            <Link href="/member/attendance" className="text-sm text-blue-500 hover:underline">
              전체보기 →
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {attendance.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-4">📋</p>
                <p>출석 기록이 없습니다</p>
              </div>
            ) : (
              attendance.slice(0, 5).map((a) => {
                const checkIn = a.checkIn?.toDate?.() || new Date(a.checkIn)
                return (
                  <div key={a.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {checkIn.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {checkIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 입장
                      </p>
                    </div>
                    <span className="text-green-500 text-xl">✓</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/member/purchase"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-5 text-center transition-colors"
          >
            <span className="text-3xl block mb-2">🛒</span>
            <span className="font-medium">이용권 구매</span>
          </Link>
          <Link
            href="/member/requests"
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-2xl p-5 text-center transition-colors"
          >
            <span className="text-3xl block mb-2">📝</span>
            <span className="font-medium">정지/환불</span>
          </Link>
        </div>
      </div>
    </MemberLayout>
  )
}
