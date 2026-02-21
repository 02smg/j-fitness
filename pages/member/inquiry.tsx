import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, addDoc, getDocs, doc, getDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'

type Inquiry = {
  id: string
  title: string
  content: string
  category: string
  status: 'pending' | 'answered'
  createdAt: { seconds: number }
  reply?: string
  repliedAt?: { seconds: number }
}

export default function MemberInquiry() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [category, setCategory] = useState('일반')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!user) return
    loadInquiries()
  }, [user])

  const loadInquiries = async () => {
    if (!user) return
    setLoading(true)
    try {
      const snap = await getDocs(
        query(collection(db, 'inquiries'), where('memberId', '==', user.uid))
      )
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Inquiry[]
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setInquiries(items)
    } catch (e) {
      console.log(e)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      let memberName = ''
      let memberPhone = ''
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          memberName = userDoc.data().name || ''
          memberPhone = userDoc.data().phone || ''
        }
      } catch (_) {}
      await addDoc(collection(db, 'inquiries'), {
        memberId: user.uid,
        memberEmail: user.email,
        memberName,
        memberPhone,
        category,
        title: title.trim(),
        content: content.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setTitle('')
      setContent('')
      setCategory('일반')
      setShowForm(false)
      loadInquiries()
    } catch (err) {
      console.error(err)
      alert('문의 등록에 실패했습니다.')
    }
    setSubmitting(false)
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">💬 문의사항</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
          >
            {showForm ? '취소' : '✏️ 문의하기'}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl  p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="일반">일반 문의</option>
                <option value="시설">시설 관련</option>
                <option value="이용권">이용권 관련</option>
                <option value="PT">PT 관련</option>
                <option value="환불">환불/정지 관련</option>
                <option value="기타">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="문의 제목을 입력하세요"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={5}
                placeholder="문의 내용을 자세히 입력해주세요"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
            >
              {submitting ? '등록 중...' : '문의 등록'}
            </button>
          </form>
        )}

        {/* List */}
        {inquiries.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 ">
            <p className="text-6xl mb-4">💬</p>
            <p className="text-lg mb-2">문의 내역이 없습니다</p>
            <p className="text-sm text-gray-500">궁금한 점이 있으면 문의해주세요</p>
          </div>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inq) => (
              <div key={inq.id} className="bg-gray-800 rounded-2xl  overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                        {inq.category}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          inq.status === 'answered'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {inq.status === 'answered' ? '답변완료' : '대기중'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {inq.createdAt?.seconds
                        ? new Date(inq.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{inq.title}</h3>
                  <p className="text-sm text-gray-300 bg-gray-900 p-3 rounded-lg">{inq.content}</p>

                  {/* Reply */}
                  {inq.reply && (
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border-l-4 border-blue-400">
                      <p className="text-xs text-blue-500 font-medium mb-1">👔 관리자 답변</p>
                      <p className="text-sm text-blue-300">{inq.reply}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MemberLayout>
  )
}
