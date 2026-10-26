import { fmtPct } from '../lib/format'

// กฎ 8.1: ค่า 0 ของกำจัดไม่ถูกต้อง แสดงเป็นข้อความแทน "0.0%"
export default function ImproperValue({ pct, compact = false }) {
  if (pct === 0)
    return (
      <span className="zero-improper">
        ไม่มีขยะที่กำจัดไม่ถูกต้อง
        {!compact && <span className="muted small block">รายงานเป็น 0 ตัน/วัน</span>}
      </span>
    )
  return <span>{fmtPct(pct)}</span>
}
