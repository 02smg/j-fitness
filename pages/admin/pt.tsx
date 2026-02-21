import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { ptPlans, formatPrice, formatDate } from '../../lib/plans'

type PTSession = {
  id: string
  memberId: string
  memberName: string
  program: string
  totalSessions: number
  usedSessions: number
  remainingSessions: number
  trainer?: string
  trainerName?: string
  startDate?: any
  createdAt?: any
}

type Trainer = {
  id: string
  name: string
  phone: string
  speciality: string
  color: string
}

type Schedule = {
  id: string
  memberId: string
  memberName: string
  trainerId: string
  trainerName: string
  date: string
  time: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

const COLOR_OPTIONS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'teal']

const TIME_SLOTS = [
  '09:00','10:00','11:00','12:00','13:00','14:00',
  '15:00','16:00','17:00','18:00','19:00','20:00','21:00',
]

export default function PTManagement() {
  const [sessions, setSessions] = useState<PTSession[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sessions' | 'schedule' | 'trainers'>('sessions')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showTrainerModal, setShowTrainerModal] = useState(false)
  const [showEditTrainerModal, setShowEditTrainerModal] = useState(false)
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null)

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({ memberId: '', memberName: '', trainerId: '', trainerName: '', date: '', time: '09:00' })

  // Register form
  const [registerForm, setRegisterForm] = useState({ memberId: '', planId: '' })

  // Trainer form
  const [trainerForm, setTrainerForm] = useState({ name: '', phone: '', speciality: '', color: 'blue' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load trainers from Firestore
      const trainersSnap = await getDocs(collection(db, 'trainers'))
      const trainersData = trainersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Trainer[]
      setTrainers(trainersData)

      // Load members
      const membersSnap = await getDocs(collection(db, 'users'))
      const membersData = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setMembers(membersData)

      // Load PT purchases
      const purchasesSnap = await getDocs(collection(db, 'purchases'))
      const ptSessions = purchasesSnap.docs
        .map((d) => {
          const data = d.data()
          if (!data.program?.includes('PT')) return null
          const trainerInfo = trainersData.find((t) => t.id === data.trainerId)
          return {
            id: d.id,
            memberId: data.uid,
            memberName: data.userName,
            program: data.program,
            totalSessions: data.totalSessions || 0,
            usedSessions: data.usedSessions || 0,
            remainingSessions: data.remaining || 0,
            trainer: data.trainerId || '',
            trainerName: trainerInfo?.name || '',
            startDate: data.startDate,
            createdAt: data.createdAt,
          } as PTSession
        })
        .filter(Boolean) as PTSession[]
      setSessions(ptSessions)

      // Load schedules
      const schedulesSnap = await getDocs(collection(db, 'pt_schedules'))
      const schedulesData = schedulesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Schedule[]
      setSchedules(schedulesData)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
    setLoading(false)
  }

  // ---- PT Session Actions ----
  const recordSession = async (session: PTSession) => {
    if (session.remainingSessions <= 0) { alert('남은 횟수가 없습니다.'); return }
    if (!confirm(`${session.memberName}님의 PT 1회를 차감하시겠습니까?`)) return
    try {
      await updateDoc(doc(db, 'purchases', session.id), {
        usedSessions: session.usedSessions + 1,
        remaining: session.remainingSessions - 1,
      })
      loadData()
    } catch { alert('처리에 실패했습니다.') }
  }

  const assignTrainer = async (sessionId: string, trainerId: string) => {
    try {
      const trainer = trainers.find((t) => t.id === trainerId)
      await updateDoc(doc(db, 'purchases', sessionId), {
        trainerId: trainerId,
        trainerName: trainer?.name || '',
      })
      loadData()
    } catch { alert('트레이너 배정에 실패했습니다.') }
  }

  const handleRegisterPT = async () => {
    if (!registerForm.memberId || !registerForm.planId) { alert('회원과 상품을 선택하세요.'); return }
    const plan = ptPlans.find((p) => p.id === registerForm.planId)
    const member = members.find((m: any) => m.id === registerForm.memberId)
    if (!plan || !member) return

    try {
      await addDoc(collection(db, 'purchases'), {
        uid: member.id,
        userName: member.name || member.email,
        program: plan.name,
        type: 'pt',
        totalSessions: plan.sessions,
        usedSessions: 0,
        remaining: plan.sessions,
        price: plan.price,
        status: 'active',
        startDate: Timestamp.now(),
        createdAt: Timestamp.now(),
      })
      // Also record as a sale
      await addDoc(collection(db, 'sales'), {
        uid: member.id,
        userName: member.name || member.email,
        type: 'pt',
        program: plan.name,
        amount: plan.price,
        date: new Date().toISOString().split('T')[0],
        createdAt: Timestamp.now(),
      })
      setShowRegisterModal(false)
      setRegisterForm({ memberId: '', planId: '' })
      alert('PT가 등록되었습니다.')
      loadData()
    } catch { alert('등록에 실패했습니다.') }
  }

  // ---- Schedule Actions ----
  const handleBookSchedule = async () => {
    if (!scheduleForm.memberId || !scheduleForm.trainerId || !scheduleForm.date) {
      alert('모든 항목을 선택하세요.'); return
    }
    // Check if slot is already booked
    const existing = schedules.find(
      (s) => s.trainerId === scheduleForm.trainerId && s.date === scheduleForm.date && s.time === scheduleForm.time && s.status !== 'cancelled'
    )
    if (existing) { alert('해당 시간에 이미 예약이 있습니다.'); return }

    try {
      await addDoc(collection(db, 'pt_schedules'), {
        memberId: scheduleForm.memberId,
        memberName: scheduleForm.memberName,
        trainerId: scheduleForm.trainerId,
        trainerName: scheduleForm.trainerName,
        date: scheduleForm.date,
        time: scheduleForm.time,
        status: 'scheduled',
        createdAt: Timestamp.now(),
      })
      setShowScheduleModal(false)
      setScheduleForm({ memberId: '', memberName: '', trainerId: '', trainerName: '', date: '', time: '09:00' })
      alert('예약이 완료되었습니다.')
      loadData()
    } catch { alert('예약에 실패했습니다.') }
  }

  const cancelSchedule = async (scheduleId: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return
    try {
      await updateDoc(doc(db, 'pt_schedules', scheduleId), { status: 'cancelled' })
      loadData()
    } catch { alert('취소에 실패했습니다.') }
  }

  // ---- Trainer Actions ----
  const handleAddTrainer = async () => {
    if (!trainerForm.name || !trainerForm.speciality) { alert('이름과 전문분야를 입력하세요.'); return }
    try {
      await addDoc(collection(db, 'trainers'), {
        name: trainerForm.name,
        phone: trainerForm.phone,
        speciality: trainerForm.speciality,
        color: trainerForm.color,
        createdAt: Timestamp.now(),
      })
      setShowTrainerModal(false)
      setTrainerForm({ name: '', phone: '', speciality: '', color: 'blue' })
      alert('트레이너가 추가되었습니다.')
      loadData()
    } catch (error: any) {
      console.error('트레이너 추가 오류:', error)
      if (error?.code === 'permission-denied') {
        alert('권한이 없습니다. Firestore 보안 규칙에 trainers 컬렉션이 추가되어 있는지 확인하세요.')
      } else {
        alert('추가에 실패했습니다: ' + (error?.message || '알 수 없는 오류'))
      }
    }
  }

  const handleEditTrainer = async () => {
    if (!editingTrainer) return
    try {
      await updateDoc(doc(db, 'trainers', editingTrainer.id), {
        name: trainerForm.name,
        phone: trainerForm.phone,
        speciality: trainerForm.speciality,
        color: trainerForm.color,
      })
      setShowEditTrainerModal(false)
      setEditingTrainer(null)
      alert('트레이너 정보가 수정되었습니다.')
      loadData()
    } catch { alert('수정에 실패했습니다.') }
  }

  const deleteTrainer = async (trainerId: string) => {
    if (!confirm('이 트레이너를 삭제하시겠습니까?')) return
    try {
      await deleteDoc(doc(db, 'trainers', trainerId))
      loadData()
    } catch { alert('삭제에 실패했습니다.') }
  }

  const openEditTrainer = (trainer: Trainer) => {
    setEditingTrainer(trainer)
    setTrainerForm({ name: trainer.name, phone: trainer.phone || '', speciality: trainer.speciality, color: trainer.color })
    setShowEditTrainerModal(true)
  }

  const viewTrainerSchedule = (trainer: Trainer) => {
    setActiveTab('schedule')
  }

  // ---- Helpers ----
  const getTrainerColor = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      pink: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      green: 'bg-green-500/20 text-green-400 border-green-500/30',
      purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      red: 'bg-red-500/20 text-red-400 border-red-500/30',
      teal: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    }
    return map[color] || map.blue
  }

  const getTrainerBg = (color: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-600', pink: 'bg-pink-600', green: 'bg-green-600',
      purple: 'bg-purple-600', orange: 'bg-orange-600', red: 'bg-red-600', teal: 'bg-teal-600',
    }
    return map[color] || map.blue
  }

  const getTrainerStats = (trainerId: string) => {
    const assigned = sessions.filter((s) => s.trainer === trainerId)
    const trainerSchedules = schedules.filter((s) => s.trainerId === trainerId)
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthSessions = trainerSchedules.filter((s) => s.date.startsWith(monthStr) && s.status === 'completed').length
    return { members: assigned.length, monthlySessions: monthSessions }
  }

  const stats = {
    totalSessions: sessions.reduce((a, s) => a + s.totalSessions, 0),
    usedSessions: sessions.reduce((a, s) => a + s.usedSessions, 0),
    remainingSessions: sessions.reduce((a, s) => a + s.remainingSessions, 0),
    activeMembers: sessions.filter((s) => s.remainingSessions > 0).length,
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: '💪', value: stats.activeMembers, label: 'PT 회원', color: 'text-purple-400' },
            { icon: '📊', value: stats.totalSessions, label: '총 횟수', color: 'text-blue-400' },
            { icon: '✅', value: stats.usedSessions, label: '진행완료', color: 'text-green-400' },
            { icon: '🎯', value: stats.remainingSessions, label: '잔여 횟수', color: 'text-orange-400' },
          ].map((s, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-2xl p-3 md:p-5">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-700 flex items-center justify-center text-xl md:text-2xl">{s.icon}</div>
                <div>
                  <p className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs md:text-sm text-gray-400">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl">
          <div className="border-b border-gray-700 overflow-x-auto">
            <div className="flex min-w-max">
              {[
                { id: 'sessions', label: 'PT 현황', icon: '💪' },
                { id: 'schedule', label: '스케줄', icon: '📅' },
                { id: 'trainers', label: '트레이너', icon: '👤' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-3 md:py-4 font-medium transition-all border-b-2 text-sm md:text-base ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h3 className="font-semibold text-lg text-white">PT 회원 현황</h3>
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all w-full sm:w-auto justify-center"
                >
                  <span>➕</span> PT 등록
                </button>
              </div>

              {/* PT Plans */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
                {ptPlans.map((plan) => (
                  <div key={plan.id} className="p-3 md:p-5 rounded-2xl border border-gray-700 bg-gray-900 hover:border-blue-500/50 transition-all text-center">
                    <div className="text-2xl md:text-3xl mb-1 md:mb-2">💪</div>
                    <p className="font-bold text-white text-sm md:text-base">{plan.name}</p>
                    <p className="text-lg md:text-2xl font-bold text-blue-400 mt-1 md:mt-2">{formatPrice(plan.price)}원</p>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">회당 {formatPrice(Math.round(plan.price / plan.sessions))}원</p>
                  </div>
                ))}
              </div>

              {/* Sessions Table */}
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">회원</th>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left hidden sm:table-cell">프로그램</th>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-center">잔여</th>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-center hidden md:table-cell">진행률</th>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-left">트레이너</th>
                      <th className="px-3 md:px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-center">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto" /></td></tr>
                    ) : sessions.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-12 text-gray-500"><span className="text-4xl block mb-2">💪</span>등록된 PT가 없습니다</td></tr>
                    ) : (
                      sessions.map((session) => {
                        const progress = session.totalSessions > 0 ? Math.round((session.usedSessions / session.totalSessions) * 100) : 0
                        return (
                          <tr key={session.id} className="hover:bg-gray-700/50 transition-colors">
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-xs md:text-sm">
                                  {session.memberName?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <span className="font-medium text-white text-sm md:text-base">{session.memberName}</span>
                                  <p className="text-xs text-gray-500 sm:hidden">{session.program}</p>
                                  <p className="text-xs text-gray-500 sm:hidden">{session.usedSessions}/{session.totalSessions}회</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4 hidden sm:table-cell"><span className="px-2 md:px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs md:text-sm font-medium">{session.program}</span></td>
                            <td className="px-3 md:px-4 py-3 md:py-4 text-center font-bold text-blue-400">{session.remainingSessions}</td>
                            <td className="px-3 md:px-4 py-3 md:py-4 hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-xs text-gray-400 w-10">{progress}%</span>
                              </div>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <select
                                value={session.trainer || ''}
                                onChange={(e) => assignTrainer(session.id, e.target.value)}
                                className="px-2 md:px-3 py-1.5 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[100px] md:max-w-none"
                              >
                                <option value="">미배정</option>
                                {trainers.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                              </select>
                            </td>
                            <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                              <div className="flex items-center justify-center gap-1 md:gap-2">
                                <button onClick={() => recordSession(session)} disabled={session.remainingSessions <= 0}
                                  className="px-2 md:px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs md:text-sm hover:bg-green-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                  ✅ <span className="hidden md:inline">출석</span>
                                </button>
                                <button onClick={() => {
                                  setScheduleForm({
                                    memberId: session.memberId,
                                    memberName: session.memberName,
                                    trainerId: session.trainer || '',
                                    trainerName: session.trainerName || '',
                                    date: selectedDate,
                                    time: '09:00',
                                  })
                                  setShowScheduleModal(true)
                                }} className="px-2 md:px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs md:text-sm hover:bg-blue-500 transition-colors">
                                  📅 <span className="hidden md:inline">예약</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3 md:gap-4">
                  <h3 className="font-semibold text-base md:text-lg text-white">PT 스케줄</h3>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 md:px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <button onClick={() => { setScheduleForm({ ...scheduleForm, date: selectedDate }); setShowScheduleModal(true) }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all w-full sm:w-auto justify-center text-sm">
                  <span>➕</span> 예약 추가
                </button>
              </div>

              {trainers.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <span className="text-4xl block mb-3">👤</span>
                  <p>트레이너를 먼저 등록해주세요</p>
                  <button onClick={() => { setActiveTab('trainers'); setShowTrainerModal(true) }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-500">
                    트레이너 추가
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead>
                      <tr>
                        <th className="p-3 bg-gray-900 border border-gray-700 text-xs font-semibold text-gray-400">시간</th>
                        {trainers.map((trainer) => (
                          <th key={trainer.id} className={`p-3 border border-gray-700 text-sm font-semibold ${getTrainerColor(trainer.color)}`}>
                            {trainer.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {TIME_SLOTS.map((time) => (
                        <tr key={time}>
                          <td className="p-3 bg-gray-900 border border-gray-700 text-center font-medium text-gray-400">{time}</td>
                          {trainers.map((trainer) => {
                            const schedule = schedules.find(
                              (s) => s.trainerId === trainer.id && s.time === time && s.date === selectedDate && s.status !== 'cancelled'
                            )
                            return (
                              <td key={trainer.id}
                                className={`p-3 border border-gray-700 text-center ${schedule ? getTrainerColor(trainer.color) : 'hover:bg-gray-700/50 cursor-pointer'}`}
                                onClick={() => {
                                  if (!schedule) {
                                    setScheduleForm({ memberId: '', memberName: '', trainerId: trainer.id, trainerName: trainer.name, date: selectedDate, time })
                                    setShowScheduleModal(true)
                                  }
                                }}
                              >
                                {schedule ? (
                                  <div className="group relative">
                                    <div className="text-sm font-medium">{schedule.memberName}</div>
                                    <button onClick={(e) => { e.stopPropagation(); cancelSchedule(schedule.id) }}
                                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 w-5 h-5 bg-red-600 text-white text-xs rounded-full transition-opacity">
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Trainers Tab */}
          {activeTab === 'trainers' && (
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h3 className="font-semibold text-lg text-white">트레이너 관리</h3>
                <button onClick={() => { setTrainerForm({ name: '', phone: '', speciality: '', color: 'blue' }); setShowTrainerModal(true) }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all w-full sm:w-auto justify-center">
                  <span>➕</span> 트레이너 추가
                </button>
              </div>

              {trainers.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <span className="text-4xl block mb-3">👤</span>
                  <p>등록된 트레이너가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {trainers.map((trainer) => {
                    const trainerStats = getTrainerStats(trainer.id)
                    return (
                      <div key={trainer.id} className="bg-gray-900 border border-gray-700 rounded-2xl p-4 md:p-6">
                        <div className="flex items-center gap-3 md:gap-4 mb-4">
                          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl ${getTrainerBg(trainer.color)} text-white`}>
                            👤
                          </div>
                          <div className="flex-1">
                            <p className="text-xl font-bold text-white">{trainer.name}</p>
                            <p className="text-sm text-gray-400">{trainer.speciality}</p>
                            {trainer.phone && <p className="text-xs text-gray-500 mt-1">📱 {trainer.phone}</p>}
                          </div>
                          <button onClick={() => deleteTrainer(trainer.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="삭제">
                            🗑️
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-center mb-4">
                          <div className="bg-gray-800 rounded-xl p-3">
                            <p className="text-2xl font-bold text-blue-400">{trainerStats.members}</p>
                            <p className="text-xs text-gray-500">담당회원</p>
                          </div>
                          <div className="bg-gray-800 rounded-xl p-3">
                            <p className="text-2xl font-bold text-green-400">{trainerStats.monthlySessions}</p>
                            <p className="text-xs text-gray-500">이번달 수업</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => viewTrainerSchedule(trainer)}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors">
                            📅 스케줄 보기
                          </button>
                          <button onClick={() => openEditTrainer(trainer)}
                            className="flex-1 py-2.5 bg-gray-700 text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-600 transition-colors">
                            ✏️ 정보 수정
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PT Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">💪 PT 등록</h3>
              <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">회원 선택</label>
                <select value={registerForm.memberId} onChange={(e) => setRegisterForm({ ...registerForm, memberId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택하세요</option>
                  {members.filter((m: any) => m.role !== 'admin').map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name || m.email} {m.phone ? `(${m.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">PT 상품</label>
                <select value={registerForm.planId} onChange={(e) => setRegisterForm({ ...registerForm, planId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택하세요</option>
                  {ptPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} - {formatPrice(p.price)}원</option>
                  ))}
                </select>
              </div>
              <button onClick={handleRegisterPT}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all">
                등록하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">📅 PT 예약</h3>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">회원 선택</label>
                <select value={scheduleForm.memberId} onChange={(e) => {
                  const member = sessions.find((s) => s.memberId === e.target.value)
                  setScheduleForm({ ...scheduleForm, memberId: e.target.value, memberName: member?.memberName || '' })
                }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택하세요</option>
                  {sessions.filter((s) => s.remainingSessions > 0).map((s) => (
                    <option key={s.id} value={s.memberId}>{s.memberName} ({s.remainingSessions}회 남음)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">트레이너</label>
                <select value={scheduleForm.trainerId} onChange={(e) => {
                  const t = trainers.find((t) => t.id === e.target.value)
                  setScheduleForm({ ...scheduleForm, trainerId: e.target.value, trainerName: t?.name || '' })
                }}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택하세요</option>
                  {trainers.map((t) => (<option key={t.id} value={t.id}>{t.name} - {t.speciality}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">날짜</label>
                <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">시간</label>
                <select value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TIME_SLOTS.map((time) => (<option key={time} value={time}>{time}</option>))}
                </select>
              </div>
              <button onClick={handleBookSchedule}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all">
                예약 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Trainer Modal */}
      {showTrainerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">👤 트레이너 추가</h3>
              <button onClick={() => setShowTrainerModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">이름</label>
                <input type="text" value={trainerForm.name} onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="트레이너 이름" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">전화번호</label>
                <input type="tel" value={trainerForm.phone} onChange={(e) => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">전문분야</label>
                <input type="text" value={trainerForm.speciality} onChange={(e) => setTrainerForm({ ...trainerForm, speciality: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="웨이트/근력, 필라테스 등" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">색상</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setTrainerForm({ ...trainerForm, color: c })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        c === 'blue' ? 'bg-blue-500' : c === 'pink' ? 'bg-pink-500' : c === 'green' ? 'bg-green-500' :
                        c === 'purple' ? 'bg-purple-500' : c === 'orange' ? 'bg-orange-500' : c === 'red' ? 'bg-red-500' : 'bg-teal-500'
                      } ${trainerForm.color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`} />
                  ))}
                </div>
              </div>
              <button onClick={handleAddTrainer}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all">
                추가하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trainer Modal */}
      {showEditTrainerModal && editingTrainer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">✏️ 트레이너 정보 수정</h3>
              <button onClick={() => setShowEditTrainerModal(false)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">이름</label>
                <input type="text" value={trainerForm.name} onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">전화번호</label>
                <input type="tel" value={trainerForm.phone} onChange={(e) => setTrainerForm({ ...trainerForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">전문분야</label>
                <input type="text" value={trainerForm.speciality} onChange={(e) => setTrainerForm({ ...trainerForm, speciality: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">색상</label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setTrainerForm({ ...trainerForm, color: c })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        c === 'blue' ? 'bg-blue-500' : c === 'pink' ? 'bg-pink-500' : c === 'green' ? 'bg-green-500' :
                        c === 'purple' ? 'bg-purple-500' : c === 'orange' ? 'bg-orange-500' : c === 'red' ? 'bg-red-500' : 'bg-teal-500'
                      } ${trainerForm.color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`} />
                  ))}
                </div>
              </div>
              <button onClick={handleEditTrainer}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition-all">
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
