// 회원권 및 PT 상품 정의
export const membershipPlans = [
  { id: 'health-3m', name: '헬스 3개월', months: 3, duration: 90, price: 150000, type: 'membership' },
  { id: 'health-6m', name: '헬스 6개월', months: 6, duration: 180, price: 270000, type: 'membership' },
  { id: 'health-10m', name: '헬스 10개월', months: 10, duration: 300, price: 396000, type: 'membership' },
  { id: 'health-12m', name: '헬스 12개월', months: 12, duration: 365, price: 450000, type: 'membership' },
]

export const ptPlans = [
  { id: 'pt-10', name: 'PT 10회', sessions: 10, price: 500000, type: 'pt' },
  { id: 'pt-20', name: 'PT 20회', sessions: 20, price: 900000, type: 'pt' },
  { id: 'pt-30', name: 'PT 30회', sessions: 30, price: 1200000, type: 'pt' },
  { id: 'pt-50', name: 'PT 50회', sessions: 50, price: 1800000, type: 'pt' },
]

export const lockerPlans = [
  { id: 'locker-1m', name: '라커 1개월', months: 1, duration: 30, price: 10000, type: 'locker' },
  { id: 'locker-3m', name: '라커 3개월', months: 3, duration: 90, price: 27000, type: 'locker' },
  { id: 'locker-6m', name: '라커 6개월', months: 6, duration: 180, price: 50000, type: 'locker' },
  { id: 'locker-12m', name: '라커 12개월', months: 12, duration: 365, price: 90000, type: 'locker' },
]

export const allPlans = [...membershipPlans, ...ptPlans, ...lockerPlans]

export function formatPrice(price: number) {
  return new Intl.NumberFormat('ko-KR').format(price)
}

export function formatDate(date: Date | { seconds: number } | string | undefined) {
  if (!date) return '-'
  if (typeof date === 'string') return date
  if ('seconds' in date) {
    return new Date(date.seconds * 1000).toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

export function getDaysRemaining(expiresAt: Date | { seconds: number } | string | undefined) {
  if (!expiresAt) return 0
  let expDate: Date
  if (typeof expiresAt === 'string') {
    expDate = new Date(expiresAt)
  } else if ('seconds' in expiresAt) {
    expDate = new Date(expiresAt.seconds * 1000)
  } else {
    expDate = expiresAt
  }
  const now = new Date()
  const diff = expDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
