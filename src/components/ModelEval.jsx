import { useState } from 'react'
import { Badge, Card, Tabs } from './Layout'
import { KpiCard } from './charts'
import { bestOf, fmtMetric, METRICS } from '../lib/modelEval'

const metricOf = (key) => METRICS.find((m) => m.key === key)
// ตัวชี้วัดที่มีทิศทางดี/แย่ ใช้ในแท็บกราฟ
const RANKED = METRICS.filter((m) => m.better)
// DB ของ Random สูงมาก (27.9) ตัดสเกลไว้ไม่ให้แท่งอื่นเล็กจนมองไม่เห็น
const DB_CAP = 3.5

// อันดับของโมเดลในตัวชี้วัดนี้ (ไม่นับ baseline)
function rankOf(models, model, metric) {
  const list = models.filter((m) => !m.baseline).map((m) => m[metric.key])
  const sorted = [...list].sort((a, b) => (metric.better === 'high' ? b - a : a - b))
  return sorted.indexOf(model[metric.key]) + 1
}

// ผลทดสอบโมเดลจัดกลุ่มรายปี (กลุ่มรายปี 5 กลุ่มมาจาก K-means)
export default function ModelEval({ models }) {
  const chosen = models.find((m) => m.chosen) ?? models[0]
  const nModels = models.filter((m) => !m.baseline).length
  const nBaseline = models.length - nModels
  const [metricKey, setMetricKey] = useState('eta2_mean')
  const metric = metricOf(metricKey)

  const kpis = ['eta2_mean', 'ari_median', 'eta2_proper', 'db'].map(metricOf)

  return (
    <>
        <Card>
          <div className="cluster-head">
            <Badge color="var(--focus)">โมเดลที่เลือก</Badge>
            <span className="muted">เทียบ {nModels} โมเดล + เกณฑ์อ้างอิง {nBaseline} แบบ</span>
          </div>
          <h2 className="province-title">{chosen.name}</h2>
          <p className="small model-lead">
            K-means ได้ η² เฉลี่ยสูงสุด แปลว่ากลุ่มที่ได้อธิบายความต่างของสัดส่วนการจัดการขยะได้ดีที่สุด
            และได้ผลเกือบเหมือนเดิมทุกครั้งที่รันซ้ำ (ARI median 0.893) ขณะที่ Ward กับ Spectral ได้ silhouette
            สูงกว่าเล็กน้อยแต่ผลไม่เสถียร (ARI 0.404 และ 0.490)
          </p>
          <div className="grid-4">
            {kpis.map((m) => (
              <KpiCard
                key={m.key}
                label={m.name}
                value={fmtMetric(m, chosen[m.key])}
                sub={`อันดับ ${rankOf(models, chosen, m)} จาก ${nModels} · ${m.better === 'high' ? 'ยิ่งสูงยิ่งดี' : 'ยิ่งต่ำยิ่งดี'}`}
              />
            ))}
          </div>
        </Card>

        <Card title="เทียบทีละตัวชี้วัด">
          <Tabs tabs={RANKED.map((m) => ({ key: m.key, label: m.label }))} value={metricKey} onChange={setMetricKey} />
          <p className="muted small model-metric-desc">
            {metric.desc} · <b>{metric.better === 'high' ? 'ยิ่งสูงยิ่งดี' : 'ยิ่งต่ำยิ่งดี'}</b>
          </p>
          <MetricBars models={models} metric={metric} />
        </Card>

        <Card title="ผลทดสอบทั้งหมด (K = 5)">
          <p className="muted small card-sub">ตัวหนาสีน้ำเงิน = ดีที่สุดในคอลัมน์ (ไม่นับเกณฑ์อ้างอิง B1, B2) · ↑ ยิ่งสูงยิ่งดี ↓ ยิ่งต่ำยิ่งดี · กดหัวคอลัมน์เพื่อเรียง</p>
          <ResultTable models={models} />
        </Card>

        <div className="grid-2">
          <Card title="อ่านผลอย่างไร">
            <dl className="metric-list">
              {METRICS.map((m) => (
                <div key={m.key}>
                  <dt>{m.name} <span className="muted">({m.label})</span></dt>
                  <dd>{m.desc}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="ข้อสังเกต">
            <ul className="note-list">
              <li><b>Ward</b> ได้ silhouette และ province purity สูงสุด แต่ ARI median แค่ 0.404 รันซ้ำแล้วกลุ่มเปลี่ยนบ่อย</li>
              <li><b>GMM</b> แยกกลุ่มตาม % กำจัดไม่ถูกต้องได้น้อยมาก (η² Improper 0.173) ทั้งที่เป็นตัวแปรสำคัญของงานนี้</li>
              <li><b>B1</b> แบ่งตามควอนไทล์ของ % กำจัดไม่ถูกต้องอย่างเดียว เลยได้ η² Improper สูง แต่ตัวแปรอื่นแทบไม่ถูกอธิบาย และกลุ่มเล็กสุดมีถึง 107 แถว</li>
              <li><b>B2</b> สุ่มกลุ่ม 300 ครั้ง ได้ η² ใกล้ 0 ยืนยันว่าทุกโมเดลจับโครงสร้างจริงในข้อมูลได้ ไม่ใช่ได้มาโดยบังเอิญ</li>
              <li>Silhouette ของทุกโมเดลต่ำ (ไม่เกิน 0.165) ข้อมูลไม่ได้แยกเป็นก้อนชัด กลุ่มจึงควรอ่านเป็นระดับต่อเนื่องมากกว่าประเภทที่ขาดจากกัน</li>
            </ul>
          </Card>
        </div>
    </>
  )
}

function MetricBars({ models, metric }) {
  const rows = [...models].sort((a, b) => {
    const x = a[metric.key] ?? -Infinity
    const y = b[metric.key] ?? -Infinity
    return metric.better === 'high' ? y - x : x - y
  })
  const cap = metric.key === 'db' ? DB_CAP : null
  const max = cap ?? Math.max(...models.map((m) => m[metric.key] ?? 0), 0.001)
  return (
    <ol className="rank model-bars" aria-label={`เทียบ ${metric.name} ของแต่ละโมเดล`}>
      {rows.map((m) => {
        const v = m[metric.key]
        const w = v == null ? 0 : Math.max(0, Math.min(v, max)) / max
        const color = m.chosen ? 'var(--focus)' : m.baseline ? 'var(--field)' : 'color-mix(in oklab, var(--ink2) 55%, transparent)'
        return (
          <li key={m.key} className={m.chosen ? 'is-chosen' : ''}>
            <span className="rank-label" title={m.name}>{m.name}</span>
            <span className="rank-track"><span style={{ width: `${w * 100}%`, background: color }} /></span>
            <span className="rank-text">
              {fmtMetric(metric, v)}
              {cap && v > cap && <span className="muted"> ›</span>}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const SHOW_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'models', label: 'เฉพาะโมเดล' },
  { key: 'baseline', label: 'เฉพาะเกณฑ์อ้างอิง' },
]
const NAME_COL = { key: 'name', label: 'โมเดล' }

// ตารางผลทั้งหมด: กรองโมเดล/เกณฑ์อ้างอิง กดหัวคอลัมน์เพื่อเรียง (ค่าว่างอยู่ท้ายเสมอ)
function ResultTable({ models }) {
  const best = Object.fromEntries(METRICS.map((m) => [m.key, bestOf(models, m)]))
  const [show, setShow] = useState('all')
  const [sort, setSort] = useState(null)

  const rows = models.filter((m) => show === 'all' || (show === 'baseline' ? m.baseline : !m.baseline))
  if (sort) {
    rows.sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      if (x == null || y == null) return (x == null) - (y == null)
      return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir
    })
  }
  // กดครั้งแรก: ชื่อเรียง A→Z, ตัวชี้วัดเรียงจากดีไปแย่ (ยิ่งต่ำยิ่งดี = น้อยไปมาก) · กดซ้ำกลับทิศ
  const toggle = (col) => {
    if (sort?.key === col.key) return setSort({ key: col.key, dir: -sort.dir })
    setSort({ key: col.key, dir: col.key === 'name' || col.better === 'low' ? 1 : -1 })
  }
  const dirty = show !== 'all' || sort != null

  return (
    <>
      <div className="table-filters">
        <Tabs tabs={SHOW_OPTIONS} value={show} onChange={setShow} />
        {dirty && (
          <button type="button" className="btn filter-clear" onClick={() => { setShow('all'); setSort(null) }}>
            ล้างตัวกรอง
          </button>
        )}
      </div>
      <div className="table-scroll">
        <table className="data-table model-table">
          <thead>
            <tr>
              <SortHead col={NAME_COL} sort={sort} onToggle={toggle} />
              <th>K</th>
              {METRICS.map((m) => <SortHead key={m.key} col={m} sort={sort} onToggle={toggle} />)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={`${row.chosen ? 'is-chosen' : ''}${row.baseline ? ' is-baseline' : ''}`}>
                <td>
                  {row.name}
                  {row.chosen && <span className="chosen-tag">เลือกใช้</span>}
                </td>
                <td>{row.k}</td>
                {METRICS.map((m) => {
                  const v = row[m.key]
                  const isBest = !row.baseline && v != null && v === best[m.key]
                  return <td key={m.key} className={isBest ? 'is-best' : ''}>{fmtMetric(m, v)}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SortHead({ col, sort, onToggle }) {
  const on = sort?.key === col.key
  return (
    <th title={col.desc} aria-sort={on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => onToggle(col)}>
        {col.label}
        {col.better && <span className="muted"> {col.better === 'high' ? '↑' : '↓'}</span>}
        <span aria-hidden className={on ? '' : 'muted'}>{on ? (sort.dir > 0 ? ' ▲' : ' ▼') : ' ↕'}</span>
      </button>
    </th>
  )
}
