import MemberLayout from '../../components/MemberLayout'
import { useState } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'
import { membershipPlans, ptPlans, lockerPlans, formatPrice } from '../../lib/plans'

export default function MemberPurchase() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'membership' | 'pt' | 'locker'>('membership')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const plans =
    tab === 'membership' ? membershipPlans : tab === 'pt' ? ptPlans : lockerPlans

  const handleSubmit = async () => {
    if (!user || !selectedPlan) return

    const plan = plans.find((p) => p.id === selectedPlan)
    if (!plan) return

    if (!confirm(`${plan.name} (${formatPrice(plan.price)}원)을 신청하시겠습니까?\n관리자 승인 후 이용이 가능합니다.`))
      return

    setSubmitting(true)
    try {
      // 회원 정보 가져오기
      let memberName = ''
      let memberPhone = ''
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          memberName = userDoc.data().name || ''
          memberPhone = userDoc.data().phone || ''
        }
      } catch (_) {}
      await addDoc(collection(db, 'member_requests'), {
        memberId: user.uid,
        memberEmail: user.email,
        memberName,
        memberPhone,
        type: 'purchase',
        purchaseType: tab,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setSuccess(true)
      setSelectedPlan(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      alert('신청에 실패했습니다.')
    }
    setSubmitting(false)
  }

  return (
    <MemberLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">🛒 이용권 구매 신청</h1>

        {success && (
          <div className="p-4 bg-green-500/10 border border-green-600 rounded-2xl text-green-400 flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>구매 신청이 완료되었습니다! 관리자 승인 후 이용 가능합니다.</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 bg-gray-700 p-1 rounded-xl">
          {[
            { key: 'membership' as const, label: '🏋️ 회원권', color: 'blue' },
            { key: 'pt' as const, label: '💪 PT', color: 'purple' },
            { key: 'locker' as const, label: '🔐 라커', color: 'slate' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setSelectedPlan(null)
              }}
              className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? `bg-${t.color}-500 text-white shadow-md`
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={
                tab === t.key
                  ? {
                      background:
                        t.key === 'membership'
                          ? '#3b82f6'
                          : t.key === 'pt'
                          ? '#8b5cf6'
                          : '#64748b',
                      color: '#fff',
                    }
                  : {}
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.id
            return (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`text-left p-5 rounded-2xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">
                    {tab === 'membership' ? '🏋️' : tab === 'pt' ? '💪' : '🔐'}
                  </span>
                  {isSelected && (
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                      ✓
                    </span>
                  )}
                </div>
                <p className="font-bold text-lg text-white">{plan.name}</p>
                {'sessions' in plan && (
                  <p className="text-sm text-gray-400 mt-1">
                    총 {(plan as any).sessions}회 · 회당{' '}
                    {formatPrice(Math.round(plan.price / (plan as any).sessions))}원
                  </p>
                )}
                {'duration' in plan && (
                  <p className="text-sm text-gray-400 mt-1">{(plan as any).duration}일</p>
                )}
                <p className="text-2xl font-bold mt-3" style={{ color: tab === 'membership' ? '#3b82f6' : tab === 'pt' ? '#8b5cf6' : '#64748b' }}>
                  {formatPrice(plan.price)}원
                </p>
              </button>
            )
          })}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!selectedPlan || submitting}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? '신청 중...' : selectedPlan ? '구매 신청하기' : '상품을 선택해주세요'}
        </button>

        {/* Guide */}
        <div className="bg-blue-500/10 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-400 mb-3">📌 구매 안내</h3>
          <ul className="space-y-2 text-sm text-blue-400">
            <li>• 구매 신청 후 관리자 승인이 필요합니다</li>
            <li>• 결제는 현장 방문 시 카드/현금/계좌이체로 가능합니다</li>
            <li>• 승인 후 이용 시작일부터 기간이 시작됩니다</li>
            <li>• 환불은 정지/환불 신청 메뉴에서 가능합니다</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}
