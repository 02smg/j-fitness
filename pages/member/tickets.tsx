import MemberLayout from '../../components/MemberLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import useAuth from '../../lib/useAuth'
import { formatPrice, getDaysRemaining } from '../../lib/plans'

type Ticket = {
  id: string
  program: string
  startDate: string
  endDate: string
  remaining: number
  price?: number
  planId?: string
  hasClothes?: boolean
  hasLocker?: boolean
}

export default function MemberTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadTickets()
  }, [user])

  const loadTickets = async () => {
    if (!user) return
    setLoading(true)
    const snap = await getDocs(query(collection(db, 'purchases'), where('uid', '==', user.uid)))
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Ticket[]
    setTickets(items.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()))
    setLoading(false)
  }

  const activeTickets = tickets.filter((t) => getDaysRemaining(t.endDate) > 0)
  const expiredTickets = tickets.filter((t) => getDaysRemaining(t.endDate) <= 0)

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
        <h1 className="text-2xl font-bold text-white">🎫 내 회원권</h1>

        {/* Active Tickets */}
        <div>
          <h2 className="text-lg font-semibold text-gray-200 mb-4">유효한 회원권</h2>
          {activeTickets.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400">
              <p className="text-4xl mb-4">📭</p>
              <p>유효한 회원권이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTickets.map((ticket) => {
                const remaining = getDaysRemaining(ticket.endDate)
                const progress = Math.min(100, Math.max(0, 100 - (remaining / 30) * 100))
                return (
                  <div key={ticket.id} className="bg-gray-800 rounded-2xl p-5 ">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white">{ticket.program}</h3>
                        <p className="text-sm text-gray-400">
                          {ticket.startDate} ~ {ticket.endDate}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        remaining <= 7 ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {remaining}일 남음
                      </span>
                    </div>
                    <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`absolute left-0 top-0 h-full rounded-full ${
                          remaining <= 7 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${100 - progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-4 flex gap-4 text-sm text-gray-400">
                      <span>옷: {ticket.hasClothes ? '✓' : '✗'}</span>
                      <span>라커: {ticket.hasLocker ? '✓' : '✗'}</span>
                      {ticket.price && <span>결제: {formatPrice(ticket.price)}원</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expired Tickets */}
        {expiredTickets.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">만료된 회원권</h2>
            <div className="space-y-3">
              {expiredTickets.map((ticket) => (
                <div key={ticket.id} className="bg-gray-900 rounded-xl p-4 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-300">{ticket.program}</h3>
                      <p className="text-sm text-gray-500">
                        {ticket.startDate} ~ {ticket.endDate}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded-full text-xs">만료</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MemberLayout>
  )
}
