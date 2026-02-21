import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatPrice } from '../../lib/plans'

type DaySales = {
  date: string
  day: number
  total: number
  card: number
  cash: number
  transfer: number
  count: number
}

export default function MonthlySales() {
  const [monthData, setMonthData] = useState<DaySales[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  useEffect(() => {
    loadMonthData()
  }, [selectedYear, selectedMonth])

  const loadMonthData = async () => {
    setLoading(true)

    const startOfMonth = new Date(selectedYear, selectedMonth - 1, 1)
    const endOfMonth = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
    const daysInMonth = endOfMonth.getDate()

    // Initialize all days
    const dayMap = new Map<number, DaySales>()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dayMap.set(d, {
        date: dateStr,
        day: d,
        total: 0,
        card: 0,
        cash: 0,
        transfer: 0,
        count: 0,
      })
    }

    // Load sales
    const snap = await getDocs(query(collection(db, 'sales'), orderBy('createdAt', 'desc')))
    snap.docs.forEach((doc) => {
      const data = doc.data()
      const date = data.createdAt?.toDate?.() || new Date(data.createdAt)

      if (date >= startOfMonth && date <= endOfMonth) {
        const day = date.getDate()
        const current = dayMap.get(day)!
        current.total += data.amount || 0
        current.count += 1

        if (data.paymentMethod === 'card') current.card += data.amount || 0
        else if (data.paymentMethod === 'cash') current.cash += data.amount || 0
        else if (data.paymentMethod === 'transfer') current.transfer += data.amount || 0

        dayMap.set(day, current)
      }
    })

    setMonthData(Array.from(dayMap.values()))
    setLoading(false)
  }

  const stats = {
    total: monthData.reduce((a, d) => a + d.total, 0),
    card: monthData.reduce((a, d) => a + d.card, 0),
    cash: monthData.reduce((a, d) => a + d.cash, 0),
    transfer: monthData.reduce((a, d) => a + d.transfer, 0),
    count: monthData.reduce((a, d) => a + d.count, 0),
    avgDaily: monthData.filter((d) => d.total > 0).length > 0
      ? Math.round(monthData.reduce((a, d) => a + d.total, 0) / monthData.filter((d) => d.total > 0).length)
      : 0,
    bestDay: monthData.reduce((max, d) => (d.total > max.total ? d : max), monthData[0] || { day: 0, total: 0 }),
    activeDays: monthData.filter((d) => d.total > 0).length,
  }

  const getDayOfWeek = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day)
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[date.getDay()]
  }

  const isWeekend = (year: number, month: number, day: number) => {
    const date = new Date(year, month - 1, day)
    return date.getDay() === 0 || date.getDay() === 6
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === day
  }

  const navigateMonth = (delta: number) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear

    if (newMonth > 12) {
      newMonth = 1
      newYear += 1
    } else if (newMonth < 1) {
      newMonth = 12
      newYear -= 1
    }

    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
  }

  // Generate calendar grid
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay()
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const weeks: (DaySales | null)[][] = []
  let currentWeek: (DaySales | null)[] = new Array(firstDayOfMonth).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    const dayData = monthData.find((m) => m.day === d)
    currentWeek.push(dayData || null)

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Month Navigation */}
        <div className="bg-gray-800 rounded-2xl  p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-3 hover:bg-gray-700 rounded-xl transition-colors text-xl"
              >
                ←
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>{y}년</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-4 py-2 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                    <option key={m} value={m}>{m}월</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-3 hover:bg-gray-700 rounded-xl transition-colors text-xl"
              >
                →
              </button>
              <button
                onClick={() => {
                  setSelectedYear(new Date().getFullYear())
                  setSelectedMonth(new Date().getMonth() + 1)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                이번 달
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const header = '날짜,총매출,카드,현금,이체,건수\n'
                  const rows = monthData.map((d) =>
                    `${d.date},${d.total},${d.card},${d.cash},${d.transfer},${d.count}`
                  ).join('\n')
                  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `월매출_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                📥 엑셀 다운로드
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition-colors"
              >
                🖨️ 인쇄
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">💰</span>
              <span className="text-xs bg-gray-800/20 px-2 py-1 rounded-full">{stats.count}건</span>
            </div>
            <p className="text-3xl font-bold">{formatPrice(stats.total)}원</p>
            <p className="text-sm text-blue-100 mt-1">{selectedMonth}월 총 매출</p>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{formatPrice(stats.avgDaily)}원</p>
                <p className="text-sm text-gray-400">일평균 매출</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl">
                🏆
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-400">{formatPrice(stats.bestDay?.total || 0)}원</p>
                <p className="text-sm text-gray-400">최고 매출 ({stats.bestDay?.day || '-'}일)</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                📅
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.activeDays}일</p>
                <p className="text-sm text-gray-400">매출 발생일</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💳</span>
                <span className="font-medium text-gray-200">카드 결제</span>
              </div>
              <span className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round((stats.card / stats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{formatPrice(stats.card)}원</p>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${stats.total > 0 ? (stats.card / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💵</span>
                <span className="font-medium text-gray-200">현금 결제</span>
              </div>
              <span className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round((stats.cash / stats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatPrice(stats.cash)}원</p>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${stats.total > 0 ? (stats.cash / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🏦</span>
                <span className="font-medium text-gray-200">계좌 이체</span>
              </div>
              <span className="text-sm text-gray-500">
                {stats.total > 0 ? Math.round((stats.transfer / stats.total) * 100) : 0}%
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.transfer)}원</p>
            <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{ width: `${stats.total > 0 ? (stats.transfer / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="bg-gray-800 rounded-2xl  overflow-hidden">
          <div className="p-5 border-b border-gray-700">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <span>📅</span> 월별 매출 캘린더
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                  <div
                    key={day}
                    className={`text-center py-2 font-semibold text-sm ${
                      idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-300'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-2 mb-2">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`min-h-24 p-2 rounded-xl border transition-all ${
                        !day
                          ? 'bg-gray-900 border-transparent'
                          : isToday(selectedYear, selectedMonth, day.day)
                          ? 'bg-blue-500/10 border-blue-300 ring-2 ring-blue-500'
                          : day.total > 0
                          ? 'bg-green-500/10 border-green-600 hover:shadow-md cursor-pointer'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-700'
                      }`}
                    >
                      {day && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-sm font-medium ${
                                isWeekend(selectedYear, selectedMonth, day.day)
                                  ? dayIdx === 0
                                    ? 'text-red-500'
                                    : 'text-blue-500'
                                  : 'text-gray-200'
                              }`}
                            >
                              {day.day}
                            </span>
                            {day.count > 0 && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                                {day.count}건
                              </span>
                            )}
                          </div>
                          {day.total > 0 ? (
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-400">
                                {formatPrice(day.total)}
                              </p>
                              <div className="flex justify-end gap-1 mt-1">
                                {day.card > 0 && (
                                  <span className="text-xs text-blue-500">💳</span>
                                )}
                                {day.cash > 0 && (
                                  <span className="text-xs text-green-500">💵</span>
                                )}
                                {day.transfer > 0 && (
                                  <span className="text-xs text-purple-500">🏦</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center mt-2">-</p>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Breakdown Table */}
        <div className="bg-gray-800 rounded-2xl ">
          <div className="p-5 border-b border-gray-700">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <span>📋</span> 일별 상세 매출
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">날짜</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">요일</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">건수</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">카드</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">현금</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">이체</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {monthData.filter((d) => d.total > 0).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      해당 월의 매출 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  monthData
                    .filter((d) => d.total > 0)
                    .map((day) => (
                      <tr key={day.day} className="hover:bg-gray-900 transition-colors">
                        <td className="px-5 py-3 font-medium text-white">{day.date}</td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isWeekend(selectedYear, selectedMonth, day.day)
                                ? new Date(selectedYear, selectedMonth - 1, day.day).getDay() === 0
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-blue-500/20 text-blue-400'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {getDayOfWeek(selectedYear, selectedMonth, day.day)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">{day.count}</td>
                        <td className="px-5 py-3 text-right text-blue-400">{formatPrice(day.card)}원</td>
                        <td className="px-5 py-3 text-right text-green-400">{formatPrice(day.cash)}원</td>
                        <td className="px-5 py-3 text-right text-purple-400">{formatPrice(day.transfer)}원</td>
                        <td className="px-5 py-3 text-right font-bold text-white">{formatPrice(day.total)}원</td>
                      </tr>
                    ))
                )}
              </tbody>
              {monthData.filter((d) => d.total > 0).length > 0 && (
                <tfoot className="bg-gray-700">
                  <tr>
                    <td colSpan={2} className="px-5 py-3 font-semibold text-gray-200">합계</td>
                    <td className="px-5 py-3 text-center font-semibold">{stats.count}</td>
                    <td className="px-5 py-3 text-right font-bold text-blue-400">{formatPrice(stats.card)}원</td>
                    <td className="px-5 py-3 text-right font-bold text-green-400">{formatPrice(stats.cash)}원</td>
                    <td className="px-5 py-3 text-right font-bold text-purple-400">{formatPrice(stats.transfer)}원</td>
                    <td className="px-5 py-3 text-right font-bold text-xl text-blue-400">{formatPrice(stats.total)}원</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
