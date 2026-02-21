import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'

type Payment = {
  id: string
  type: string
  programName: string
  amount: number
  paymentMethod: string
  createdAt: { seconds: number }
}

export default function MemberPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'membership' | 'pt' | 'locker'>('all')

  useEffect(() => {
    if (!user) return
    loadPayments()
  }, [user])

  const loadPayments = async () => {
    if (!user) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'sales'),
          where('memberId', '==', user.uid)
        )
      )
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Payment[]
      // 클라이언트에서 정렬
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setPayments(items)
    } catch (e) {
      console.log('No index or empty')
    }
    setLoading(false)
  }

  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.type === filter)

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'membership': return '🏋️ 회원권'
      case 'pt': return '💪 PT'
      case 'locker': return '🔐 라커'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'membership': return 'bg-blue-500/20 text-blue-400'
      case 'pt': return 'bg-purple-500/20 text-purple-400'
      case 'locker': return 'bg-gray-700 text-gray-200'
      default: return 'bg-gray-700 text-gray-300'
    }
  }

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
        <h1 className="text-2xl font-bold text-white">💳 결제 내역</h1>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 text-white">
          <p className="text-sm text-blue-100 mb-1">총 결제 금액</p>
          <p className="text-3xl font-bold">{totalAmount.toLocaleString()}원</p>
          <p className="text-sm text-blue-200 mt-2">총 {payments.length}건의 결제</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'membership', label: '🏋️ 회원권' },
            { key: 'pt', label: '💪 PT' },
            { key: 'locker', label: '🔐 라커' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition ${
                filter === f.key 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Payment List */}
        {filteredPayments.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 ">
            <p className="text-6xl mb-4">💳</p>
            <p className="text-lg mb-2">결제 내역이 없습니다</p>
            <p className="text-sm text-gray-500">아직 결제한 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="bg-gray-800 rounded-2xl  p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getTypeColor(payment.type)}`}>
                        {getTypeLabel(payment.type)}
                      </span>
                    </div>
                    <p className="font-semibold text-white">{payment.programName}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {payment.createdAt?.seconds
                        ? new Date(payment.createdAt.seconds * 1000).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {(payment.amount || 0).toLocaleString()}원
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {payment.paymentMethod === 'card' && '💳 카드'}
                      {payment.paymentMethod === 'cash' && '💵 현금'}
                      {payment.paymentMethod === 'transfer' && '🏦 계좌이체'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payment Methods Info */}
        <div className="bg-gray-900 rounded-2xl p-5">
          <h2 className="font-semibold text-gray-200 mb-3">📌 결제 안내</h2>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• 카드 결제: 현장에서 카드 결제가 가능합니다</li>
            <li>• 계좌이체: 국민은행 123-456-789012 J휘트니스</li>
            <li>• 현금 결제: 현장에서 현금 결제가 가능합니다</li>
            <li>• 영수증 발급: 프런트 데스크에 문의해주세요</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}
