import AdminLayout from '../../components/AdminLayout'
import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '../../lib/firebase'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { membershipPlans, ptPlans, lockerPlans, formatPrice } from '../../lib/plans'

type Tab = 'general' | 'products' | 'trainers' | 'notifications' | 'security'

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [centerName, setCenterName] = useState('J휘트니스')
  const [centerPhone, setCenterPhone] = useState('02-1234-5678')
  const [centerAddress, setCenterAddress] = useState('서울시 강남구 테헤란로 123')
  const [openTime, setOpenTime] = useState('06:00')
  const [closeTime, setCloseTime] = useState('23:00')
  const [saving, setSaving] = useState(false)

  // Security
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'))
        if (snap.exists()) {
          const d = snap.data()
          setCenterName(d.centerName || 'J휘트니스')
          setCenterPhone(d.centerPhone || '')
          setCenterAddress(d.centerAddress || '')
          setOpenTime(d.openTime || '06:00')
          setCloseTime(d.closeTime || '23:00')
        }
      } catch (e) { console.error(e) }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        centerName, centerPhone, centerAddress, openTime, closeTime,
        updatedAt: new Date(),
      })
      alert('설정이 저장되었습니다.')
    } catch (e) {
      alert('저장에 실패했습니다.')
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) { alert('비밀번호를 입력하세요.'); return }
    if (newPw !== confirmPw) { alert('새 비밀번호가 일치하지 않습니다.'); return }
    if (newPw.length < 6) { alert('비밀번호는 6자 이상이어야 합니다.'); return }
    const user = auth.currentUser
    if (!user || !user.email) { alert('로그인이 필요합니다.'); return }
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw)
      await reauthenticateWithCredential(user, cred)
      await updatePassword(user, newPw)
      alert('비밀번호가 변경되었습니다.')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) {
      alert(e.code === 'auth/wrong-password' ? '현재 비밀번호가 올바르지 않습니다.' : '비밀번호 변경에 실패했습니다.')
    }
  }

  const tabs = [
    { id: 'general', label: '일반 설정', icon: '⚙️' },
    { id: 'products', label: '상품 관리', icon: '📦' },
    { id: 'trainers', label: '트레이너 관리', icon: '👤' },
    { id: 'notifications', label: '알림 설정', icon: '🔔' },
    { id: 'security', label: '보안 설정', icon: '🔒' },
  ]

  return (
    <AdminLayout>
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 rounded-2xl  p-4">
          <h3 className="font-semibold text-white mb-4 px-2">설정</h3>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-gray-300 hover:bg-gray-900'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-800 rounded-2xl  p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">⚙️ 일반 설정</h3>
                <p className="text-gray-400">센터 기본 정보를 설정합니다.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">센터명</label>
                  <input
                    type="text"
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">연락처</label>
                  <input
                    type="tel"
                    value={centerPhone}
                    onChange={(e) => setCenterPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-2">주소</label>
                  <input
                    type="text"
                    value={centerAddress}
                    onChange={(e) => setCenterAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">오픈 시간</label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">마감 시간</label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '💾 설정 저장'}
                </button>
              </div>
            </div>
          )}

          {/* Products Settings */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">📦 상품 관리</h3>
                  <p className="text-gray-400">회원권, PT, 라커 상품을 관리합니다.</p>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                  ➕ 상품 추가
                </button>
              </div>

              {/* Membership Plans */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-3">🏋️ 회원권</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">상품명</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">기간</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">가격</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">상태</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {membershipPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-gray-900">
                          <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
                          <td className="px-4 py-3 text-center">{plan.months}개월</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-400">{formatPrice(plan.price)}원</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">판매중</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600">
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PT Plans */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-3">💪 PT</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">상품명</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">횟수</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">가격</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">회당</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {ptPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-gray-900">
                          <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
                          <td className="px-4 py-3 text-center">{plan.sessions}회</td>
                          <td className="px-4 py-3 text-right font-medium text-purple-400">{formatPrice(plan.price)}원</td>
                          <td className="px-4 py-3 text-right text-gray-400">{formatPrice(Math.round(plan.price / plan.sessions))}원</td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600">
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Locker Plans */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-3">🔐 라커</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">상품명</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">기간</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">가격</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {lockerPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-gray-900">
                          <td className="px-4 py-3 font-medium text-white">{plan.name}</td>
                          <td className="px-4 py-3 text-center">{plan.months}개월</td>
                          <td className="px-4 py-3 text-right font-medium text-teal-400">{formatPrice(plan.price)}원</td>
                          <td className="px-4 py-3 text-center">
                            <button className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600">
                              수정
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Trainers Settings */}
          {activeTab === 'trainers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">👤 트레이너 관리</h3>
                  <p className="text-gray-400">센터 소속 트레이너를 관리합니다.</p>
                </div>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
                  ➕ 트레이너 추가
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: '김철수', speciality: '웨이트/근력', members: 12, color: 'blue' },
                  { name: '이영희', speciality: '다이어트/유산소', members: 8, color: 'pink' },
                  { name: '박민수', speciality: '재활/교정', members: 10, color: 'green' },
                  { name: '최지연', speciality: '필라테스', members: 6, color: 'purple' },
                ].map((trainer, idx) => (
                  <div key={idx} className="bg-gray-900 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-${trainer.color}-500 flex items-center justify-center text-white font-bold`}>
                        {trainer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{trainer.name}</p>
                        <p className="text-sm text-gray-400">{trainer.speciality}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{trainer.members}명</p>
                      <p className="text-xs text-gray-400">담당회원</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">🔔 알림 설정</h3>
                <p className="text-gray-400">회원 및 관리자 알림을 설정합니다.</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: '회원권 만료 7일 전 알림', description: 'SMS로 회원에게 만료 알림 발송', checked: true },
                  { label: '회원권 만료 당일 알림', description: '만료일에 재등록 안내 발송', checked: true },
                  { label: '신규 회원 등록 알림', description: '관리자에게 신규 등록 알림', checked: false },
                  { label: '일일 매출 리포트', description: '매일 밤 10시 매출 현황 발송', checked: true },
                  { label: 'PT 예약 알림', description: 'PT 예약 1시간 전 알림 발송', checked: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-900 rounded-xl">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={item.checked}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-800 after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? '저장 중...' : '💾 설정 저장'}
                </button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">🔒 보안 설정</h3>
                <p className="text-gray-400">계정 및 보안 관련 설정을 관리합니다.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-900 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">비밀번호 변경</h4>
                  <div className="space-y-3">
                    <input
                      type="password"
                      placeholder="현재 비밀번호"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    />
                    <input
                      type="password"
                      placeholder="새 비밀번호"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    />
                    <input
                      type="password"
                      placeholder="새 비밀번호 확인"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                    />
                    <button
                      onClick={handleChangePassword}
                      className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                    >
                      비밀번호 변경
                    </button>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-xl p-4">
                  <h4 className="font-semibold text-white mb-3">현재 계정 정보</h4>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="font-medium text-white">{auth.currentUser?.email || '-'}</p>
                    <p className="text-xs text-gray-400">관리자 계정</p>
                  </div>
                </div>

                <div className="bg-red-500/10 rounded-xl p-4 border border-red-600">
                  <h4 className="font-semibold text-red-400 mb-2">⚠️ 위험 구역</h4>
                  <p className="text-sm text-red-400 mb-3">
                    아래 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
                  </p>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors">
                      데이터 초기화
                    </button>
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl font-medium hover:bg-red-500/30 transition-colors">
                      계정 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
