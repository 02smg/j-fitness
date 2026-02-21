import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, doc, getDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'

type Request = {
  id: string
  type: 'pause' | 'refund'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: { seconds: number }
  pauseStart?: string
  pauseEnd?: string
  refundAmount?: number
}

export default function MemberRequests() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'list' | 'pause' | 'refund'>('list')
  const [submitting, setSubmitting] = useState(false)

  // Pause form
  const [pauseStart, setPauseStart] = useState('')
  const [pauseEnd, setPauseEnd] = useState('')
  const [pauseReason, setPauseReason] = useState('')

  // Refund form
  const [refundReason, setRefundReason] = useState('')
  const [refundBank, setRefundBank] = useState('')
  const [refundAccount, setRefundAccount] = useState('')

  useEffect(() => {
    if (!user) return
    loadRequests()
  }, [user])

  const loadRequests = async () => {
    if (!user) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(
          collection(db, 'member_requests'),
          where('memberId', '==', user.uid)
        )
      )
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Request[]
      // 클라이언트에서 정렬
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setRequests(items)
    } catch (e) {
      console.log('No index yet or empty')
    }
    setLoading(false)
  }

  const handlePauseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
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
      type: 'pause',
      pauseStart,
      pauseEnd,
      reason: pauseReason,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    setPauseStart('')
    setPauseEnd('')
    setPauseReason('')
    setTab('list')
    loadRequests()
    setSubmitting(false)
  }

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    let rMemberName = ''
    let rMemberPhone = ''
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        rMemberName = userDoc.data().name || ''
        rMemberPhone = userDoc.data().phone || ''
      }
    } catch (_) {}
    await addDoc(collection(db, 'member_requests'), {
      memberId: user.uid,
      memberEmail: user.email,
      memberName: rMemberName,
      memberPhone: rMemberPhone,
      type: 'refund',
      reason: refundReason,
      bank: refundBank,
      account: refundAccount,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    setRefundReason('')
    setRefundBank('')
    setRefundAccount('')
    setTab('list')
    loadRequests()
    setSubmitting(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">대기중</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">승인됨</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">거절됨</span>
      default:
        return null
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
        <h1 className="text-2xl font-bold text-white">📝 정지/환불 신청</h1>

        {/* Tab Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            신청 내역
          </button>
          <button
            onClick={() => setTab('pause')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === 'pause' ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⏸️ 정지 신청
          </button>
          <button
            onClick={() => setTab('refund')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === 'refund' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            💰 환불 신청
          </button>
        </div>

        {/* List Tab */}
        {tab === 'list' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 ">
                <p className="text-6xl mb-4">📋</p>
                <p className="text-lg mb-2">신청 내역이 없습니다</p>
                <p className="text-sm text-gray-500">정지 또는 환불이 필요하신 경우 신청해주세요</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-gray-800 rounded-2xl  p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl ${req.type === 'pause' ? '' : ''}`}>
                        {req.type === 'pause' ? '⏸️' : '💰'}
                      </span>
                      <span className="font-semibold text-white">
                        {req.type === 'pause' ? '정지 신청' : '환불 신청'}
                      </span>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  {req.type === 'pause' && req.pauseStart && req.pauseEnd && (
                    <p className="text-sm text-gray-300 mb-2">
                      📅 {req.pauseStart} ~ {req.pauseEnd}
                    </p>
                  )}
                  <p className="text-sm text-gray-300 bg-gray-900 p-3 rounded-lg">{req.reason}</p>
                  <p className="text-xs text-gray-500 mt-3">
                    신청일: {req.createdAt?.seconds
                      ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
                      : '-'}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pause Form */}
        {tab === 'pause' && (
          <form onSubmit={handlePauseSubmit} className="bg-gray-800 rounded-2xl  p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">⏸️ 회원권 정지 신청</h2>
            <div className="bg-orange-500/10 p-4 rounded-lg text-sm text-orange-400">
              <p className="font-medium mb-1">📌 정지 안내</p>
              <ul className="list-disc list-inside space-y-1">
                <li>정지 기간은 최소 7일부터 최대 30일까지 가능합니다</li>
                <li>1개월 이용권당 1회 정지가 가능합니다</li>
                <li>신청 후 관리자 승인이 필요합니다</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">정지 시작일</label>
                <input
                  type="date"
                  value={pauseStart}
                  onChange={(e) => setPauseStart(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">정지 종료일</label>
                <input
                  type="date"
                  value={pauseEnd}
                  onChange={(e) => setPauseEnd(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">정지 사유</label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                required
                rows={3}
                placeholder="정지 사유를 입력해주세요"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              {submitting ? '신청 중...' : '정지 신청하기'}
            </button>
          </form>
        )}

        {/* Refund Form */}
        {tab === 'refund' && (
          <form onSubmit={handleRefundSubmit} className="bg-gray-800 rounded-2xl  p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">💰 환불 신청</h2>
            <div className="bg-red-500/10 p-4 rounded-lg text-sm text-red-400">
              <p className="font-medium mb-1">📌 환불 안내</p>
              <ul className="list-disc list-inside space-y-1">
                <li>환불금액은 이용일수를 제외한 잔여기간 기준으로 산정됩니다</li>
                <li>위약금(10%)이 공제될 수 있습니다</li>
                <li>환불 처리는 영업일 기준 3~5일 소요됩니다</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">환불 사유</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
                rows={3}
                placeholder="환불 사유를 입력해주세요"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">환불 받을 은행</label>
              <select
                value={refundBank}
                onChange={(e) => setRefundBank(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">은행 선택</option>
                <option value="신한은행">신한은행</option>
                <option value="국민은행">국민은행</option>
                <option value="우리은행">우리은행</option>
                <option value="하나은행">하나은행</option>
                <option value="기업은행">기업은행</option>
                <option value="농협">농협</option>
                <option value="카카오뱅크">카카오뱅크</option>
                <option value="토스뱅크">토스뱅크</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">계좌번호</label>
              <input
                type="text"
                value={refundAccount}
                onChange={(e) => setRefundAccount(e.target.value)}
                required
                placeholder="계좌번호를 입력해주세요 (- 없이)"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
            >
              {submitting ? '신청 중...' : '환불 신청하기'}
            </button>
          </form>
        )}
      </div>
    </MemberLayout>
  )
}
