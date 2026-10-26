import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { useSelection } from '../lib/SelectionContext'
import EmptyState from '../components/EmptyState'
import { YEARS } from '../lib/data'
import { DELTA, SERIES, TREND4 } from '../lib/colors'
import { fmtPct, fmtSigned, fmtTon } from '../lib/format'
import { Badge, Card, Header, TwoColumn } from '../components/Layout'
import { KpiCard, LineChart, SeriesLegend } from '../components/charts'
import ThailandMap from '../components/ThailandMap'
import ImproperValue from '../components/ImproperValue'

const METRICS = [
  { key: 'recycle_pct', name: 'นำกลับมาใช้', color: SERIES.recycle, higherIsBetter: true },
  { key: 'proper_pct', name: 'กำจัดถูกต้อง', color: SERIES.proper, higherIsBetter: true },
  { key: 'improper_pct', name: 'กำจัดไม่ถูกต้อง', color: SERIES.improper, higherIsBetter: false },
]
const SLOPE_SCALE = 1.3

export default function Trend() {
  const { trend, names } = useData()
  const [params, setParams] = useSearchParams()
  const { province, setProvince } = useSelection()
  // ลำดับ: ?p= ในลิงก์ → จังหวัดที่เลือกจากหน้าอื่น (ไม่มีค่าเริ่มต้น ให้ผู้ใช้เลือกเอง)
  const fromUrl = params.get('p')
  const selected = [fromUrl, province].find((n) => n && trend.provinces[n])
  useEffect(() => {
    if (fromUrl && trend.provinces[fromUrl]) setProvince(fromUrl)
  }, [fromUrl, setProvince, trend])
  const onSelect = useCallback(
    (p) => {
      setProvince(p)
      setParams({ p }, { replace: true })
    },
    [setParams, setProvince],
  )

  const counts = useMemo(() => {
    const c = {}
    names.forEach((n) => (c[trend.provinces[n].group] = (c[trend.provinces[n].group] || 0) + 1))
    return c
  }, [names, trend])
  const legend = Object.entries(trend.group_names).map(([g, l]) => ({ key: +g, color: TREND4[g - 1], label: `กลุ่ม ${g} ${l}`, count: counts[g] }))
  const colorOf = useCallback((n) => TREND4[trend.provinces[n]?.group - 1], [trend])
  const keyOf = useCallback((n) => trend.provinces[n]?.group, [trend])
  const map = (
    <ThailandMap colorOf={colorOf} keyOf={keyOf} selected={selected} onSelect={onSelect} legend={legend} legendTitle="กลุ่มการเปลี่ยนแปลง" />
  )

  return (
    <>
      <Header title="การเปลี่ยนแปลง" subtitle="ทิศทางการจัดการขยะของแต่ละจังหวัด 2562–2568" />
      {selected ? (
        <TwoColumn left={<TrendDetail selected={selected} />} right={map} />
      ) : (
        <EmptyState map={map} />
      )}
    </>
  )
}

function TrendDetail({ selected }) {
  const { trend } = useData()
  const t = trend.provinces[selected]
  const im0 = t.improper_pct[0]
  const im1 = t.improper_pct.at(-1)
  const dIm = im1 - im0
  const dColor = Math.abs(dIm) < 0.05 ? DELTA.same : dIm > 0 ? DELTA.worse : DELTA.better
  const groupMean = trend.group_mean_slope_yj[t.group]

  const summary = METRICS.map((m, i) => {
    const s = t.slope_pp[i]
    if (Math.abs(s) < 0.05) return `${m.name}ค่อนข้างคงที่`
    return `${m.name}${s > 0 ? 'เพิ่มขึ้น' : 'ลดลง'}เฉลี่ย ${Math.abs(s).toFixed(1)} จุด%/ปี`
  }).join(' · ')

  return (
    <>
      <div className="section-head">
        <div>
          <h2 className="province-title">{selected}</h2>
          <div className="muted">{t.region}</div>
        </div>
        <Badge color="var(--focus)">กลุ่มการเปลี่ยนแปลง 2562–2568</Badge>
      </div>

      <div className="grid-4">
        <KpiCard label="กลุ่มการเปลี่ยนแปลง" value={<Badge color={TREND4[t.group - 1]}>กลุ่ม {t.group}</Badge>} />
        <KpiCard label="รูปแบบของกลุ่ม" value={<span className="kpi-text">{t.group_name}</span>} />
        <KpiCard label="กำจัดไม่ถูกต้อง ปี 2568" value={<ImproperValue pct={im1} />} />
        <KpiCard
          label="กำจัดไม่ถูกต้อง 2562→2568"
          value={
            im0 === 0 && im1 === 0
              ? <span className="zero-improper">ไม่มีขยะที่กำจัดไม่ถูกต้อง<span className="muted small block">เป็น 0 ทั้งปี 2562 และ 2568</span></span>
              : <span style={{ color: dColor }}>{fmtSigned(dIm)} จุด%</span>
          }
        />
      </div>

      <Card title="สัดส่วนการจัดการขยะรายปี (% จริง)">
        <SeriesLegend items={METRICS} />
        <LineChart
          labels={YEARS}
          series={METRICS.map((m) => ({ name: m.name, color: m.color, values: t[m.key] }))}
          ariaLabel={summary}
        />
        <p className="small">{summary}</p>
      </Card>

      <Card title="ความชันการเปลี่ยนแปลง (Slope)">
        <div className="slope-rows" role="img" aria-label="ความชันเทียบค่าเฉลี่ยกลุ่ม">
          {METRICS.map((m, i) => {
            const v = t.slope_yj[i]
            const good = m.higherIsBetter ? v > 0 : v < 0
            const color = Math.abs(v) < 0.02 ? 'var(--ink2)' : good ? SERIES.recycle : SERIES.improper
            const w = (Math.min(Math.abs(v), SLOPE_SCALE) / SLOPE_SCALE) * 50
            const meanX = 50 + (Math.max(-SLOPE_SCALE, Math.min(SLOPE_SCALE, groupMean[i])) / SLOPE_SCALE) * 50
            return (
              <div className="slope-row" key={m.key}>
                <span className="slope-name">{m.name}</span>
                <span className="slope-track">
                  <span className="slope-zero" />
                  <span className="slope-bar" style={{ background: color, width: `${w}%`, left: v >= 0 ? '50%' : `${50 - w}%` }} />
                  <span className="slope-mean" style={{ left: `${meanX}%` }} title="ค่าเฉลี่ยของกลุ่ม" />
                </span>
                <span className="slope-val">{fmtSigned(t.slope_pp[i])} จุด%/ปี</span>
              </div>
            )
          })}
        </div>
        <p className="muted small">ขีดดำ = ค่าเฉลี่ยของกลุ่ม · น้ำเงิน = ดีขึ้น · ส้ม = แย่ลง (กำจัดไม่ถูกต้อง: ลดลง = ดี)</p>
      </Card>

      <Card title="อ่านผลให้เข้าใจ">
        <ul className="small">
          <li><b>กราฟเส้น</b> แสดง % จริงของแต่ละปี</li>
          <li><b>Slope &gt; 0</b> ค่านั้นเพิ่มขึ้นตลอดช่วง 7 ปี · <b>Slope &lt; 0</b> ค่านั้นลดลง</li>
          <li>กลุ่มการเปลี่ยนแปลงบอก <b>ทิศทาง</b> ไม่ใช่คะแนนดี/แย่ และเป็นคนละชุดกับกลุ่มการกำจัดในหน้าแรก</li>
        </ul>
      </Card>

      <Card title="ข้อมูลจริง 7 ปี">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>ปี</th><th>ขยะเกิดขึ้น (ตัน/วัน)</th>{METRICS.map((m) => <th key={m.key}>{m.name}</th>)}</tr>
            </thead>
            <tbody>
              {YEARS.map((y, i) => (
                <tr key={y}>
                  <td>{y}</td><td>{fmtTon(t.waste_tpd[i])}</td>
                  {METRICS.map((m) => <td key={m.key}>{fmtPct(t[m.key][i])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
