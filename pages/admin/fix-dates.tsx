import AdminLayout from '../../components/AdminLayout'
import { useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

const planDurations: Record<string, number> = {
  '헬스 3개월': 90,
  '헬스 6개월': 180,
  '헬스 10개월': 300,
  '헬스 12개월': 365,
  '라커 1개월': 30,
  '라커 3개월': 90,
  '라커 6개월': 180,
  '라커 12개월': 365,
  'PT 10회': 180,
  'PT 20회': 180,
  'PT 30회': 180,
  'PT 50회': 180,
}

export default function FixDates() {
  const [result, setResult] = useState('')
  const [running, setRunning] = useState(false)

  const handleFix = async () => {
    setRunning(true)
    setResult('수정 중...\n')
    try {
      const snap = await getDocs(collection(db, 'purchases'))
      let fixed = 0
      const logs: string[] = []
      for (const d of snap.docs) {
        const data = d.data()
        if (data.startDate && data.endDate && data.startDate === data.endDate) {
          const duration = planDurations[data.program] || 365
          const start = new Date(data.startDate)
          start.setDate(start.getDate() + duration)
          const newEnd = start.toISOString().split('T')[0]
          await updateDoc(doc(db, 'purchases', d.id), { endDate: newEnd })
          logs.push(`✅ ${data.program}: ${data.startDate} → ${data.startDate} ~ ${newEnd}`)
          fixed++
        }
      }
      if (fixed === 0) {
        setResult('수정할 데이터가 없습니다. 모든 회원권 기간이 정상입니다.')
      } else {
        setResult(`총 ${fixed}건 수정 완료!\n\n${logs.join('\n')}`)
      }
    } catch (e: any) {
      setResult('오류: ' + e.message)
    }
    setRunning(false)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">🔧 회원권 기간 수정</h1>
        <p className="text-gray-400">startDate와 endDate가 같은 회원권의 종료일을 올바르게 수정합니다.</p>
        <button
          onClick={handleFix}
          disabled={running}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? '수정 중...' : '수정 실행'}
        </button>
        {result && (
          <pre className="bg-gray-900 p-4 rounded-xl text-sm whitespace-pre-wrap text-gray-200">{result}</pre>
        )}
      </div>
    </AdminLayout>
  )
}
