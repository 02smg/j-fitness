import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, Timestamp, setDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

type Locker = {
  id: string
  number: number
  status: 'available' | 'occupied' | 'expired' | 'maintenance'
  memberId?: string
  memberName?: string
  startDate?: any
  endDate?: any
}

export default function LockerManagement() {
  const [lockers, setLockers] = useState<Locker[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
  const [filter, setFilter] = useState<'all' | 'available' | 'occupied' | 'expired'>('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [searchMember, setSearchMember] = useState('')

  const TOTAL_LOCKERS = 200 // Total number of lockers
  const LOCKERS_PER_ROW = 20

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    // Load members
    const membersSnap = await getDocs(collection(db, 'users'))
    const membersData = membersSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))
    setMembers(membersData)

    // Load lockers
    const lockersSnap = await getDocs(collection(db, 'lockers'))
    const existingLockers = new Map(lockersSnap.docs.map((d) => [d.data().number, { id: d.id, ...d.data() } as any]))

    const today = new Date()

    // Generate all lockers
    const allLockers: Locker[] = []
    for (let i = 1; i <= TOTAL_LOCKERS; i++) {
      const existing = existingLockers.get(i) as any
      if (existing) {
        // Check if expired
        const endDate = existing.endDate?.toDate?.() || new Date(existing.endDate || 0)
        const isExpired = existing.status === 'occupied' && endDate < today
        allLockers.push({
          ...existing,
          status: isExpired ? 'expired' : existing.status,
        } as Locker)
      } else {
        allLockers.push({
          id: `temp-${i}`,
          number: i,
          status: 'available',
        })
      }
    }

    setLockers(allLockers)
    setLoading(false)
  }

  const getLockerColor = (locker: Locker) => {
    switch (locker.status) {
      case 'available':
        return 'bg-gradient-to-br from-green-400 to-emerald-500 text-white hover:shadow-lg cursor-pointer'
      case 'occupied':
        return 'bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-lg cursor-pointer'
      case 'expired':
        return 'bg-gradient-to-br from-red-400 to-rose-500 text-white hover:shadow-lg cursor-pointer animate-pulse'
      case 'maintenance':
        return 'bg-gradient-to-br from-slate-400 to-slate-500 text-white'
      default:
        return 'bg-gray-600'
    }
  }

  const filteredLockers = lockers.filter((l) => {
    if (filter === 'all') return true
    return l.status === filter
  })

  const stats = {
    total: lockers.length,
    available: lockers.filter((l) => l.status === 'available').length,
    occupied: lockers.filter((l) => l.status === 'occupied').length,
    expired: lockers.filter((l) => l.status === 'expired').length,
    maintenance: lockers.filter((l) => l.status === 'maintenance').length,
  }

  const assignLocker = async (member: any) => {
    if (!selectedLocker) return

    try {
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1) // 1 month default

      const lockerData = {
        number: selectedLocker.number,
        status: 'occupied',
        memberId: member.id,
        memberName: member.name || member.email?.split('@')[0],
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
      }

      if (selectedLocker.id.startsWith('temp-')) {
        await addDoc(collection(db, 'lockers'), lockerData)
      } else {
        await updateDoc(doc(db, 'lockers', selectedLocker.id), lockerData)
      }

      // Update member's locker info
      await updateDoc(doc(db, 'users', member.id), {
        lockerNumber: selectedLocker.number,
        hasLocker: true,
      })

      setShowAssignModal(false)
      setSelectedLocker(null)
      setSearchMember('')
      loadData()
    } catch (error) {
      console.error(error)
      alert('라커 배정에 실패했습니다.')
    }
  }

  const releaseLocker = async (locker: Locker) => {
    if (!confirm(`${locker.number}번 라커를 해제하시겠습니까?`)) return

    try {
      if (locker.memberId) {
        await updateDoc(doc(db, 'users', locker.memberId), {
          lockerNumber: null,
          hasLocker: false,
        })
      }

      await updateDoc(doc(db, 'lockers', locker.id), {
        status: 'available',
        memberId: null,
        memberName: null,
        startDate: null,
        endDate: null,
      })

      loadData()
    } catch (error) {
      console.error(error)
      alert('라커 해제에 실패했습니다.')
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleDateString('ko-KR')
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchMember.toLowerCase())
  )

  // Group lockers by rows
  const lockerRows: Locker[][] = []
  for (let i = 0; i < filteredLockers.length; i += LOCKERS_PER_ROW) {
    lockerRows.push(filteredLockers.slice(i, i + LOCKERS_PER_ROW))
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div
            onClick={() => setFilter('all')}
            className={`bg-gray-800 rounded-2xl  p-5 cursor-pointer transition-all ${
              filter === 'all' ? 'ring-2 ring-gray-500' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-2xl">
                🔐
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">전체 라커</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFilter('available')}
            className={`bg-gray-800 rounded-2xl  p-5 cursor-pointer transition-all ${
              filter === 'available' ? 'ring-2 ring-green-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.available}</p>
                <p className="text-sm text-gray-400">사용가능</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFilter('occupied')}
            className={`bg-gray-800 rounded-2xl  p-5 cursor-pointer transition-all ${
              filter === 'occupied' ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.occupied}</p>
                <p className="text-sm text-gray-400">사용중</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setFilter('expired')}
            className={`bg-gray-800 rounded-2xl  p-5 cursor-pointer transition-all ${
              filter === 'expired' ? 'ring-2 ring-red-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
                <p className="text-sm text-gray-400">만료</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-2xl">
                🔧
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-300">{stats.maintenance}</p>
                <p className="text-sm text-gray-400">점검중</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locker Grid */}
        <div className="bg-gray-800 rounded-2xl  p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <span>🔐</span> 라커 현황
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded bg-green-500"></span>
                <span className="text-gray-300">사용가능</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded bg-blue-500"></span>
                <span className="text-gray-300">사용중</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 rounded bg-red-500"></span>
                <span className="text-gray-300">만료</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              {lockerRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-2">
                  {row.map((locker) => (
                    <button
                      key={locker.id}
                      onClick={() => {
                        setSelectedLocker(locker)
                        if (locker.status === 'available') {
                          setShowAssignModal(true)
                        }
                      }}
                      className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${getLockerColor(
                        locker
                      )}`}
                      title={locker.memberName || `라커 ${locker.number}`}
                    >
                      {locker.number}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Locker Detail */}
        {selectedLocker && selectedLocker.status !== 'available' && (
          <div className="bg-gray-800 rounded-2xl  p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-white">
                🔐 {selectedLocker.number}번 라커 정보
              </h3>
              <button
                onClick={() => setSelectedLocker(null)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">사용자</p>
                <p className="font-semibold text-white">{selectedLocker.memberName || '-'}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">상태</p>
                <p className={`font-semibold ${
                  selectedLocker.status === 'occupied' ? 'text-blue-400' :
                  selectedLocker.status === 'expired' ? 'text-red-400' : 'text-gray-300'
                }`}>
                  {selectedLocker.status === 'occupied' ? '사용중' :
                   selectedLocker.status === 'expired' ? '만료됨' : '사용가능'}
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">시작일</p>
                <p className="font-semibold text-white">{formatDate(selectedLocker.startDate)}</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">종료일</p>
                <p className="font-semibold text-white">{formatDate(selectedLocker.endDate)}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => releaseLocker(selectedLocker)}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                🔓 라커 해제
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(true)
                }}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                🔄 회원 변경
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedLocker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                🔐 {selectedLocker.number}번 라커 배정
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false)
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
                placeholder="회원명으로 검색..."
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
                      onClick={() => assignLocker(member)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-blue-500/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                          {member.name?.charAt(0) || member.email?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {member.name || member.email?.split('@')[0]}
                          </p>
                          <p className="text-sm text-gray-400">{member.phone || member.email}</p>
                        </div>
                      </div>
                      {member.lockerNumber && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          현재: #{member.lockerNumber}
                        </span>
                      )}
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
