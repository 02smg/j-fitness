import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatPrice } from '../../lib/plans'
import Link from 'next/link'

type Stats = {
  totalMembers: number
  activeMembers: number
  expiringSoon: number
  newToday: number
  todaySales: number
  monthlySales: number
  todayAttendance: number
  activeLockers: number
}

type RecentActivity = {
  id: string
  type: 'register' | 'attendance' | 'payment' | 'expiring'
  message: string
  time: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringSoon: 0,
    newToday: 0,
    todaySales: 0,
    monthlySales: 0,
    todayAttendance: 0,
    activeLockers: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Get members
      const usersSnap = await getDocs(collection(db, 'users'))
      const members = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      // Count stats
      let activeCount = 0
      let expiringCount = 0
      let newTodayCount = 0

      members.forEach((m: any) => {
        const endDate = m.endDate?.toDate?.() || new Date(m.endDate)
        const createdAt = m.createdAt?.toDate?.() || new Date(m.createdAt || 0)

        if (endDate > today) {
          activeCount++
          const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 7) expiringCount++
        }

        if (createdAt >= today) newTodayCount++
      })

      // Get sales
      const salesSnap = await getDocs(collection(db, 'sales'))
      let todaySalesTotal = 0
      let monthlySalesTotal = 0

      salesSnap.docs.forEach((d) => {
        const data = d.data()
        const saleDate = data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
        const amount = data.amount || 0

        if (saleDate >= startOfMonth) monthlySalesTotal += amount
        if (saleDate >= today) todaySalesTotal += amount
      })

      // Get today's attendance
      const attendanceSnap = await getDocs(collection(db, 'attendance'))
      let todayAttendanceCount = 0

      attendanceSnap.docs.forEach((d) => {
        const data = d.data()
        const checkIn = data.checkIn?.toDate?.() || new Date(data.checkIn || 0)
        if (checkIn >= today) todayAttendanceCount++
      })

      // Get active lockers
      const lockersSnap = await getDocs(query(collection(db, 'lockers'), where('status', '==', 'occupied')))

      setStats({
        totalMembers: members.length,
        activeMembers: activeCount,
        expiringSoon: expiringCount,
        newToday: newTodayCount,
        todaySales: todaySalesTotal,
        monthlySales: monthlySalesTotal,
        todayAttendance: todayAttendanceCount,
        activeLockers: lockersSnap.size,
      })

      // Build real recent activities from data
      const activities: RecentActivity[] = []

      // Recent registrations
      members.forEach((m: any) => {
        const createdAt = m.createdAt?.toDate?.() || new Date(m.createdAt || 0)
        if (createdAt >= today) {
          activities.push({
            id: `reg-${m.id}`,
            type: 'register',
            message: `신규회원 ${m.name || m.email?.split('@')[0] || '알수없음'}님이 등록되었습니다.`,
            time: createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          })
        }
      })

      // Recent attendance
      attendanceSnap.docs.slice(0, 5).forEach((d) => {
        const data = d.data()
        const checkIn = data.checkIn?.toDate?.() || new Date(data.checkIn || 0)
        if (checkIn >= today) {
          activities.push({
            id: `att-${d.id}`,
            type: 'attendance',
            message: `${data.memberName || '회원'}님이 출석체크 하였습니다.`,
            time: checkIn.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          })
        }
      })

      // Recent sales
      salesSnap.docs.slice(0, 5).forEach((d) => {
        const data = d.data()
        const saleDate = data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
        if (saleDate >= today) {
          activities.push({
            id: `sale-${d.id}`,
            type: 'payment',
            message: `${data.userName || '회원'}님이 ${data.program || '상품'}을 결제했습니다.`,
            time: saleDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          })
        }
      })

      // Expiring soon members
      members.forEach((m: any) => {
        const endDate = m.endDate?.toDate?.() || new Date(m.endDate)
        const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (daysLeft > 0 && daysLeft <= 7) {
          activities.push({
            id: `exp-${m.id}`,
            type: 'expiring',
            message: `${m.name || '회원'}님 회원권이 ${daysLeft}일 후 만료됩니다.`,
            time: `D-${daysLeft}`,
          })
        }
      })

      // Sort by most recent and limit to 10
      setRecentActivities(activities.slice(0, 10))

      setLoading(false)
    }

    loadStats()
  }, [])

  const statCards = [
    {
      label: '전체 회원',
      value: stats.totalMembers,
      icon: '👥',
      color: 'from-blue-500 to-blue-600',
      link: '/admin/members',
    },
    {
      label: '유효 회원',
      value: stats.activeMembers,
      icon: '✅',
      color: 'from-green-500 to-emerald-600',
      link: '/admin/members?filter=active',
    },
    {
      label: '만료 임박',
      value: stats.expiringSoon,
      icon: '⚠️',
      color: 'from-orange-500 to-amber-600',
      link: '/admin/members?filter=expiring',
    },
    {
      label: '오늘 신규',
      value: stats.newToday,
      icon: '🆕',
      color: 'from-purple-500 to-violet-600',
      link: '/admin/members?filter=new',
    },
    {
      label: '오늘 매출',
      value: `${formatPrice(stats.todaySales)}원`,
      icon: '💰',
      color: 'from-cyan-500 to-teal-600',
      link: '/admin/daily-sales',
    },
    {
      label: '이번 달 매출',
      value: `${formatPrice(stats.monthlySales)}원`,
      icon: '📈',
      color: 'from-pink-500 to-rose-600',
      link: '/admin/monthly-sales',
    },
    {
      label: '오늘 출석',
      value: stats.todayAttendance,
      icon: '🏃',
      color: 'from-indigo-500 to-blue-600',
      link: '/admin/attendance',
    },
    {
      label: '사용중 라커',
      value: stats.activeLockers,
      icon: '🔐',
      color: 'from-slate-500 to-gray-600',
      link: '/admin/lockers',
    },
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'register':
        return '🆕'
      case 'attendance':
        return '✅'
      case 'payment':
        return '💳'
      case 'expiring':
        return '⚠️'
      default:
        return '📌'
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'register':
        return 'bg-blue-500/20 text-blue-400'
      case 'attendance':
        return 'bg-green-500/20 text-green-400'
      case 'payment':
        return 'bg-purple-500/20 text-purple-400'
      case 'expiring':
        return 'bg-orange-500/20 text-orange-400'
      default:
        return 'bg-gray-700 text-gray-400'
    }
  }

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card, idx) => (
              <Link
                key={idx}
                href={card.link}
                className="group bg-gray-800 rounded-2xl  hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className={`h-1 bg-gradient-to-r ${card.color}`}></div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl group-hover:scale-110 transition-transform">{card.icon}</span>
                    <span className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors">자세히 →</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{card.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{card.label}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activities */}
            <div className="lg:col-span-2 bg-gray-800 rounded-2xl ">
              <div className="p-5 border-b border-gray-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span>🔔</span> 최근 활동
                </h3>
              </div>
              <div className="divide-y divide-gray-700">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-900 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-700">
                <button className="w-full text-center text-sm text-blue-500 hover:text-blue-400 font-medium">
                  모든 활동 보기 →
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-2xl ">
              <div className="p-5 border-b border-gray-700">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span>⚡</span> 빠른 실행
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <Link
                  href="/admin/register"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all"
                >
                  <span className="text-2xl">➕</span>
                  <div>
                    <p className="font-medium">신규 회원 등록</p>
                    <p className="text-xs text-blue-100">새로운 회원 추가하기</p>
                  </div>
                </Link>
                <Link
                  href="/admin/attendance"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-gray-200">출석 체크</p>
                    <p className="text-xs text-gray-400">회원 출석 기록</p>
                  </div>
                </Link>
                <Link
                  href="/admin/lockers"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  <span className="text-2xl">🔐</span>
                  <div>
                    <p className="font-medium text-gray-200">라커 배정</p>
                    <p className="text-xs text-gray-400">라커 현황 관리</p>
                  </div>
                </Link>
                <Link
                  href="/admin/pt"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-700 hover:bg-gray-600 transition-all"
                >
                  <span className="text-2xl">💪</span>
                  <div>
                    <p className="font-medium text-gray-200">PT 예약</p>
                    <p className="text-xs text-gray-400">PT 스케줄 관리</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Expiring Soon Section */}
          {stats.expiringSoon > 0 && (
            <div className="bg-gray-800 rounded-2xl border border-orange-500/30 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-orange-400">만료 임박 회원 {stats.expiringSoon}명</p>
                    <p className="text-sm text-orange-400">7일 이내 만료 예정인 회원들입니다. 연장 권유가 필요합니다.</p>
                  </div>
                </div>
                <Link
                  href="/admin/members?filter=expiring"
                  className="px-4 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium"
                >
                  확인하기
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  )
}
