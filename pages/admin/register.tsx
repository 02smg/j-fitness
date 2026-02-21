import AdminLayout from '../../components/AdminLayout'
import { useState } from 'react'
import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { membershipPlans, ptPlans, lockerPlans, formatPrice } from '../../lib/plans'
import { useRouter } from 'next/router'

type FormData = {
  name: string
  phone: string
  email: string
  gender: 'male' | 'female'
  birthDate: string
  address: string
  emergencyContact: string
  memo: string
  selectedProgram: string
  selectedPT: string
  selectedLocker: string
  paymentMethod: 'card' | 'cash' | 'transfer'
  startDate: string
  staff: string
}

export default function RegisterMember() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    birthDate: '',
    address: '',
    emergencyContact: '',
    memo: '',
    selectedProgram: '',
    selectedPT: '',
    selectedLocker: '',
    paymentMethod: 'card',
    startDate: new Date().toISOString().split('T')[0],
    staff: '',
  })

  const updateForm = (field: keyof FormData, value: string) => {
    setForm({ ...form, [field]: value })
  }

  const calculateTotal = () => {
    let total = 0
    const program = membershipPlans.find((p) => p.id === form.selectedProgram)
    const pt = ptPlans.find((p) => p.id === form.selectedPT)
    const locker = lockerPlans.find((p) => p.id === form.selectedLocker)

    if (program) total += program.price
    if (pt) total += pt.price
    if (locker) total += locker.price

    return total
  }

  const getEndDate = () => {
    const program = membershipPlans.find((p) => p.id === form.selectedProgram)
    if (!program || !form.startDate) return ''

    const start = new Date(form.startDate)
    start.setMonth(start.getMonth() + program.months)
    return start.toISOString().split('T')[0]
  }

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.selectedProgram) {
      alert('필수 정보를 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const program = membershipPlans.find((p) => p.id === form.selectedProgram)
      const pt = ptPlans.find((p) => p.id === form.selectedPT)
      const locker = lockerPlans.find((p) => p.id === form.selectedLocker)

      const userData = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        gender: form.gender,
        birthDate: form.birthDate,
        address: form.address,
        emergencyContact: form.emergencyContact,
        memo: form.memo,
        program: program?.name,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        endDate: Timestamp.fromDate(new Date(getEndDate())),
        staff: form.staff,
        createdAt: Timestamp.now(),
      }

      const userRef = await addDoc(collection(db, 'users'), userData)

      // Add membership purchase/ticket
      if (program) {
        const endDate = new Date(form.startDate)
        endDate.setMonth(endDate.getMonth() + program.months)
        
        await addDoc(collection(db, 'purchases'), {
          uid: userRef.id,
          userName: form.name,
          program: program.name,
          planId: program.id,
          price: program.price,
          startDate: form.startDate,
          endDate: endDate.toISOString().slice(0, 10),
          remaining: program.months * 30,
          hasClothes: false,
          hasLocker: false,
          createdAt: Timestamp.now(),
        })

        // Add membership sale
        await addDoc(collection(db, 'sales'), {
          userId: userRef.id,
          userName: form.name,
          type: 'membership',
          program: program.name,
          amount: program.price,
          paymentMethod: form.paymentMethod,
          createdAt: Timestamp.now(),
        })
      }

      // Add PT if selected
      if (pt) {
        await addDoc(collection(db, 'purchases'), {
          uid: userRef.id,
          userName: form.name,
          program: pt.name,
          planId: pt.id,
          price: pt.price,
          totalSessions: pt.sessions,
          usedSessions: 0,
          remaining: pt.sessions,
          startDate: form.startDate,
          endDate: getEndDate(),
          createdAt: Timestamp.now(),
        })

        // Add PT sale
        await addDoc(collection(db, 'sales'), {
          userId: userRef.id,
          userName: form.name,
          type: 'pt',
          program: pt.name,
          amount: pt.price,
          paymentMethod: form.paymentMethod,
          createdAt: Timestamp.now(),
        })
      }

      // Add Locker if selected
      if (locker) {
        const lockerEndDate = new Date(form.startDate)
        lockerEndDate.setMonth(lockerEndDate.getMonth() + locker.months)

        await addDoc(collection(db, 'lockers'), {
          memberId: userRef.id,
          memberName: form.name,
          lockerNumber: Math.floor(Math.random() * 200) + 1, // 랜덤 배정 (나중에 선택 기능 추가)
          startDate: form.startDate,
          endDate: lockerEndDate.toISOString().slice(0, 10),
          status: 'occupied',
          createdAt: Timestamp.now(),
        })

        // Add Locker sale
        await addDoc(collection(db, 'sales'), {
          userId: userRef.id,
          userName: form.name,
          type: 'locker',
          program: locker.name,
          amount: locker.price,
          paymentMethod: form.paymentMethod,
          createdAt: Timestamp.now(),
        })
      }

      alert('회원 등록이 완료되었습니다!')
      router.push(`/admin/members/${userRef.id}`)
    } catch (error) {
      console.error(error)
      alert('등록 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="bg-gray-800 rounded-2xl  p-6 mb-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: '기본정보' },
              { num: 2, label: '프로그램' },
              { num: 3, label: '결제정보' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <button
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-3 ${step >= s.num ? 'opacity-100' : 'opacity-50'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                      step === s.num
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : step > s.num
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className={`font-medium ${step === s.num ? 'text-blue-400' : 'text-gray-300'}`}>
                    {s.label}
                  </span>
                </button>
                {idx < 2 && (
                  <div className={`w-24 h-1 mx-4 rounded ${step > s.num ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800 rounded-2xl  p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">👤</span> 기본 정보 입력
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="홍길동"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateForm('phone', e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">이메일</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm('email', e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">생년월일</label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => updateForm('birthDate', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">성별</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => updateForm('gender', 'male')}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        form.gender === 'male'
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      👨 남성
                    </button>
                    <button
                      onClick={() => updateForm('gender', 'female')}
                      className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                        form.gender === 'female'
                          ? 'bg-pink-500 text-white shadow-lg'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      👩 여성
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">비상연락처</label>
                  <input
                    type="tel"
                    value={form.emergencyContact}
                    onChange={(e) => updateForm('emergencyContact', e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-2">주소</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => updateForm('address', e.target.value)}
                    placeholder="서울시 강남구..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-2">메모</label>
                  <textarea
                    value={form.memo}
                    onChange={(e) => updateForm('memo', e.target.value)}
                    rows={3}
                    placeholder="특이사항, 건강상태 등..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-gray-500"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-8 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
                >
                  다음 단계 →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🏋️</span> 프로그램 선택
              </h3>

              {/* Membership */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-4">
                  헬스 회원권 <span className="text-red-500">*</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {membershipPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => updateForm('selectedProgram', plan.id)}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        form.selectedProgram === plan.id
                          ? 'border-blue-500 bg-blue-500/10 shadow-lg'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">🏋️</div>
                      <p className="font-bold text-white">{plan.name}</p>
                      <p className="text-xl font-bold text-blue-400 mt-2">{formatPrice(plan.price)}원</p>
                      <p className="text-xs text-gray-400 mt-1">월 {formatPrice(Math.round(plan.price / plan.months))}원</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* PT */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-4">PT (선택)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => updateForm('selectedPT', '')}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      !form.selectedPT
                        ? 'border-gray-500 bg-gray-900'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">❌</div>
                    <p className="font-bold text-white">선택안함</p>
                  </button>
                  {ptPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => updateForm('selectedPT', plan.id)}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        form.selectedPT === plan.id
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">💪</div>
                      <p className="font-bold text-white">{plan.name}</p>
                      <p className="text-xl font-bold text-purple-400 mt-2">{formatPrice(plan.price)}원</p>
                      <p className="text-xs text-gray-400 mt-1">회당 {formatPrice(Math.round(plan.price / plan.sessions))}원</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Locker */}
              <div>
                <h4 className="font-semibold text-gray-200 mb-4">라커 (선택)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => updateForm('selectedLocker', '')}
                    className={`p-5 rounded-2xl border-2 transition-all ${
                      !form.selectedLocker
                        ? 'border-gray-500 bg-gray-900'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">❌</div>
                    <p className="font-bold text-white">선택안함</p>
                  </button>
                  {lockerPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => updateForm('selectedLocker', plan.id)}
                      className={`p-5 rounded-2xl border-2 transition-all text-left ${
                        form.selectedLocker === plan.id
                          ? 'border-teal-500/50 bg-teal-500/10 shadow-lg'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-2xl mb-2">🔐</div>
                      <p className="font-bold text-white">{plan.name}</p>
                      <p className="text-xl font-bold text-teal-400 mt-2">{formatPrice(plan.price)}원</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-gray-600 text-gray-200 rounded-xl font-medium hover:bg-gray-500 transition-colors"
                >
                  ← 이전
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!form.selectedProgram}
                  className="px-8 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음 단계 →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">💳</span> 결제 정보
              </h3>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">시작일</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => updateForm('startDate', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">종료일</label>
                  <input
                    type="date"
                    value={getEndDate()}
                    disabled
                    className="w-full px-4 py-3 border border-gray-700 rounded-xl bg-gray-900 text-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">담당자</label>
                  <input
                    type="text"
                    value={form.staff}
                    onChange={(e) => updateForm('staff', e.target.value)}
                    placeholder="담당 직원명"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">결제 방법</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'card', label: '💳 카드' },
                      { id: 'cash', label: '💵 현금' },
                      { id: 'transfer', label: '🏦 계좌이체' },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => updateForm('paymentMethod', method.id as any)}
                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                          form.paymentMethod === method.id
                            ? 'bg-blue-500 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <h4 className="font-semibold mb-4">📋 등록 요약</h4>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">회원명</span>
                    <span className="font-medium">{form.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">연락처</span>
                    <span className="font-medium">{form.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">프로그램</span>
                    <span className="font-medium">
                      {membershipPlans.find((p) => p.id === form.selectedProgram)?.name || '-'}
                    </span>
                  </div>
                  {form.selectedPT && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">PT</span>
                      <span className="font-medium">{ptPlans.find((p) => p.id === form.selectedPT)?.name}</span>
                    </div>
                  )}
                  {form.selectedLocker && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">라커</span>
                      <span className="font-medium">{lockerPlans.find((p) => p.id === form.selectedLocker)?.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">이용기간</span>
                    <span className="font-medium">
                      {form.startDate} ~ {getEndDate()}
                    </span>
                  </div>

                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">총 결제금액</span>
                      <span className="text-3xl font-bold text-blue-400">{formatPrice(calculateTotal())}원</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-gray-600 text-gray-200 rounded-xl font-medium hover:bg-gray-500 transition-colors"
                >
                  ← 이전
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !form.name || !form.phone || !form.selectedProgram}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span> 등록 중...
                    </span>
                  ) : (
                    '✅ 등록 완료'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
