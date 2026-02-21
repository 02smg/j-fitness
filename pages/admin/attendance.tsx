import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, Timestamp, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'

type AttendanceRecord = {
  id: string
  memberId: string
  memberName: string
  memberNumber?: number
  checkIn: any
  checkOut?: any
  duration?: string
}

type Member = {
  id: string
  name?: string
  email?: string
  memberNumber?: number
}

export default function AttendanceManagement() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [searchMember, setSearchMember] = useState('')
  const [currentlyIn, setCurrentlyIn] = useState<AttendanceRecord[]>([])

  useEffect(() => {
    loadData()
  }, [selectedDate])

  const loadData = async () => {
    setLoading(true)

    // Load members
    const membersSnap = await getDocs(collection(db, 'users'))
    const membersData = membersSnap.docs.map((d, i) => ({
      id: d.id,
      memberNumber: 6941 - i,
      ...d.data(),
    })) as Member[]
    setMembers(membersData)

    // Load attendance for selected date
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const attendanceSnap = await getDocs(
      query(collection(db, 'attendance'), orderBy('checkIn', 'desc'))
    )

    const attendanceData = attendanceSnap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
      }))
      .filter((r: any) => {
        const checkIn = r.checkIn?.toDate?.() || new Date(r.checkIn)
        return checkIn >= startOfDay && checkIn <= endOfDay
      }) as AttendanceRecord[]

    setRecords(attendanceData)

    // Find currently checked in (no checkout)
    const inProgress = attendanceData.filter((r) => !r.checkOut)
    setCurrentlyIn(inProgress)

    setLoading(false)
  }

  const handleCheckIn = async (member: Member) => {
    try {
      await addDoc(collection(db, 'attendance'), {
        memberId: member.id,
        memberName: member.name || member.email?.split('@')[0] || '알수없음',
        memberNumber: member.memberNumber,
        checkIn: Timestamp.now(),
      })
      setShowCheckInModal(false)
      setSearchMember('')
      loadData()
    } catch (error) {
      console.error(error)
      alert('출석 체크에 실패했습니다.')
    }
  }

  const handleCheckOut = async (record: AttendanceRecord) => {
    try {
      await updateDoc(doc(db, 'attendance', record.id), {
        checkOut: Timestamp.now(),
      })
      loadData()
    } catch (error) {
      console.error(error)
      alert('퇴장 처리에 실패했습니다.')
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const calculateDuration = (checkIn: any, checkOut: any) => {
    if (!checkIn || !checkOut) return '-'
    const inTime = checkIn.toDate?.() || new Date(checkIn)
    const outTime = checkOut.toDate?.() || new Date(checkOut)
    const diff = Math.floor((outTime.getTime() - inTime.getTime()) / 1000 / 60)
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchMember.toLowerCase()) ||
      String(m.memberNumber).includes(searchMember)
  )

  const stats = {
    total: records.length,
    currentlyIn: currentlyIn.length,
    male: records.filter((r) => true).length, // Would need gender data
    female: 0,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">오늘 총 출석</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                🏃
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.currentlyIn}</p>
                <p className="text-sm text-gray-400">현재 운동중</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                🕐
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {records.length > 0 ? formatTime(records[records.length - 1]?.checkIn) : '-'}
                </p>
                <p className="text-sm text-gray-400">첫 입장</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">
                ⏰
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {records.length > 0 ? formatTime(records[0]?.checkIn) : '-'}
                </p>
                <p className="text-sm text-gray-400">마지막 입장</p>
              </div>
            </div>
          </div>
        </div>

        {/* Currently In Section */}
        {currentlyIn.length > 0 && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="text-xl">🏃</span> 현재 운동중인 회원
              </h3>
              <span className="bg-gray-800/20 px-3 py-1 rounded-full text-sm">{currentlyIn.length}명</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentlyIn.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-800/20 rounded-xl px-4 py-2 flex items-center gap-3"
                >
                  <span className="font-medium">{record.memberName}</span>
                  <span className="text-sm opacity-80">{formatTime(record.checkIn)} ~</span>
                  <button
                    onClick={() => handleCheckOut(record)}
                    className="text-xs bg-gray-800/30 hover:bg-gray-800/40 rounded-lg px-2 py-1 transition-colors"
                  >
                    퇴장처리
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-gray-800 rounded-2xl ">
          {/* Header */}
          <div className="p-5 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                <span>✅</span> 출석 기록
              </h3>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              />
            </div>

            <button
              onClick={() => setShowCheckInModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <span>➕</span> 출석 체크
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">번호</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">회원정보</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">입장시간</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">퇴장시간</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">운동시간</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">상태</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      <span className="text-4xl block mb-2">📋</span>
                      출석 기록이 없습니다
                    </td>
                  </tr>
                ) : (
                  records.map((record, idx) => (
                    <tr key={record.id} className="hover:bg-gray-900 transition-colors">
                      <td className="px-5 py-4 text-gray-300">{records.length - idx}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {record.memberName?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-white">{record.memberName}</p>
                            <p className="text-xs text-gray-500">#{record.memberNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-green-400">
                        {formatTime(record.checkIn)}
                      </td>
                      <td className="px-5 py-4 text-center font-medium text-red-400">
                        {formatTime(record.checkOut)}
                      </td>
                      <td className="px-5 py-4 text-center text-gray-300">
                        {calculateDuration(record.checkIn, record.checkOut)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {record.checkOut ? (
                          <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">
                            퇴장완료
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium animate-pulse">
                            운동중
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {!record.checkOut && (
                          <button
                            onClick={() => handleCheckOut(record)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
                          >
                            퇴장처리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">✅ 출석 체크</h3>
              <button
                onClick={() => {
                  setShowCheckInModal(false)
                  setSearchMember('')
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="회원명 또는 번호로 검색..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {searchMember.length > 0 ? (
                filteredMembers.length === 0 ? (
                  <p className="text-center py-8 text-gray-400">검색 결과가 없습니다</p>
                ) : (
                  filteredMembers.slice(0, 10).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleCheckIn(member)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-500/10 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {member.name?.charAt(0) || member.email?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {member.name || member.email?.split('@')[0]}
                        </p>
                        <p className="text-sm text-gray-400">#{member.memberNumber}</p>
                      </div>
                    </button>
                  ))
                )
              ) : (
                <p className="text-center py-8 text-gray-500">회원을 검색해주세요</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
