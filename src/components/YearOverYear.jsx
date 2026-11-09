import { Link } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { YEARS } from '../lib/data'
import { DELTA } from '../lib/colors'
import { fmtDays, fmtPct, fmtTon } from '../lib/format'
import { Card } from './Layout'

// สรุปทั้งประเทศรายปี: แต่ละปีดีขึ้นหรือแย่ลงเทียบปีก่อนหน้า (คิดจาก raw_yearly ผ่าน yearly.national)
// better: 'up' = เพิ่มขึ้นดี, 'down' = ลดลงดี · eps = ต่างกันน้อยกว่านี้ถือว่าคงที่
const METRICS = [
  { key: 'waste', label: 'ขยะเกิดขึ้น (ตัน/วัน)', better: 'down', eps: 50, get: (n) => n.waste_tpd, fmt: fmtTon, dfmt: (d) => fmtTon(Math.abs(d)) },
  { key: 'rec', label: '% นำกลับมาใช้', better: 'up', eps: 0.05, get: (n) => (n.recycle_tpd / n.waste_tpd) * 100, fmt: fmtPct, dfmt: (d) => `${Math.abs(d).toFixed(1)} จุด` },
  { key: 'pro', label: '% กำจัดถูกต้อง', better: 'up', eps: 0.05, get: (n) => (n.proper_tpd / n.waste_tpd) * 100, fmt: fmtPct, dfmt: (d) => `${Math.abs(d).toFixed(1)} จุด` },
  { key: 'imp', label: '% กำจัดไม่ถูกต้อง', better: 'down', eps: 0.05, get: (n) => (n.improper_tpd / n.waste_tpd) * 100, fmt: fmtPct, dfmt: (d) => `${Math.abs(d).toFixed(1)} จุด` },
  { key: 'bl', label: 'วันตกค้าง', better: 'down', eps: 0.5, get: (n) => n.backlog_t / n.waste_tpd, fmt: fmtDays, dfmt: (d) => `${fmtDays(Math.abs(d))} วัน` },
  { key: 'worst', label: 'จังหวัดกลุ่มแย่สุด', better: 'down', eps: 0.5, get: (n) => n.count_by_cluster.at(-1), fmt: (v) => String(v), dfmt: (d) => `${Math.abs(d)} จว.` },
]

// +1 = ดีขึ้น, -1 = แย่ลง, 0 = คงที่
function judge(m, d) {
  if (Math.abs(d) < m.eps) return 0
  return (d > 0) === (m.better === 'up') ? 1 : -1
}

function compare(national, y0, y1) {
  return METRICS.map((m) => {
    const a = m.get(national[y0])
    const b = m.get(national[y1])
    return { m, value: b, d: b - a, j: judge(m, b - a) }
  })
}

const VERDICT = {
  1: { text: 'ดีขึ้น', color: DELTA.better },
  0: { text: 'ทรงตัว', color: DELTA.same },
  [-1]: { text: 'แย่ลง', color: DELTA.worse },
}
const verdictOf = (cells) => {
  const s = cells.reduce((a, c) => a + c.j, 0)
  return VERDICT[Math.sign(s)]
}

function Delta({ cell }) {
  if (cell.j === 0) return <span className="yoy-delta muted">คงที่</span>
  const color = cell.j > 0 ? DELTA.better : DELTA.worse
  return (
    <span className="yoy-delta" style={{ color }}>
      {cell.d > 0 ? '▲' : '▼'} {cell.m.dfmt(cell.d)}
    </span>
  )
}

export default function YearOverYear({ year }) {
  const { yearly } = useData()
  const N = yearly.national
  const rows = YEARS.map((y, i) => ({ y, cells: i === 0 ? null : compare(N, YEARS[i - 1], y) }))
  const sel = rows.find((r) => r.y === year)
  const overall = compare(N, YEARS[0], YEARS.at(-1))
  const count = (cells, j) => cells.filter((c) => c.j === j).length

  return (
    <Card title="แต่ละปี ดีขึ้นหรือแย่ลง">
      <div className="yoy-summary">
        {sel?.cells ? (
          <p>
            <b>ปี {year}</b> เทียบปี {year - 1}: ดีขึ้น <b style={{ color: DELTA.better }}>{count(sel.cells, 1)}</b> ด้าน ·
            แย่ลง <b style={{ color: DELTA.worse }}>{count(sel.cells, -1)}</b> ด้าน · คงที่ {count(sel.cells, 0)} ด้าน
          </p>
        ) : (
          <p><b>ปี {YEARS[0]}</b> เป็นปีแรกของข้อมูล ใช้เป็นฐานเทียบ</p>
        )}
        <p className="muted small">
          ตลอด {YEARS.length} ปี ({YEARS[0]} → {YEARS.at(-1)}): ดีขึ้น {count(overall, 1)} ด้าน · แย่ลง {count(overall, -1)} ด้าน · คงที่ {count(overall, 0)} ด้าน
        </p>
      </div>

      <div className="table-scroll">
        <table className="data-table yoy-table">
          <thead>
            <tr>
              <th>ปี</th>
              <th>สรุปเทียบปีก่อน</th>
              {METRICS.map((m) => (
                <th key={m.key}>
                  {m.label}
                  <span className="muted"> {m.better === 'up' ? '↑' : '↓'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ y, cells }) => {
              const v = cells && verdictOf(cells)
              return (
                <tr key={y} className={y === year ? 'is-cur' : ''}>
                  <td><Link to={`/overview?year=${y}`}>{y}</Link></td>
                  <td>
                    {v ? (
                      <span className="yoy-verdict" style={{ color: v.color, background: `color-mix(in oklab, ${v.color} 14%, transparent)` }}>
                        {v.text} <small>({count(cells, 1)}↑ {count(cells, -1)}↓)</small>
                      </span>
                    ) : (
                      <span className="muted">–</span>
                    )}
                  </td>
                  {METRICS.map((m, k) => (
                    <td key={m.key}>
                      <div>{m.fmt(m.get(N[y]))}</div>
                      {cells ? <Delta cell={cells[k]} /> : <span className="yoy-delta muted">ปีฐาน</span>}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small yoy-note">
        ↑ ยิ่งสูงยิ่งดี ↓ ยิ่งต่ำยิ่งดี · สีเขียว = ดีขึ้นจากปีก่อน สีแดง = แย่ลง · "จุด" = จุดเปอร์เซ็นต์ ·
        ปี 2567 หลายจังหวัดใช้ค่าขยะตกค้างซ้ำปีก่อน · กดปีเพื่อดูภาพรวมของปีนั้น
      </p>
    </Card>
  )
}
