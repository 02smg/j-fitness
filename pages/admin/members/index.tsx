import AdminLayout from '../../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { formatDate, getDaysRemaining } from '../../../lib/plans'
import Link from 'next/link'
import { useRouter } from 'next/router'

type Member = {
  id: string
  memberNumber?: number
  name?: string
  email?: string
  phone?: string
  program?: string
  startDate?: any
  endDate?: any
  lockerNumber?: number
  hasLocker?: boolean
  staff?: string
  joinedAt?: any
  gender?: string
  birthDate?: string
  address?: string
  memo?: string
  photoUrl?: string
}

const PAGE_SIZE = 20

export default function MemberList() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'expiring'>('all')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  useEffect(() => {
    // Check for filter from URL
    const urlFilter = router.query.filter as string
    if (urlFilter) {
      setFilter(urlFilter as any)
    }
  }, [router.query])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      const items = snap.docs.map((d, i) => ({
        id: d.id,
        memberNumber: 6941 - i,
        ...d.data(),
      })) as Member[]
      setMembers(items)
      setLoading(false)
    }
    load()
  }, [])

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      !search ||
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()) ||
      m.phone?.includes(search) ||
      String(m.memberNumber).includes(search)

    const remaining = getDaysRemaining(m.endDate)

    if (filter === 'active') {
      return matchSearch && remaining > 0
    }
    if (filter === 'expired') {
      return matchSearch && remaining === 0
    }
    if (filter === 'expiring') {
      return matchSearch && remaining > 0 && remaining <= 7
    }
    return matchSearch
  })

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE)
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const toggleSelectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(paginatedMembers.map((m) => m.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter((m) => m !== id))
    } else {
      setSelectedMembers([...selectedMembers, id])
    }
  }

  const getStatusBadge = (remaining: number) => {
    if (remaining === 0) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">만료</span>
    }
    if (remaining <= 7) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">임박</span>
    }
    if (remaining <= 30) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{remaining}일</span>
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{remaining}일</span>
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Top Actions Bar */}
        <div className="bg-gray-800 rounded-2xl  p-3 md:p-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-medium transition-all text-sm ${
                  filter === 'all'
                    ? 'bg-gray-800 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                전체 <span className="ml-1 text-xs opacity-70">({members.length})</span>
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-medium transition-all text-sm ${
                  filter === 'active'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                }`}
              >
                유효 <span className="ml-1 text-xs opacity-70">({members.filter((m) => getDaysRemaining(m.endDate) > 0).length})</span>
              </button>
              <button
                onClick={() => setFilter('expiring')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-medium transition-all text-sm ${
                  filter === 'expiring'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                }`}
              >
                만료임박 <span className="ml-1 text-xs opacity-70">({members.filter((m) => {
                  const r = getDaysRemaining(m.endDate)
                  return r > 0 && r <= 7
                }).length})</span>
              </button>
              <button
                onClick={() => setFilter('expired')}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-xl font-medium transition-all text-sm ${
                  filter === 'expired'
                    ? 'bg-red-500 text-white shadow-lg'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                만료 <span className="ml-1 text-sm opacity-70">({members.filter((m) => getDaysRemaining(m.endDate) === 0).length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full lg:w-auto flex-wrap">
              {/* Search */}
              <div className="relative flex-1 lg:flex-none">
                <input
                  type="text"
                  placeholder="회원명, 전화번호 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full lg:w-64 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-900 text-sm"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2">🔍</span>
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'table' ? 'bg-gray-800 shadow text-white' : 'text-gray-400'
                  }`}
                >
                  📋 표
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'card' ? 'bg-gray-800 shadow text-white' : 'text-gray-400'
                  }`}
                >
                  🗂️ 카드
                </button>
              </div>

              {/* Actions */}
              {selectedMembers.length > 0 && (
                <div className="flex items-center gap-2 pl-3 border-l border-gray-700 hidden md:flex">
                  <span className="text-sm text-gray-400">{selectedMembers.length}명 선택</span>
                  <button
                    onClick={() => {
                      const selected = members.filter((m) => selectedMembers.includes(m.id))
                      const phones = selected.map((m) => m.phone).filter(Boolean).join(', ')
                      if (!phones) { alert('선택된 회원의 전화번호가 없습니다.'); return }
                      prompt('SMS 발송 대상 전화번호:', phones)
                    }}
                    className="px-3 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600"
                  >
                    📱 SMS 발송
                  </button>
                  <button
                    onClick={() => {
                      const selected = members.filter((m) => selectedMembers.includes(m.id))
                      const header = '회원번호,이름,전화번호,이메일,프로그램,시작일,종료일,라커\n'
                      const rows = selected.map((m) =>
                        `${m.memberNumber || ''},${m.name || ''},${m.phone || ''},${m.email || ''},${m.program || '헬스'},${formatDate(m.startDate)},${formatDate(m.endDate)},${m.lockerNumber || ''}`
                      ).join('\n')
                      const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `회원목록_${new Date().toISOString().slice(0,10)}.csv`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="px-3 py-2 bg-gray-600 text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-500"
                  >
                    📥 엑셀 내보내기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members Display */}
        {loading ? (
          <div className="bg-gray-800 rounded-2xl  p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">회원 목록을 불러오는 중...</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-gray-800 rounded-2xl  overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-700">
                  <tr>
                    <th className="px-3 md:px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedMembers.length === filteredMembers.length && filteredMembers.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600"
                      />
                    </th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">회원번호</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">회원정보</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">프로그램</th>
                    <th className="px-3 md:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">이용기간</th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">상태</th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">라커</th>
                    <th className="px-3 md:px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        <span className="text-4xl block mb-2">🔍</span>
                        검색 결과가 없습니다
                      </td>
                    </tr>
                  ) : (
                    paginatedMembers.map((m) => {
                      const remaining = getDaysRemaining(m.endDate)
                      return (
                        <tr
                          key={m.id}
                          className={`hover:bg-gray-900 transition-colors ${
                            remaining === 0 ? 'bg-red-500/10' : remaining <= 7 ? 'bg-orange-500/10' : ''
                          }`}
                        >
                          <td className="px-3 md:px-4 py-3 md:py-4">
                            <input
                              type="checkbox"
                              checked={selectedMembers.includes(m.id)}
                              onChange={() => toggleSelect(m.id)}
                              className="w-4 h-4 rounded border-gray-600"
                            />
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 hidden md:table-cell">
                            <span className="font-mono text-sm text-gray-300">#{m.memberNumber}</span>
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg text-xs md:text-base">
                                {m.name?.charAt(0) || m.email?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="font-semibold text-white text-sm md:text-base">{m.name || m.email?.split('@')[0] || '-'}</p>
                                <p className="text-xs text-gray-400">{m.phone || m.email || '-'}</p>
                                <p className="text-xs text-gray-500 md:hidden">{m.program || '헬스'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 hidden lg:table-cell">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium">
                              {m.program || '헬스'}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-sm text-gray-300 hidden xl:table-cell">
                            {formatDate(m.startDate)} ~ {formatDate(m.endDate)}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                            {getStatusBadge(remaining)}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-center hidden lg:table-cell">
                            {m.lockerNumber ? (
                              <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                                #{m.lockerNumber}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-3 md:px-4 py-3 md:py-4 text-center">
                            <div className="flex items-center justify-center gap-0.5 md:gap-1">
                              <Link
                                href={`/admin/members/${m.id}`}
                                className="p-1.5 md:p-2 hover:bg-blue-500/20 rounded-lg transition-colors text-blue-400"
                                title="상세보기"
                              >
                                👁️
                              </Link>
                              <button
                                onClick={async () => {
                                  if (!confirm(`${m.name || '회원'}님을 출석 처리하시겠습니까?`)) return
                                  try {
                                    await addDoc(collection(db, 'attendance'), {
                                      memberId: m.id,
                                      memberName: m.name || m.email?.split('@')[0] || '알수없음',
                                      memberNumber: m.memberNumber,
                                      checkIn: Timestamp.now(),
                                    })
                                    alert('출석 처리되었습니다.')
                                  } catch { alert('출석 처리 실패') }
                                }}
                                className="p-2 hover:bg-green-500/20 rounded-lg transition-colors text-green-400"
                                title="출석체크"
                              >
                                ✅
                              </button>
                              <button
                                onClick={() => {
                                  if (!m.phone) { alert('전화번호가 없습니다.'); return }
                                  prompt('SMS 발송:', m.phone)
                                }}
                                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400"
                                title="SMS"
                              >
                                📱
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedMembers.length === 0 ? (
              <div className="col-span-full bg-gray-800 rounded-2xl  p-12 text-center">
                <span className="text-4xl block mb-2">🔍</span>
                <p className="text-gray-400">검색 결과가 없습니다</p>
              </div>
            ) : (
              paginatedMembers.map((m) => {
                const remaining = getDaysRemaining(m.endDate)
                return (
                  <Link
                    key={m.id}
                    href={`/admin/members/${m.id}`}
                    className={`bg-gray-800 rounded-2xl  overflow-hidden hover:shadow-lg transition-all group ${
                      remaining === 0 ? 'ring-2 ring-red-500' : remaining <= 7 ? 'ring-2 ring-orange-500' : ''
                    }`}
                  >
                    <div className={`h-2 ${
                      remaining === 0 ? 'bg-red-500' : remaining <= 7 ? 'bg-orange-500' : remaining <= 30 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">
                            {m.name?.charAt(0) || m.email?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{m.name || m.email?.split('@')[0] || '-'}</p>
                            <p className="text-xs text-gray-500 font-mono">#{m.memberNumber}</p>
                          </div>
                        </div>
                        {getStatusBadge(remaining)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">프로그램</span>
                          <span className="font-medium text-gray-200">{m.program || '헬스'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">만료일</span>
                          <span className="font-medium text-gray-200">{formatDate(m.endDate)}</span>
                        </div>
                        {m.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">연락처</span>
                            <span className="font-medium text-gray-200">{m.phone}</span>
                          </div>
                        )}
                        {m.lockerNumber && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">라커</span>
                            <span className="font-medium text-gray-200">#{m.lockerNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}

        {/* Pagination */}
        <div className="bg-gray-800 rounded-2xl  px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            전체 <strong>{members.length}</strong>명 중 <strong>{filteredMembers.length}</strong>명 표시
            {filteredMembers.length > PAGE_SIZE && ` (페이지 ${currentPage}/${Math.ceil(filteredMembers.length / PAGE_SIZE)})`}
          </p>
          {filteredMembers.length > PAGE_SIZE && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm disabled:opacity-40"
              >
                이전
              </button>
              {Array.from({ length: Math.ceil(filteredMembers.length / PAGE_SIZE) }, (_, i) => i + 1)
                .filter((p) => Math.abs(p - currentPage) <= 2)
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPage === p ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredMembers.length / PAGE_SIZE), currentPage + 1))}
                disabled={currentPage >= Math.ceil(filteredMembers.length / PAGE_SIZE)}
                className="px-3 py-1 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
