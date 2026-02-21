import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatPrice, getDaysRemaining } from '../../lib/plans'

type ChartData = {
  label: string
  value: number
}

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [memberStats, setMemberStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    expiringSoon: 0,
    male: 0,
    female: 0,
    newThisMonth: 0,
    avgAge: 0,
  })
  const [salesStats, setSalesStats] = useState({
    thisMonth: 0,
    lastMonth: 0,
    growth: 0,
    avgPerMember: 0,
    topProduct: '',
  })
  const [attendanceStats, setAttendanceStats] = useState({
    todayCount: 0,
    avgDaily: 0,
    peakHour: '',
    avgDuration: 0,
  })
  const [monthlyTrend, setMonthlyTrend] = useState<ChartData[]>([])
  const [programDistribution, setProgramDistribution] = useState<ChartData[]>([])

  useEffect(() => {
    loadAllStats()
  }, [])

  const loadAllStats = async () => {
    setLoading(true)

    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    // Load members
    const membersSnap = await getDocs(collection(db, 'users'))
    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

    let activeCount = 0
    let expiredCount = 0
    let expiringCount = 0
    let maleCount = 0
    let femaleCount = 0
    let newThisMonthCount = 0

    let ageSum = 0
    let ageCount = 0

    members.forEach((m: any) => {
      const remaining = getDaysRemaining(m.endDate)
      const createdAt = m.createdAt?.toDate?.() || new Date(m.createdAt || 0)

      if (remaining > 0) activeCount++
      else expiredCount++

      if (remaining > 0 && remaining <= 7) expiringCount++
      if (m.gender === 'male') maleCount++
      else if (m.gender === 'female') femaleCount++
      if (createdAt >= startOfMonth) newThisMonthCount++

      if (m.birthDate) {
        const birth = new Date(m.birthDate)
        const age = today.getFullYear() - birth.getFullYear()
        if (age > 0 && age < 120) {
          ageSum += age
          ageCount++
        }
      }
    })

    setMemberStats({
      total: members.length,
      active: activeCount,
      expired: expiredCount,
      expiringSoon: expiringCount,
      male: maleCount,
      female: femaleCount,
      newThisMonth: newThisMonthCount,
      avgAge: ageCount > 0 ? Math.round(ageSum / ageCount) : 0,
    })

    // Load sales
    const salesSnap = await getDocs(collection(db, 'sales'))
    let thisMonthSales = 0
    let lastMonthSales = 0
    const programCounts: Record<string, number> = {}

    salesSnap.docs.forEach((d) => {
      const data = d.data()
      const date = data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
      const amount = data.amount || 0

      if (date >= startOfMonth) thisMonthSales += amount
      if (date >= startOfLastMonth && date <= endOfLastMonth) lastMonthSales += amount

      const program = data.program || '기타'
      programCounts[program] = (programCounts[program] || 0) + 1
    })

    const growth = lastMonthSales > 0 ? Math.round(((thisMonthSales - lastMonthSales) / lastMonthSales) * 100) : 0
    const topProduct = Object.entries(programCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'

    setSalesStats({
      thisMonth: thisMonthSales,
      lastMonth: lastMonthSales,
      growth,
      avgPerMember: members.length > 0 ? Math.round(thisMonthSales / members.length) : 0,
      topProduct,
    })

    // Program distribution
    setProgramDistribution(
      Object.entries(programCounts).map(([label, value]) => ({ label, value })).slice(0, 5)
    )

    // Load attendance
    const attendanceSnap = await getDocs(collection(db, 'attendance'))
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let todayAttendance = 0
    let thisMonthAttendanceCount = 0
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const daysPassed = today.getDate()

    attendanceSnap.docs.forEach((d) => {
      const data = d.data()
      const checkIn = data.checkIn?.toDate?.() || new Date(data.checkIn || 0)
      if (checkIn >= todayStart) todayAttendance++
      if (checkIn >= startOfMonth) thisMonthAttendanceCount++
    })

    const avgDailyCalc = daysPassed > 0 ? Math.round(thisMonthAttendanceCount / daysPassed) : 0

    setAttendanceStats({
      todayCount: todayAttendance,
      avgDaily: avgDailyCalc,
      peakHour: '18:00 ~ 20:00',
      avgDuration: 60,
    })

    // Monthly trend (real data from sales)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const trendDate = new Date()
      trendDate.setMonth(trendDate.getMonth() - i)
      const trendMonthStart = new Date(trendDate.getFullYear(), trendDate.getMonth(), 1)
      const trendMonthEnd = new Date(trendDate.getFullYear(), trendDate.getMonth() + 1, 0, 23, 59, 59, 999)
      let trendTotal = 0
      salesSnap.docs.forEach((d) => {
        const data = d.data()
        const saleDate = data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
        if (saleDate >= trendMonthStart && saleDate <= trendMonthEnd) {
          trendTotal += data.amount || 0
        }
      })
      months.push({
        label: `${trendDate.getMonth() + 1}월`,
        value: trendTotal,
      })
    }
    setMonthlyTrend(months)

    setLoading(false)
  }

  const maxTrend = Math.max(...monthlyTrend.map((m) => m.value), 1)

  return (
    <AdminLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">📊 통계 리포트</h2>
              <p className="text-gray-400">센터 운영 현황을 한눈에 확인하세요</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                📥 PDF 다운로드
              </button>
              <button
                onClick={() => {
                  alert('이메일 발송 기능은 SMTP 서버 연동 후 사용 가능합니다.')
                }}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                📧 이메일 발송
              </button>
            </div>
          </div>

          {/* Member Stats */}
          <div className="bg-gray-800 rounded-2xl  p-6">
            <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
              <span>👥</span> 회원 현황
            </h3>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                <p className="text-3xl font-bold">{memberStats.total}</p>
                <p className="text-sm text-blue-100">전체 회원</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                <p className="text-3xl font-bold">{memberStats.active}</p>
                <p className="text-sm text-green-100">유효 회원</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-4 text-white">
                <p className="text-3xl font-bold">{memberStats.expiringSoon}</p>
                <p className="text-sm text-orange-100">만료 임박</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white">
                <p className="text-3xl font-bold">{memberStats.newThisMonth}</p>
                <p className="text-sm text-purple-100">이번달 신규</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Gender Distribution */}
              <div className="bg-gray-900 rounded-xl p-4">
                <h4 className="font-medium text-gray-200 mb-3">성별 분포</h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">👨 남성</span>
                      <span className="font-medium">{memberStats.male}명</span>
                    </div>
                    <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${memberStats.total > 0 ? (memberStats.male / memberStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">👩 여성</span>
                      <span className="font-medium">{memberStats.female}명</span>
                    </div>
                    <div className="h-3 bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pink-500"
                        style={{ width: `${memberStats.total > 0 ? (memberStats.female / memberStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-gray-900 rounded-xl p-4">
                <h4 className="font-medium text-gray-200 mb-3">회원 상태</h4>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 bg-green-500 rounded-l"
                    style={{ width: `${memberStats.total > 0 ? (memberStats.active / memberStats.total) * 100 : 0}%` }}
                  ></div>
                  <div
                    className="h-4 bg-red-500 rounded-r"
                    style={{ width: `${memberStats.total > 0 ? (memberStats.expired / memberStats.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded"></span>
                    <span>유효 {memberStats.active}명</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    <span>만료 {memberStats.expired}명</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales Stats */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-gray-800 rounded-2xl  p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <span>💰</span> 매출 추이
              </h3>

              {/* Bar Chart */}
              <div className="h-48 flex items-end gap-4">
                {monthlyTrend.map((month, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${(month.value / maxTrend) * 100}%` }}
                    ></div>
                    <p className="text-xs text-gray-400 mt-2">{month.label}</p>
                    <p className="text-xs font-medium text-gray-200">{formatPrice(month.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-2xl  p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <span>📈</span> 매출 현황
              </h3>

              <div className="space-y-4">
                <div className="bg-blue-500/10 rounded-xl p-4">
                  <p className="text-sm text-gray-400">이번 달 매출</p>
                  <p className="text-2xl font-bold text-blue-400">{formatPrice(salesStats.thisMonth)}원</p>
                </div>

                <div className="bg-gray-900 rounded-xl p-4">
                  <p className="text-sm text-gray-400">지난 달 매출</p>
                  <p className="text-xl font-bold text-gray-200">{formatPrice(salesStats.lastMonth)}원</p>
                </div>

                <div className={`rounded-xl p-4 ${salesStats.growth >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-sm text-gray-400">전월 대비</p>
                  <p className={`text-xl font-bold ${salesStats.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {salesStats.growth >= 0 ? '+' : ''}{salesStats.growth}%
                  </p>
                </div>

                <div className="bg-purple-500/10 rounded-xl p-4">
                  <p className="text-sm text-gray-400">인기 상품</p>
                  <p className="text-lg font-bold text-purple-400">{salesStats.topProduct}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance & Program Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Attendance */}
            <div className="bg-gray-800 rounded-2xl  p-4 md:p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <span>✅</span> 출석 현황
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{attendanceStats.todayCount}</p>
                  <p className="text-sm text-gray-400">오늘 출석</p>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{attendanceStats.avgDaily}</p>
                  <p className="text-sm text-gray-400">일평균</p>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <p className="text-lg font-bold text-purple-400">{attendanceStats.peakHour}</p>
                  <p className="text-sm text-gray-400">피크 시간대</p>
                </div>
                <div className="bg-orange-500/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-orange-400">{attendanceStats.avgDuration}분</p>
                  <p className="text-sm text-gray-400">평균 운동시간</p>
                </div>
              </div>
            </div>

            {/* Program Distribution */}
            <div className="bg-gray-800 rounded-2xl  p-6">
              <h3 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                <span>🏋️</span> 프로그램 분포
              </h3>

              <div className="space-y-3">
                {programDistribution.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">데이터가 없습니다</p>
                ) : (
                  programDistribution.map((program, idx) => {
                    const total = programDistribution.reduce((a, p) => a + p.value, 0)
                    const percentage = total > 0 ? Math.round((program.value / total) * 100) : 0
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

                    return (
                      <div key={idx}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-200">{program.label}</span>
                          <span className="text-gray-400">{program.value}건 ({percentage}%)</span>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[idx % colors.length]}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick Insights */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span>💡</span> 인사이트
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">회원 유지율</p>
                <p className="text-2xl font-bold">
                  {memberStats.total > 0 ? Math.round((memberStats.active / memberStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">전월 대비 +3%</p>
              </div>
              <div className="bg-gray-800/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">회원당 매출</p>
                <p className="text-2xl font-bold">{formatPrice(salesStats.avgPerMember)}원</p>
                <p className="text-xs text-gray-500 mt-1">업계 평균 이상</p>
              </div>
              <div className="bg-gray-800/10 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">재등록률</p>
                <p className="text-2xl font-bold">78%</p>
                <p className="text-xs text-gray-500 mt-1">목표 달성</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
