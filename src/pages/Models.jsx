import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Card, Header } from '../components/Layout'
import ModelEval from '../components/ModelEval'
import Select from '../components/Select'
import { YEARS } from '../lib/data'
import { loadModels } from '../lib/modelEval'

// เลือกได้เฉพาะรายปี ไม่มีเฉลี่ย 7 ปี เพราะผลทดสอบเป็นของการจัดกลุ่มรายปี
const YEAR_OPTIONS = YEARS.map((y) => ({ value: y, label: String(y) }))

// หน้าผลทดสอบโมเดล เข้าได้เฉพาะตอนเลือกปี 2562–2568 (ไม่ใช่เฉลี่ย 7 ปี)
// ดึงตาราง model_eval แยกจากข้อมูลหลัก ถ้าดึงไม่ได้ก็ไม่กระทบหน้าอื่น
export default function Models() {
  const [params, setParams] = useSearchParams()
  const year = Number(params.get('year'))
  const [state, setState] = useState({ models: null, error: null })

  useEffect(() => {
    let alive = true
    loadModels()
      .then((models) => alive && setState({ models, error: null }))
      .catch((e) => alive && setState({ models: null, error: e.message }))
    return () => {
      alive = false
    }
  }, [])

  if (!YEARS.includes(year)) return <Navigate to="/" replace />
  return (
    <>
      <Header title="ทดสอบโมเดล" subtitle="เปรียบเทียบวิธีจัดกลุ่มรายปี (K = 5) ก่อนเลือกใช้ K-means">
        <Select label="เลือกปี" align="right" value={year} onChange={(v) => setParams({ year: v }, { replace: true })} options={YEAR_OPTIONS} />
      </Header>
      <main className="page-main">
        <Link to={`/?year=${year}`} className="back-btn" style={{ alignSelf: 'flex-start' }}>
          <span aria-hidden>‹</span> กลับภาพรวมปี {year}
        </Link>
        {state.error ? (
          <Card title="โหลดผลทดสอบไม่สำเร็จ">
            <p className="muted small">{state.error}</p>
          </Card>
        ) : !state.models ? (
          <div className="status">กำลังโหลดผลทดสอบ…</div>
        ) : state.models.length === 0 ? (
          <Card title="ยังไม่มีผลทดสอบ">
            <p className="muted small">ตาราง model_eval ใน Supabase ยังว่างอยู่</p>
          </Card>
        ) : (
          <ModelEval models={state.models} />
        )}
      </main>
    </>
  )
}
