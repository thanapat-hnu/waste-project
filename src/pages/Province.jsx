import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { useSelection } from '../lib/SelectionContext'
import { YEARS } from '../lib/data'
import { CLUSTER5, MUTED, SERIES } from '../lib/colors'
import { fmtPct, fmtTon } from '../lib/format'
import { clusterColor } from '../lib/model'
import { Badge, Card, Header, TwoColumn } from '../components/Layout'
import { KpiCard, SeriesLegend, StackedBar100 } from '../components/charts'
import ThailandMap from '../components/ThailandMap'
import ImproperValue from '../components/ImproperValue'
import EmptyState from '../components/EmptyState'

const LAST = YEARS.length - 1

export default function Province() {
  const { yearly, names } = useData()
  const { name } = useParams()
  const navigate = useNavigate()
  const { province, setProvince } = useSelection()
  // ลำดับ: ชื่อใน URL → จังหวัดที่เลือกจากหน้าอื่น (ไม่มีค่าเริ่มต้น ให้ผู้ใช้เลือกเอง)
  const selected = [name, province].find((n) => n && yearly.provinces[n])
  useEffect(() => {
    if (name && yearly.provinces[name]) setProvince(name)
  }, [name, setProvince, yearly])
  const go = useCallback((n) => navigate(`/province/${encodeURIComponent(n)}`), [navigate])
  const grey = useCallback(() => MUTED, [])

  if (!selected)
    return (
      <>
        <Header title="ข้อมูลจังหวัด" subtitle="รายละเอียดการจัดการขยะรายจังหวัด" />
        <EmptyState top={<ProvinceSearch names={names} onPick={go} />} map={<ThailandMap colorOf={grey} onSelect={go} />} />
      </>
    )
  return <ProvinceDetail selected={selected} go={go} />
}

function ProvinceDetail({ selected, go }) {
  const { yearly, names } = useData()
  const p = yearly.provinces[selected]
  const colorOf = useCallback((n) => (n === selected ? CLUSTER5[p.cluster[LAST] - 1] : MUTED), [selected, p])

  const nat = yearly.national[YEARS[LAST]]
  const natPct = (k) => (nat[k] / nat.waste_tpd) * 100
  const last = p.rows[LAST]
  const kgPerPerson = last.population ? (last.waste_generated_tpd * 1000) / last.population : null

  // ค่าเฉลี่ยกลุ่มปีล่าสุด (ถ่วงตามปริมาณ)
  const c = p.cluster[LAST]
  const groupRows = names.filter((n) => yearly.provinces[n].cluster[LAST] === c).map((n) => yearly.provinces[n].rows[LAST])
  const groupPct = (k) => (groupRows.reduce((a, r) => a + r[k], 0) / groupRows.reduce((a, r) => a + r.waste_generated_tpd, 0)) * 100

  // ข้อควรตรวจสอบข้อมูล
  const properZeroYears = YEARS.filter((_, i) => p.rows[i].waste_proper_tpd === 0)
  const backlogRepeat = p.rows[5].waste_backlog_t === p.rows[4].waste_backlog_t
  const warnings = [
    properZeroYears.length > 1 && `กำจัดถูกต้องเป็น 0 ในปี ${properZeroYears.join(', ')}`,
    backlogRepeat && 'ขยะตกค้างปี 2567 เท่ากับปี 2566 (อาจใช้ค่าซ้ำปีก่อน)',
    'GPP ปี 2567–2568 เป็นค่าประมาณ',
  ].filter(Boolean)

  // สิ่งที่ควรทำ (สร้างจากกฎ)
  const touristsPerCapita = last.tourists && last.population ? last.tourists / last.population : 0
  const actions = [
    p.improper_pct[LAST] > natPct('improper_tpd') && 'ขยะกำจัดไม่ถูกต้องสูงกว่าค่าประเทศ → ลงทุนระบบกำจัดที่ถูกต้อง',
    properZeroYears.length > 0 && 'กำจัดถูกต้องเป็น 0 บางปี → ตรวจสอบการรายงานข้อมูล',
    touristsPerCapita > 10 && 'นักท่องเที่ยวสูงเมื่อเทียบกับประชากร → เตรียมรองรับภาระขยะช่วงท่องเที่ยว',
  ].filter(Boolean)

  const compare = [
    { name: 'นำกลับมาใช้', k: 'waste_recycled_tpd', nk: 'recycle_tpd', mine: p.recycle_pct[LAST] },
    { name: 'กำจัดถูกต้อง', k: 'waste_proper_tpd', nk: 'proper_tpd', mine: p.proper_pct[LAST] },
    { name: 'กำจัดไม่ถูกต้อง', k: 'waste_improper_tpd', nk: 'improper_tpd', mine: p.improper_pct[LAST] },
  ]

  const left = (
    <>
      <ProvinceSearch names={names} onPick={go} />

      <Card>
        <div className="muted">{p.region}</div>
        <h2 className="province-title">{selected}</h2>
        <Badge color={clusterColor(c)}>กลุ่ม {c} {yearly.cluster_names[c]}</Badge>
        {warnings.length > 0 && (
          <div className="warn-box">
            <b>ข้อควรตรวจสอบข้อมูล</b>
            <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        )}
      </Card>

      <div className="grid-4">
        <KpiCard label={`ขยะเกิดขึ้น ${YEARS[LAST]}`} value={`${fmtTon(p.waste_tpd[LAST])} ตัน/วัน`} sub={kgPerPerson && `${kgPerPerson.toFixed(2)} กก./คน/วัน`} />
        <KpiCard label="% รีไซเคิล" value={fmtPct(p.recycle_pct[LAST])} sub={`ประเทศ ${fmtPct(natPct('recycle_tpd'))}`} />
        <KpiCard label="% กำจัดถูกต้อง" value={fmtPct(p.proper_pct[LAST])} sub={`ประเทศ ${fmtPct(natPct('proper_tpd'))}`} />
        <KpiCard label="% กำจัดไม่ถูกต้อง" value={<ImproperValue pct={p.improper_pct[LAST]} />} sub={`ประเทศ ${fmtPct(natPct('improper_tpd'))}`} />
      </div>

      <Card title="สัดส่วนการจัดการขยะรายปี">
        <SeriesLegend items={[{ name: 'รีไซเคิล', color: SERIES.recycle }, { name: 'กำจัดถูกต้อง', color: SERIES.proper }, { name: 'กำจัดไม่ถูกต้อง', color: SERIES.improper }]} />
        <StackedBar100
          ariaLabel="สัดส่วนการจัดการขยะรายปี"
          columns={YEARS.map((y, i) => ({
            label: String(y),
            top: fmtPct(p.improper_pct[i]),
            sub: <Badge color={clusterColor(p.cluster[i])}>กลุ่ม {p.cluster[i]}</Badge>,
            parts: [
              { name: 'รีไซเคิล', value: p.recycle_pct[i], color: SERIES.recycle },
              { name: 'กำจัดถูกต้อง', value: p.proper_pct[i], color: SERIES.proper },
              { name: 'กำจัดไม่ถูกต้อง', value: p.improper_pct[i], color: SERIES.improper },
            ],
          }))}
        />
      </Card>

      <div className="grid-2">
        <Card title={`เทียบกับกลุ่มและทั้งประเทศ (${YEARS[LAST]})`}>
          {compare.map((m) => (
            <div key={m.name} className="compare">
              <div className="small"><b>{m.name}</b></div>
              {[
                ['จังหวัดนี้', m.mine, 'var(--ink)'],
                [`กลุ่ม ${c}`, groupPct(m.k), clusterColor(c)],
                ['ทั้งประเทศ', natPct(m.nk), 'var(--ink2)'],
              ].map(([label, v, color]) => (
                <div key={label} className="compare-row">
                  <span>{label}</span>
                  <span className="rank-track"><span style={{ width: `${v}%`, background: color }} /></span>
                  <span>{fmtPct(v)}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
        <Card title="สิ่งที่ควรทำ">
          {actions.length ? <ul className="small">{actions.map((a) => <li key={a}>{a}</li>)}</ul> : <p className="muted small">ไม่มีประเด็นเด่น</p>}
        </Card>
      </div>
    </>
  )

  return (
    <>
      <Header title="ข้อมูลจังหวัด" subtitle="รายละเอียดการจัดการขยะรายจังหวัด" />
      <TwoColumn left={left} right={<ThailandMap colorOf={colorOf} selected={selected} onSelect={go} />} />
    </>
  )
}

function ProvinceSearch({ names, onPick }) {
  const [q, setQ] = useState('')
  const hits = q ? names.filter((n) => n.includes(q.trim())).slice(0, 8) : []
  return (
    <div className="search">
      <label htmlFor="province-search" className="sr-only">ค้นหาจังหวัด</label>
      <input
        id="province-search"
        placeholder="ค้นหาจังหวัด…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && hits[0] && (onPick(hits[0]), setQ(''))}
      />
      {hits.length > 0 && (
        <ul className="search-hits">
          {hits.map((n) => <li key={n}><button onClick={() => (onPick(n), setQ(''))}>{n}</button></li>)}
        </ul>
      )}
    </div>
  )
}
