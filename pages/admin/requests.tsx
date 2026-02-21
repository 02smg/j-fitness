import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { allPlans } from '../../lib/plans'

type Request = {
  id: string
  memberId: string
  memberEmail: string
  type: 'pause' | 'refund' | 'purchase' | 'locker'
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  createdAt: { seconds: number }
  purchaseType?: string
  planId?: string
  planName?: string
  amount?: number
  pauseStart?: string
  pauseEnd?: string
  bank?: string
  account?: string
  lockerNumber?: number
}

type Inquiry = {
  id: string
  memberId: string
  memberEmail: string
  category: string
  title: string
  content: string
  status: 'pending' | 'answered'
  createdAt: { seconds: number }
  reply?: string
}

type MemberInfo = {
  name: string
  phone: string
  email: string
  role: string
  createdAt?: { seconds: number }
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<Request[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [membersMap, setMembersMap] = useState<Record<string, MemberInfo>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'purchase' | 'pause_refund' | 'inquiry'>('purchase')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [replyModal, setReplyModal] = useState<Inquiry | null>(null)
  const [replyText, setReplyText] = useState('')
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const mMap: Record<string, MemberInfo> = {}
      usersSnap.docs.forEach((d) => {
        const data = d.data()
        mMap[d.id] = {
          name: data.name || '이름 없음',
          phone: data.phone || '전화번호 없음',
          email: data.email || '',
          role: data.role || 'member',
          createdAt: data.createdAt,
        }
      })
      setMembersMap(mMap)

      const reqSnap = await getDocs(collection(db, 'member_requests'))
      const reqs = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Request[]
      reqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setRequests(reqs)

      const inqSnap = await getDocs(collection(db, 'inquiries'))
      const inqs = inqSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inquiry[]
      inqs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setInquiries(inqs)
    } catch (e) {
      console.log(e)
    }
    setLoading(false)
  }

  const getMember = (memberId: string, fallbackEmail: string) => {
    const m = membersMap[memberId]
    if (m) return { name: m.name, phone: m.phone, email: m.email }
    return { name: '알 수 없음', phone: '-', email: fallbackEmail }
  }

  const handleApprove = async (id: string, req: Request) => {
    if (!confirm('승인하시겠습니까?')) return
    await updateDoc(doc(db, 'member_requests', id), { status: 'approved' })
    if (req.type === 'purchase' && req.planName && req.amount) {
      const now = new Date()
      const today = now.toISOString().split('T')[0]

      // 플랜 정보로 종료일 계산
      const plan = allPlans.find((p) => p.id === req.planId) || allPlans.find((p) => p.name === req.planName)
      let endDate = today
      if (plan && 'duration' in plan) {
        const end = new Date(now)
        end.setDate(end.getDate() + (plan as { duration: number }).duration)
        endDate = end.toISOString().split('T')[0]
      } else if (plan && 'sessions' in plan) {
        // PT는 세션 기반이므로 기본 6개월 유효기간
        const end = new Date(now)
        end.setDate(end.getDate() + 180)
        endDate = end.toISOString().split('T')[0]
      }

      await addDoc(collection(db, 'purchases'), {
        uid: req.memberId,
        program: req.planName,
        startDate: today,
        endDate: endDate,
        price: req.amount,
        createdAt: serverTimestamp(),
      })
      await addDoc(collection(db, 'sales'), {
        memberId: req.memberId,
        memberEmail: req.memberEmail,
        type: req.purchaseType || 'membership',
        programName: req.planName,
        amount: req.amount,
        paymentMethod: 'pending',
        date: today,
        createdAt: serverTimestamp(),
      })
    }
    loadAll()
  }

  const handleReject = async (id: string) => {
    if (!confirm('거절하시겠습니까?')) return
    await updateDoc(doc(db, 'member_requests', id), { status: 'rejected' })
    loadAll()
  }

  const handleReply = async () => {
    if (!replyModal || !replyText.trim()) return
    await updateDoc(doc(db, 'inquiries', replyModal.id), {
      reply: replyText.trim(),
      status: 'answered',
      repliedAt: serverTimestamp(),
    })
    setReplyModal(null)
    setReplyText('')
    loadAll()
  }

  const purchaseReqs = requests.filter((r) => r.type === 'purchase')
  const pauseRefundReqs = requests.filter((r) => r.type === 'pause' || r.type === 'refund')
  const filteredPurchase = statusFilter === 'all' ? purchaseReqs : purchaseReqs.filter((r) => r.status === statusFilter)
  const filteredPauseRefund = statusFilter === 'all' ? pauseRefundReqs : pauseRefundReqs.filter((r) => r.status === statusFilter)
  const pendingPurchase = purchaseReqs.filter((r) => r.status === 'pending').length
  const pendingPauseRefund = pauseRefundReqs.filter((r) => r.status === 'pending').length
  const pendingInquiry = inquiries.filter((i) => i.status === 'pending').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-medium">대기중</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">승인됨</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">거절됨</span>
      case 'answered':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">답변완료</span>
      default:
        return null
    }
  }

  const renderMemberInfo = (memberId: string, fallbackEmail: string) => {
    const member = getMember(memberId, fallbackEmail)
    return (
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg flex-wrap">
          <span className="text-sm">👤</span>
          <span className="text-sm font-medium text-gray-200">{member.name}</span>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-400">📞 {member.phone}</span>
          <span className="text-gray-400">|</span>
          <span className="text-sm text-gray-400">✉️ {member.email}</span>
        </div>
        <button
          onClick={() => setDetailMemberId(memberId)}
          className="px-2.5 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition whitespace-nowrap"
        >
          상세보기
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">📝 신청/문의 관리</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-2xl  p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-2xl">🛒</div>
            <div>
              <p className="text-sm text-gray-400">구매 신청</p>
              <p className="text-2xl font-bold text-white">
                {pendingPurchase}<span className="text-sm text-gray-500 ml-1">건 대기</span>
              </p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl  p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center text-2xl">⏸️</div>
            <div>
              <p className="text-sm text-gray-400">정지/환불</p>
              <p className="text-2xl font-bold text-white">
                {pendingPauseRefund}<span className="text-sm text-gray-500 ml-1">건 대기</span>
              </p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl  p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-2xl">💬</div>
            <div>
              <p className="text-sm text-gray-400">문의사항</p>
              <p className="text-2xl font-bold text-white">
                {pendingInquiry}<span className="text-sm text-gray-500 ml-1">건 미답변</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-2xl ">
          <div className="border-b border-gray-700 flex">
            {[
              { id: 'purchase' as const, label: '🛒 구매 신청', count: pendingPurchase },
              { id: 'pause_refund' as const, label: '⏸️ 정지/환불', count: pendingPauseRefund },
              { id: 'inquiry' as const, label: '💬 문의사항', count: pendingInquiry },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all border-b-2 ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10/50'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          {activeTab !== 'inquiry' && (
            <div className="p-4 border-b border-gray-700 flex gap-2">
              {[
                { key: 'pending' as const, label: '대기중' },
                { key: 'approved' as const, label: '승인됨' },
                { key: 'rejected' as const, label: '거절됨' },
                { key: 'all' as const, label: '전체' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    statusFilter === f.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Purchase Requests */}
            {activeTab === 'purchase' && (
              <div className="space-y-4">
                {filteredPurchase.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <span className="text-4xl block mb-2">🛒</span>
                    구매 신청이 없습니다
                  </div>
                )}
                {filteredPurchase.map((req) => (
                  <div key={req.id} className="p-5 border border-gray-700 rounded-2xl hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {req.purchaseType === 'membership' ? '🏋️' : req.purchaseType === 'pt' ? '💪' : '🔐'}
                          </span>
                          <span className="font-semibold text-white">{req.planName}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        {renderMemberInfo(req.memberId, req.memberEmail)}
                        <p className="text-lg font-bold text-blue-400 mt-2">
                          {(req.amount || 0).toLocaleString()}원
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {req.createdAt?.seconds
                            ? new Date(req.createdAt.seconds * 1000).toLocaleString('ko-KR')
                            : '-'}
                        </p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApprove(req.id, req)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pause/Refund Requests */}
            {activeTab === 'pause_refund' && (
              <div className="space-y-4">
                {filteredPauseRefund.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <span className="text-4xl block mb-2">⏸️</span>
                    정지/환불 신청이 없습니다
                  </div>
                )}
                {filteredPauseRefund.map((req) => (
                  <div key={req.id} className="p-5 border border-gray-700 rounded-2xl hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{req.type === 'pause' ? '⏸️' : '💰'}</span>
                          <span className="font-semibold text-white">
                            {req.type === 'pause' ? '정지 신청' : '환불 신청'}
                          </span>
                          {getStatusBadge(req.status)}
                        </div>
                        {renderMemberInfo(req.memberId, req.memberEmail)}
                        {req.pauseStart && req.pauseEnd && (
                          <p className="text-sm text-gray-300 mt-2">
                            📅 {req.pauseStart} ~ {req.pauseEnd}
                          </p>
                        )}
                        {req.bank && (
                          <p className="text-sm text-gray-300 mt-1">
                            🏦 {req.bank} {req.account}
                          </p>
                        )}
                        {req.reason && (
                          <div className="bg-gray-900 p-3 rounded-lg mt-2 text-sm text-gray-300">{req.reason}</div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {req.createdAt?.seconds
                            ? new Date(req.createdAt.seconds * 1000).toLocaleString('ko-KR')
                            : '-'}
                        </p>
                      </div>
                      {req.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleApprove(req.id, req)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inquiries */}
            {activeTab === 'inquiry' && (
              <div className="space-y-4">
                {inquiries.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <span className="text-4xl block mb-2">💬</span>
                    문의사항이 없습니다
                  </div>
                )}
                {inquiries.map((inq) => (
                  <div key={inq.id} className="p-5 border border-gray-700 rounded-2xl hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {inq.category}
                          </span>
                          {getStatusBadge(inq.status)}
                        </div>
                        <h3 className="font-semibold text-white">{inq.title}</h3>
                        {renderMemberInfo(inq.memberId, inq.memberEmail)}
                        <div className="bg-gray-900 p-3 rounded-lg mt-2 text-sm text-gray-300">{inq.content}</div>
                        {inq.reply && (
                          <div className="mt-2 p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-400">
                            <p className="text-xs text-blue-500 font-medium mb-1">답변</p>
                            <p className="text-sm text-blue-300">{inq.reply}</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {inq.createdAt?.seconds
                            ? new Date(inq.createdAt.seconds * 1000).toLocaleString('ko-KR')
                            : '-'}
                        </p>
                      </div>
                      {inq.status === 'pending' && (
                        <button
                          onClick={() => {
                            setReplyModal(inq)
                            setReplyText('')
                          }}
                          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                        >
                          답변하기
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member Detail Modal */}
      {detailMemberId && membersMap[detailMemberId] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">👤 회원 상세 정보</h3>
              <button
                onClick={() => setDetailMemberId(null)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-2xl text-white font-bold">
                  {membersMap[detailMemberId].name.charAt(0)}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{membersMap[detailMemberId].name}</p>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
                    {membersMap[detailMemberId].role === 'admin' ? '관리자' : '일반 회원'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
                  <span className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-lg">📞</span>
                  <div>
                    <p className="text-xs text-gray-500">전화번호</p>
                    <p className="font-medium text-gray-200">{membersMap[detailMemberId].phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
                  <span className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-lg">✉️</span>
                  <div>
                    <p className="text-xs text-gray-500">이메일</p>
                    <p className="font-medium text-gray-200">{membersMap[detailMemberId].email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
                  <span className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-lg">📅</span>
                  <div>
                    <p className="text-xs text-gray-500">가입일</p>
                    <p className="font-medium text-gray-200">
                      {membersMap[detailMemberId].createdAt?.seconds
                        ? new Date(membersMap[detailMemberId].createdAt!.seconds * 1000).toLocaleDateString('ko-KR')
                        : '정보 없음'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-700">
                <p className="text-sm font-semibold text-gray-300 mb-2">📋 신청 내역 요약</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                    <p className="text-lg font-bold text-blue-400">
                      {requests.filter((r) => r.memberId === detailMemberId && r.type === 'purchase').length}
                    </p>
                    <p className="text-xs text-blue-500">구매 신청</p>
                  </div>
                  <div className="text-center p-2 bg-orange-500/10 rounded-lg">
                    <p className="text-lg font-bold text-orange-400">
                      {requests.filter((r) => r.memberId === detailMemberId && (r.type === 'pause' || r.type === 'refund')).length}
                    </p>
                    <p className="text-xs text-orange-500">정지/환불</p>
                  </div>
                  <div className="text-center p-2 bg-purple-500/10 rounded-lg">
                    <p className="text-lg font-bold text-purple-400">
                      {inquiries.filter((i) => i.memberId === detailMemberId).length}
                    </p>
                    <p className="text-xs text-purple-500">문의</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setDetailMemberId(null)}
              className="w-full mt-6 py-3 bg-gray-700 text-gray-200 rounded-xl font-medium hover:bg-gray-600 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">💬 답변 작성</h3>
              <button
                onClick={() => setReplyModal(null)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl mb-4">
              <p className="text-sm font-medium text-gray-200 mb-1">{replyModal.title}</p>
              <p className="text-sm text-gray-300">{replyModal.content}</p>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              placeholder="답변 내용을 입력하세요"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="w-full mt-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              답변 등록
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
