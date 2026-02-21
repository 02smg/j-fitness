import AdminLayout from '../../../components/AdminLayout'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { formatDate, formatPrice, membershipPlans, ptPlans, lockerPlans } from '../../../lib/plans'

type Member = {
  id: string
  name?: string
  email?: string
  phone?: string
  birthDate?: string
  address?: string
  gender?: string
  joinedAt?: any
  memberNumber?: number
  memo?: string
}

type Ticket = {
  id: string
  program: string
  planId?: string
  price?: number
  startDate: string
  endDate: string
  remaining: number
  hasClothes: boolean
  hasLocker: boolean
  lockerNumber?: number
  memo?: string
  paymentDate?: string
  createdAt?: any
}

type SaleRecord = {
  id: string
  type: string
  program: string
  amount: number
  paymentMethod: string
  createdAt: any
}

type AttendanceRecord = {
  id: string
  checkIn: any
  checkOut?: any
}

type LockerRecord = {
  id: string
  lockerNumber: number
  startDate: string
  endDate: string
  status: string
}

type PTSession = {
  id: string
  trainer: string
  date: string
  time: string
  status: string
  notes?: string
}

export default function MemberDetail() {
  const router = useRouter()
  const { id } = router.query
  const [member, setMember] = useState<Member | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [lockers, setLockers] = useState<LockerRecord[]>([])
  const [ptSessions, setPtSessions] = useState<PTSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tickets')

  // 티켓 등록 모달
  const [showModal, setShowModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer'>('card')

  useEffect(() => {
    if (!id) return
    loadAllData()
  }, [id])

  const loadAllData = async () => {
    if (!id) return
    setLoading(true)

    // 회원 정보
    const docRef = doc(db, 'users', id as string)
    const snap = await getDoc(docRef)
    if (snap.exists()) {
      setMember({ id: snap.id, ...snap.data() } as Member)
    }

    // 티켓 (purchases)
    const ticketSnap = await getDocs(
      query(collection(db, 'purchases'), where('uid', '==', id))
    )
    const ticketItems = ticketSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Ticket[]
    setTickets(ticketItems)

    // 매출 (sales)
    const salesSnap = await getDocs(
      query(collection(db, 'sales'), where('userId', '==', id))
    )
    const salesItems = salesSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as SaleRecord[]
    setSales(salesItems)

    // 출석
    const attendanceSnap = await getDocs(
      query(collection(db, 'attendance'), where('memberId', '==', id))
    )
    const attendanceItems = attendanceSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AttendanceRecord[]
    setAttendance(attendanceItems)

    // 라커
    const lockerSnap = await getDocs(
      query(collection(db, 'lockers'), where('memberId', '==', id))
    )
    const lockerItems = lockerSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as LockerRecord[]
    setLockers(lockerItems)

    // PT 세션
    const ptSnap = await getDocs(
      query(collection(db, 'pt_sessions'), where('memberId', '==', id))
    )
    const ptItems = ptSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as PTSession[]
    setPtSessions(ptItems)

    setLoading(false)
  }

  const addTicket = async () => {
    if (!selectedPlan || !member) return
    const plan = [...membershipPlans, ...ptPlans, ...lockerPlans].find((p) => p.id === selectedPlan)
    if (!plan) return

    const now = new Date()
    const months = 'months' in plan ? plan.months : 1
    const endDate = new Date(now)
    endDate.setMonth(endDate.getMonth() + months)

    // 티켓 추가
    await addDoc(collection(db, 'purchases'), {
      uid: member.id,
      userName: member.name || member.email,
      program: plan.name,
      planId: plan.id,
      price: plan.price,
      startDate: now.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      remaining: 'sessions' in plan ? plan.sessions : months * 30,
      hasClothes: false,
      hasLocker: false,
      createdAt: serverTimestamp(),
    })

    // 매출 기록 추가 (연동!)
    await addDoc(collection(db, 'sales'), {
      userId: member.id,
      userName: member.name || member.email,
      type: plan.type,
      program: plan.name,
      amount: plan.price,
      paymentMethod: paymentMethod,
      createdAt: serverTimestamp(),
    })

    setShowModal(false)
    setSelectedPlan('')
    loadAllData()
  }

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-'
    const date = ts.toDate?.() || new Date(ts)
    return date.toLocaleString('ko-KR')
  }

  const tabs = [
    { id: 'tickets', label: '티켓목록', icon: '🎫' },
    { id: 'sales', label: '매출현황', icon: '💰' },
    { id: 'attendance', label: '출석현황', icon: '✅' },
    { id: 'locker', label: '라커목록', icon: '🔐' },
    { id: 'pt', label: 'PT목록', icon: '💪' },
  ]

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!member) {
    return (
      <AdminLayout>
        <div className="text-center py-8">회원을 찾을 수 없습니다</div>
      </AdminLayout>
    )
  }

  const totalSales = sales.reduce((sum, s) => sum + (s.amount || 0), 0)

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 회원 정보 헤더 */}
        <div className="bg-gray-800 rounded-2xl  overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-2xl font-bold">
                  {member.name?.charAt(0) || '👤'}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{member.name || member.email?.split('@')[0]}</h2>
                  <p className="text-gray-400 text-sm">
                    {member.phone || '-'} · {member.gender === 'female' ? '여성' : '남성'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl font-medium transition-colors"
                >
                  ➕ 티켓등록
                </button>
                <button
                  onClick={() => router.push('/admin/members')}
                  className="px-4 py-2 bg-gray-800/10 hover:bg-gray-800/20 rounded-xl font-medium transition-colors"
                >
                  ← 목록
                </button>
              </div>
            </div>
          </div>

          {/* 회원 상세 정보 */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">생년월일</p>
              <p className="font-medium">{member.birthDate || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">이메일</p>
              <p className="font-medium">{member.email || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">주소</p>
              <p className="font-medium">{member.address || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">총 결제금액</p>
              <p className="font-bold text-blue-400 text-lg">{formatPrice(totalSales)}원</p>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-gray-800 rounded-2xl ">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10/50'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* 티켓목록 */}
            {activeTab === 'tickets' && (
              <div>
                {tickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-4">🎫</p>
                    <p>등록된 티켓이 없습니다</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                    >
                      티켓 등록하기
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">프로그램</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">시작일</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">종료일</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-300">잔여</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">금액</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-300">상태</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {tickets.map((t) => {
                          const isExpired = new Date(t.endDate) < new Date()
                          return (
                            <tr key={t.id} className="hover:bg-gray-900">
                              <td className="px-4 py-3 font-medium">{t.program}</td>
                              <td className="px-4 py-3">{t.startDate}</td>
                              <td className="px-4 py-3">{t.endDate}</td>
                              <td className="px-4 py-3 text-center">{t.remaining}일</td>
                              <td className="px-4 py-3 text-right">{formatPrice(t.price || 0)}원</td>
                              <td className="px-4 py-3 text-center">
                                {isExpired ? (
                                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">만료</span>
                                ) : (
                                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">유효</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 매출현황 */}
            {activeTab === 'sales' && (
              <div>
                {sales.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-4">💰</p>
                    <p>결제 내역이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-500/10 rounded-xl p-4">
                        <p className="text-sm text-blue-400">총 결제금액</p>
                        <p className="text-2xl font-bold text-blue-400">{formatPrice(totalSales)}원</p>
                      </div>
                      <div className="bg-green-500/10 rounded-xl p-4">
                        <p className="text-sm text-green-400">결제 건수</p>
                        <p className="text-2xl font-bold text-green-400">{sales.length}건</p>
                      </div>
                      <div className="bg-purple-500/10 rounded-xl p-4">
                        <p className="text-sm text-purple-400">평균 결제금액</p>
                        <p className="text-2xl font-bold text-purple-400">
                          {formatPrice(Math.round(totalSales / sales.length))}원
                        </p>
                      </div>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">일시</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">프로그램</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-300">결제수단</th>
                          <th className="px-4 py-3 text-right font-medium text-gray-300">금액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {sales.map((s) => (
                          <tr key={s.id} className="hover:bg-gray-900">
                            <td className="px-4 py-3">{formatTimestamp(s.createdAt)}</td>
                            <td className="px-4 py-3 font-medium">{s.program}</td>
                            <td className="px-4 py-3 text-center">
                              {s.paymentMethod === 'card' && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">카드</span>}
                              {s.paymentMethod === 'cash' && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">현금</span>}
                              {s.paymentMethod === 'transfer' && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs">이체</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">{formatPrice(s.amount)}원</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 출석현황 */}
            {activeTab === 'attendance' && (
              <div>
                {attendance.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-4">✅</p>
                    <p>출석 기록이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 rounded-xl p-4 inline-block">
                      <p className="text-sm text-green-400">총 출석 횟수</p>
                      <p className="text-2xl font-bold text-green-400">{attendance.length}회</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-900">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">입장 시간</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">퇴장 시간</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-300">운동 시간</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {attendance.map((a) => {
                          const checkIn = a.checkIn?.toDate?.() || new Date(a.checkIn)
                          const checkOut = a.checkOut?.toDate?.() || (a.checkOut ? new Date(a.checkOut) : null)
                          const duration = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) : null
                          return (
                            <tr key={a.id} className="hover:bg-gray-900">
                              <td className="px-4 py-3">{checkIn.toLocaleString('ko-KR')}</td>
                              <td className="px-4 py-3">{checkOut ? checkOut.toLocaleString('ko-KR') : '운동중'}</td>
                              <td className="px-4 py-3">
                                {duration ? `${Math.floor(duration / 60)}시간 ${duration % 60}분` : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 라커목록 */}
            {activeTab === 'locker' && (
              <div>
                {lockers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-4">🔐</p>
                    <p>배정된 라커가 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">라커 번호</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">시작일</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">종료일</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-300">상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {lockers.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-900">
                          <td className="px-4 py-3 font-bold text-lg">{l.lockerNumber}번</td>
                          <td className="px-4 py-3">{l.startDate}</td>
                          <td className="px-4 py-3">{l.endDate}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">사용중</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* PT목록 */}
            {activeTab === 'pt' && (
              <div>
                {ptSessions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-4xl mb-4">💪</p>
                    <p>PT 수업 기록이 없습니다</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">날짜</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">시간</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">트레이너</th>
                        <th className="px-4 py-3 text-center font-medium text-gray-300">상태</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-300">메모</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {ptSessions.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-900">
                          <td className="px-4 py-3">{p.date}</td>
                          <td className="px-4 py-3">{p.time}</td>
                          <td className="px-4 py-3 font-medium">{p.trainer}</td>
                          <td className="px-4 py-3 text-center">
                            {p.status === 'completed' && <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">완료</span>}
                            {p.status === 'scheduled' && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">예약</span>}
                            {p.status === 'cancelled' && <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">취소</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{p.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 티켓 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">🎫 티켓 등록</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">프로그램 선택</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full border border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택하세요</option>
                  <optgroup label="🏋️ 헬스">
                    {membershipPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatPrice(p.price)}원
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="💪 PT">
                    {ptPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatPrice(p.price)}원
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🔐 라커">
                    {lockerPlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - {formatPrice(p.price)}원
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">결제 수단</label>
                <div className="flex gap-2">
                  {[
                    { id: 'card', label: '💳 카드' },
                    { id: 'cash', label: '💵 현금' },
                    { id: 'transfer', label: '🏦 이체' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        paymentMethod === m.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPlan && (
                <div className="bg-blue-500/10 rounded-xl p-4">
                  <p className="text-sm text-blue-400">결제 금액</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatPrice([...membershipPlans, ...ptPlans, ...lockerPlans].find((p) => p.id === selectedPlan)?.price || 0)}원
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600"
              >
                취소
              </button>
              <button
                onClick={addTicket}
                disabled={!selectedPlan}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
