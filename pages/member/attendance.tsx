import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'

type AttendanceRecord = {
  id: string
  checkIn: any
  checkOut?: any
}

export default function MemberAttendance() {
  const { user } = useAuth()
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    if (!user) return
    loadRecords()
  }, [user, selectedMonth])

  const loadRecords = async () => {
    if (!user) return
    setLoading(true)
    
    const [year, month] = selectedMonth.split('-').map(Number)
    const startOfMonth = new Date(year, month - 1, 1)
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

    const snap = await getDocs(
      query(collection(db, 'attendance'), where('memberId', '==', user.uid))
    )
    
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((r: any) => {
        const date = r.checkIn?.toDate?.() || new Date(r.checkIn)
        return date >= startOfMonth && date <= endOfMonth
      }) as AttendanceRecord[]
    
    // 클라이언트에서 정렬
    items.sort((a, b) => {
      const aTime = a.checkIn?.seconds || 0
      const bTime = b.checkIn?.seconds || 0
      return bTime - aTime
    })

    setRecords(items)
    setLoading(false)
  }

  const formatDuration = (checkIn: any, checkOut: any) => {
    if (!checkOut) return '운동중'
    const start = checkIn?.toDate?.() || new Date(checkIn)
    const end = checkOut?.toDate?.() || new Date(checkOut)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}시간 ${mins}분`
  }

  // 달력 생성
  const [year, month] = selectedMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  
  const attendanceDays = new Set(
    records.map((r) => {
      const date = r.checkIn?.toDate?.() || new Date(r.checkIn)
      return date.getDate()
    })
  )

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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">✅ 출석 기록</h1>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-2xl p-5  text-center">
            <p className="text-3xl font-bold text-blue-400">{records.length}</p>
            <p className="text-sm text-gray-400">이번 달 출석</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-5  text-center">
            <p className="text-3xl font-bold text-green-400">{attendanceDays.size}</p>
            <p className="text-sm text-gray-400">출석 일수</p>
          </div>
          <div className="bg-gray-800 rounded-2xl p-5  text-center">
            <p className="text-3xl font-bold text-purple-400">
              {Math.round((attendanceDays.size / daysInMonth) * 100)}%
            </p>
            <p className="text-sm text-gray-400">출석률</p>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-gray-800 rounded-2xl p-5 ">
          <h2 className="font-semibold text-gray-200 mb-4">출석 달력</h2>
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="py-2 font-medium text-gray-400">{day}</div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="py-2"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const hasAttendance = attendanceDays.has(day)
              const isToday = new Date().getDate() === day && 
                new Date().getMonth() + 1 === month && 
                new Date().getFullYear() === year
              return (
                <div
                  key={day}
                  className={`py-2 rounded-lg ${
                    hasAttendance
                      ? 'bg-green-500 text-white font-bold'
                      : isToday
                      ? 'bg-blue-500/20 text-blue-400 font-bold'
                      : 'text-gray-300'
                  }`}
                >
                  {day}
                </div>
              )
            })}
          </div>
        </div>

        {/* Records List */}
        <div className="bg-gray-800 rounded-2xl  overflow-hidden">
          <div className="p-5 border-b border-gray-700">
            <h2 className="font-semibold text-gray-200">상세 기록</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {records.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-4">📋</p>
                <p>이번 달 출석 기록이 없습니다</p>
              </div>
            ) : (
              records.map((r) => {
                const checkIn = r.checkIn?.toDate?.() || new Date(r.checkIn)
                const checkOut = r.checkOut?.toDate?.() || (r.checkOut ? new Date(r.checkOut) : null)
                return (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {checkIn.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {checkIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        {checkOut && ` ~ ${checkOut.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      checkOut ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {formatDuration(r.checkIn, r.checkOut)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}
