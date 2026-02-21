import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { formatPrice } from '../../lib/plans'

type Sale = {
  id: string
  userName: string
  type: string
  program: string
  amount: number
  paymentMethod: 'card' | 'cash' | 'transfer'
  createdAt: any
  items?: { type: string; name: string; amount: number }[]
}

export default function DailySales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadSales()
  }, [selectedDate])

  const loadSales = async () => {
    setLoading(true)
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)

    const snap = await getDocs(query(collection(db, 'sales'), orderBy('createdAt', 'desc')))
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const date = s.createdAt?.toDate?.() || new Date(s.createdAt)
        return date >= startOfDay && date <= endOfDay
      }) as Sale[]

    setSales(items)
    setLoading(false)
  }

  const stats = {
    total: sales.reduce((a, s) => a + s.amount, 0),
    card: sales.filter((s) => s.paymentMethod === 'card').reduce((a, s) => a + s.amount, 0),
    cash: sales.filter((s) => s.paymentMethod === 'cash').reduce((a, s) => a + s.amount, 0),
    transfer: sales.filter((s) => s.paymentMethod === 'transfer').reduce((a, s) => a + s.amount, 0),
    count: sales.length,
    membership: sales.filter((s) => s.type === 'membership').reduce((a, s) => a + s.amount, 0),
    pt: sales.filter((s) => s.type === 'pt').reduce((a, s) => a + s.amount, 0),
    locker: sales.filter((s) => s.type === 'locker').reduce((a, s) => a + s.amount, 0),
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'card':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">💳 카드</span>
      case 'cash':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">💵 현금</span>
      case 'transfer':
        return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">🏦 이체</span>
      default:
        return <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium">-</span>
    }
  }

  const navigateDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Date Navigation */}
        <div className="bg-gray-800 rounded-2xl  p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
              >
                ←
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
              />
              <button
                onClick={() => navigateDate(1)}
                className="p-2 hover:bg-gray-700 rounded-xl transition-colors"
              >
                →
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                오늘
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const header = '시간,회원,항목,결제수단,금액\n'
                  const rows = sales.map((s) => {
                    const time = s.createdAt?.toDate ? s.createdAt.toDate().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'
                    return `${time},${s.userName},${s.program},${s.paymentMethod},${s.amount}`
                  }).join('\n')
                  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `일매출_${selectedDate}.csv`
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
            <p className="text-sm text-blue-100 mt-1">총 매출</p>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl">
                💳
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{formatPrice(stats.card)}원</p>
                <p className="text-sm text-gray-400">카드 결제</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl">
                💵
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{formatPrice(stats.cash)}원</p>
                <p className="text-sm text-gray-400">현금 결제</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                🏦
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{formatPrice(stats.transfer)}원</p>
                <p className="text-sm text-gray-400">계좌 이체</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  🏋️
                </div>
                <div>
                  <p className="text-sm text-gray-400">회원권</p>
                  <p className="text-lg font-bold text-white">{formatPrice(stats.membership)}원</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {stats.total > 0 ? Math.round((stats.membership / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  💪
                </div>
                <div>
                  <p className="text-sm text-gray-400">PT</p>
                  <p className="text-lg font-bold text-white">{formatPrice(stats.pt)}원</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {stats.total > 0 ? Math.round((stats.pt / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl  p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal-500/20 flex items-center justify-center">
                  🔐
                </div>
                <div>
                  <p className="text-sm text-gray-400">라커</p>
                  <p className="text-lg font-bold text-white">{formatPrice(stats.locker)}원</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {stats.total > 0 ? Math.round((stats.locker / stats.total) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-gray-800 rounded-2xl ">
          <div className="p-5 border-b border-gray-700">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <span>📋</span> 거래 내역
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">시간</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">회원</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">항목</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-400 uppercase">결제수단</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-400 uppercase">금액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                    </td>
                  </tr>
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <span className="text-4xl block mb-2">💰</span>
                      해당 날짜의 거래 내역이 없습니다
                    </td>
                  </tr>
                ) : (
                  sales.map((sale, idx) => (
                    <tr key={sale.id} className="hover:bg-gray-900 transition-colors">
                      <td className="px-5 py-4 text-gray-300">{idx + 1}</td>
                      <td className="px-5 py-4 font-medium text-white">{formatTime(sale.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                            {sale.userName?.charAt(0) || '?'}
                          </div>
                          <span className="font-medium text-white">{sale.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-3 py-1 bg-gray-700 text-gray-200 rounded-lg text-sm">
                          {sale.program}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">{getPaymentBadge(sale.paymentMethod)}</td>
                      <td className="px-5 py-4 text-right font-bold text-blue-400">
                        {formatPrice(sale.amount)}원
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sales.length > 0 && (
                <tfoot className="bg-gray-900">
                  <tr>
                    <td colSpan={5} className="px-5 py-4 text-right font-semibold text-gray-200">
                      합계
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-xl text-blue-400">
                      {formatPrice(stats.total)}원
                    </td>
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
