import { useCallback, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { useSelection } from '../lib/SelectionContext'
import { YEARS } from '../lib/data'
import { BACKLOG_LEVEL, BACKLOG_LEVEL_NAMES, CLUSTER5, DELTA, FLOW, GROUP4, REC_LEVEL, REC_LEVEL_NAMES, SERIES } from '../lib/colors'
import { fmtDays, fmtPct, fmtTon } from '../lib/format'
import { backlogName, clusterColor, provinceSnapshot, recName } from '../lib/model'
import { Badge, Card, Header, Tabs, TwoColumn } from '../components/Layout'
import { BarChartV, Donut, KpiCard, RankBars, StackedBar100 } from '../components/charts'
import ThailandMap from '../components/ThailandMap'
import ImproperValue from '../components/ImproperValue'

const TAB_LABELS = { dis: 'การกำจัด', rec: 'รีไซเคิล', bl: 'ขยะตกค้าง', g4: 'ระดับ 4 กลุ่ม' }

export default function Home() {
  const data = useData()
  const { yearly, avg4, names } = data
  const [params, setParams] = useSearchParams()
  // ปีในลิงก์ที่ไม่มีข้อมูล (เช่น 2570) ใช้ปีล่าสุดแทน
  const yearParam = params.get('year')
  const year = yearParam === 'avg' ? 'avg' : YEARS.includes(Number(yearParam)) ? Number(yearParam) : 2568
  const isAvg = year === 'avg'
  let tab = params.get('tab') || 'dis'
  if (tab === 'g4' && !isAvg) tab = 'dis' // เปลี่ยนเป็นรายปีแล้ว สลับกลับแท็บการกำจัด
  const { province, setProvince } = useSelection()
  // ลิงก์ที่มี ?p= ใช้ค่านั้น ไม่มีก็ใช้จังหวัดที่เลือกค้างไว้จากหน้าอื่น (ชื่อที่ไม่มีในข้อมูลไม่นับ)
  const fromUrl = params.get('p')
  const selected = fromUrl != null ? (yearly.provinces[fromUrl] ? fromUrl : '') : province
  // จำจังหวัดจากลิงก์ เฉพาะตอนที่ ?p= เปลี่ยน (ไม่ผูกกับ province เพื่อไม่ให้ปุ่มปิดถูกเลือกกลับ)
  useEffect(() => {
    if (fromUrl && yearly.provinces[fromUrl]) setProvince(fromUrl)
  }, [fromUrl, setProvince, yearly])

  const update = useCallback(
    (patch) => {
      if ('p' in patch) setProvince(patch.p)
      const next = new URLSearchParams(params)
      Object.entries(patch).forEach(([k, v]) => (v == null || v === '' ? next.delete(k) : next.set(k, v)))
      if (next.get('tab') === 'g4' && next.get('year') !== 'avg') next.set('tab', 'dis')
      setParams(next, { replace: true })
    },
    [params, setParams, setProvince],
  )

  const snaps = useMemo(
    () => Object.fromEntries(names.map((n) => [n, provinceSnapshot(data, n, year)])),
    [data, names, year],
  )
  const nat = yearly.national[isAvg ? 'avg' : year]

  // ระบายสี + สัญลักษณ์ตามแท็บ
  const scheme = useMemo(() => {
    const count = (fn, k) => names.filter((n) => fn(snaps[n]) === k).length
    if (tab === 'rec')
      return {
        key: (s) => s.rec_level,
        color: (s) => REC_LEVEL[s.rec_level - 1],
        legend: REC_LEVEL_NAMES.map((l, i) => ({ key: i + 1, color: REC_LEVEL[i], label: l, count: count((s) => s.rec_level, i + 1) })),
      }
    if (tab === 'bl')
      return {
        key: (s) => s.backlog_level,
        color: (s) => BACKLOG_LEVEL[s.backlog_level - 1],
        legend: BACKLOG_LEVEL_NAMES.map((l, i) => ({ key: i + 1, color: BACKLOG_LEVEL[i], label: l, count: count((s) => s.backlog_level, i + 1) })),
      }
    if (tab === 'g4')
      return {
        key: (s) => s.group4,
        color: (s) => GROUP4[s.group4 - 1],
        legend: Object.entries(avg4.group_names).map(([g, l]) => ({ key: +g, color: GROUP4[g - 1], label: l, count: count((s) => s.group4, +g) })),
      }
    return {
      key: (s) => s.cluster,
      color: (s) => CLUSTER5[s.cluster - 1],
      legend: yearly.cluster_ids.map((c) => ({ key: c, color: CLUSTER5[c - 1], label: `C${c} ${yearly.cluster_names[c]}`, count: count((s) => s.cluster, c) })),
    }
  }, [tab, names, snaps, avg4, yearly])

  const colorOf = useCallback((n) => snaps[n] && scheme.color(snaps[n]), [snaps, scheme])
  const keyOf = useCallback((n) => snaps[n] && scheme.key(snaps[n]), [snaps, scheme])

  // KPI ใบที่ 3
  const kpi3 = {
    dis: { label: 'จังหวัดกลุ่ม C5', value: `${scheme.legend.at(-1)?.count ?? 0} จังหวัด` },
    rec: { label: '% นำกลับมาใช้ทั้งประเทศ', value: fmtPct((nat.recycle_tpd / nat.waste_tpd) * 100) },
    bl: { label: 'จังหวัดตกค้างมาก', value: `${scheme.legend[3]?.count ?? 0} จังหวัด` },
    g4: { label: 'จังหวัดควรปรับปรุง', value: `${scheme.legend[3]?.count ?? 0} จังหวัด` },
  }[tab]

  // ขยะกำจัดไม่ถูกต้องแยกตามกลุ่ม: รายปีใช้กลุ่ม C1–C5 ของปีนั้น, เฉลี่ย 7 ปีใช้กลุ่มเฉลี่ย 4 กลุ่ม (result_avg)
  const improperGroups = isAvg
    ? Object.entries(avg4.group_names).map(([g, name]) => ({
        label: name,
        color: GROUP4[g - 1],
        value: names
          .filter((n) => avg4.provinces[n].group === +g)
          .reduce((a, n) => a + (avg4.provinces[n].waste_tpd * avg4.provinces[n].improper_pct) / 100, 0),
      }))
    : yearly.cluster_ids.map((c, i) => ({ label: `C${c}`, color: CLUSTER5[c - 1], value: nat.improper_by_cluster[i] }))
  const improperTotal = improperGroups.reduce((a, g) => a + g.value, 0)

  // แนวโน้ม 7 ปี ทั้งประเทศตามแท็บ
  const trendVal = (n) =>
    tab === 'rec' ? (n.recycle_tpd / n.waste_tpd) * 100 : tab === 'bl' ? n.backlog_t / n.waste_tpd : (n.improper_tpd / n.waste_tpd) * 100
  const trendTitle = { dis: '% กำจัดไม่ถูกต้อง', g4: '% กำจัดไม่ถูกต้อง', rec: '% นำกลับมาใช้', bl: 'วันตกค้าง (ถ่วงน้ำหนัก)' }[tab]
  const trendColor = tab === 'rec' ? SERIES.recycle : tab === 'bl' ? BACKLOG_LEVEL[2] : SERIES.improper

  const sel = selected && snaps[selected]

  const left = (
    <>
      <Tabs
        tabs={[
          { key: 'dis', label: TAB_LABELS.dis },
          { key: 'rec', label: TAB_LABELS.rec },
          { key: 'bl', label: TAB_LABELS.bl },
          ...(isAvg ? [{ key: 'g4', label: TAB_LABELS.g4 }] : []),
        ]}
        value={tab}
        onChange={(t) => update({ tab: t })}
        extra={<Link className="tab-link" to="/clusters">กลุ่มจังหวัด</Link>}
      />

      <div className="grid-3">
        <KpiCard label="ขยะเกิดขึ้นทั้งประเทศ" value={`${fmtTon(nat.waste_tpd)} ตัน/วัน`} />
        <KpiCard
          label="% กำจัดไม่ถูกต้อง"
          value={fmtPct((nat.improper_tpd / nat.waste_tpd) * 100)}
          sub={`${fmtTon(nat.improper_tpd)} ตัน/วัน`}
          color={DELTA.improper}
        />
        <KpiCard label={kpi3.label} value={kpi3.value} />
      </div>

      <div className="grid-2">
        <Card title="ขยะกำจัดไม่ถูกต้องแยกตามกลุ่ม">
          <BarChartV
            ariaLabel="ขยะกำจัดไม่ถูกต้องแยกตามกลุ่ม"
            items={improperGroups.map((g) => ({
              ...g,
              text: `${fmtTon(g.value)} (${fmtPct((g.value / improperTotal) * 100)})`,
            }))}
          />
          <p className="muted small">ตัน/วัน (% ของทั้งประเทศ){isAvg && ' · แบ่งตามกลุ่มเฉลี่ย 4 กลุ่ม'}</p>
        </Card>
        <Card title={`สัดส่วนจังหวัด · ${TAB_LABELS[tab]}`}>
          <Donut
            ariaLabel="สัดส่วนจังหวัด"
            center={<><b>77</b><span>จังหวัด</span></>}
            items={scheme.legend.map((l) => ({ label: l.label, value: l.count, color: l.color }))}
          />
        </Card>
      </div>

      <Card title={`${trendTitle} ทั้งประเทศ 7 ปี`}>
        <BarChartV
          ariaLabel={`${trendTitle} รายปี`}
          items={YEARS.map((y) => {
            const v = trendVal(yearly.national[y])
            return { label: String(y), value: v, color: trendColor, dim: !isAvg && y !== year, text: tab === 'bl' ? fmtDays(v) : fmtPct(v) }
          })}
        />
        {tab === 'bl' && <p className="muted small">หมายเหตุ: ปี 2567 หลายจังหวัดใช้ค่าขยะตกค้างซ้ำปีก่อน</p>}
      </Card>

      {isAvg && <Avg4Section onShowMap={() => update({ tab: 'g4' })} />}
    </>
  )

  const right = (
    <ThailandMap
      colorOf={colorOf}
      keyOf={keyOf}
      selected={selected}
      onSelect={(p) => update({ p })}
      legend={scheme.legend}
      legendTitle={TAB_LABELS[tab]}
    >
      {sel && (
        <div className="info-card">
          <button className="close" aria-label="ปิด" onClick={() => update({ p: null })}>×</button>
          <h3>{selected}</h3>
          <div className="muted small">{isAvg ? 'เฉลี่ย 7 ปี' : `ปี ${year}`}</div>
          {/* ป้ายเปลี่ยนตามแท็บ ให้ตรงกับสีที่จังหวัดนี้ได้บนแผนที่ */}
          {tab === 'rec' ? (
            <Badge color={REC_LEVEL[sel.rec_level - 1]}>ระดับรีไซเคิล · {recName(sel.rec_level)}</Badge>
          ) : tab === 'bl' ? (
            <Badge color={BACKLOG_LEVEL[sel.backlog_level - 1]}>ระดับขยะตกค้าง · {backlogName(sel.backlog_level)}</Badge>
          ) : tab === 'g4' ? (
            <Badge color={GROUP4[sel.group4 - 1]}>กลุ่มเฉลี่ย {sel.group4} · {avg4.group_names[sel.group4]}</Badge>
          ) : (
            <Badge color={clusterColor(sel.cluster)}>
              C{sel.cluster} {yearly.cluster_names[sel.cluster]}{isAvg && ' (กลุ่มหลัก 7 ปี)'}
            </Badge>
          )}
          <dl>
            <dt>ขยะเกิดขึ้น</dt><dd>{fmtTon(sel.waste_tpd)} ตัน/วัน</dd>
            <dt>รีไซเคิล</dt><dd>{fmtPct(sel.recycle_pct)}</dd>
            <dt>กำจัดถูกต้อง</dt><dd>{fmtPct(sel.proper_pct)}</dd>
            <dt>กำจัดไม่ถูกต้อง</dt><dd><ImproperValue pct={sel.improper_pct} compact /></dd>
            <dt>ขยะตกค้าง</dt><dd>{fmtDays(sel.backlog_days)} วัน</dd>
            <dt>ระดับ</dt><dd>{recName(sel.rec_level)} · {backlogName(sel.backlog_level)}</dd>
          </dl>
          <Link to={`/province/${encodeURIComponent(selected)}`}>ดูข้อมูลจังหวัด →</Link>
        </div>
      )}
    </ThailandMap>
  )

  return (
    <>
      <Header title="ภาพรวมการจัดการขยะ 77 จังหวัด" subtitle="ผลการจัดกลุ่มจังหวัด ปี 2562–2568">
        <label htmlFor="year-select" className="sr-only">เลือกปี</label>
        <select id="year-select" className="pill-select" value={year} onChange={(e) => update({ year: e.target.value })}>
          <option value="avg">เฉลี่ย 7 ปี</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </Header>
      <TwoColumn left={left} right={right} />
    </>
  )
}

function Avg4Section({ onShowMap }) {
  const { avg4, names } = useData()
  const groups = Object.entries(avg4.group_names).map(([g, name]) => {
    const list = names.filter((n) => avg4.provinces[n].group === +g)
    const mean = (k) => list.reduce((a, n) => a + avg4.provinces[n][k], 0) / list.length
    const sumW = list.reduce((a, n) => a + avg4.provinces[n].waste_tpd, 0)
    const share = (k) => list.reduce((a, n) => a + (avg4.provinces[n][k] * avg4.provinces[n].waste_tpd) / 100, 0) / sumW * 100
    return { g: +g, name, count: list.length, improper: mean('improper_pct'), flow: { proper: share('proper_pct'), recycle: share('recycle_pct'), improper: share('improper_pct') } }
  })
  const top10 = [...names].sort((a, b) => avg4.provinces[b].improper_pct - avg4.provinces[a].improper_pct).slice(0, 10)

  return (
    <>
      <div className="section-head">
        <h2>สรุป 4 กลุ่ม (เฉลี่ย 7 ปี)</h2>
        <button className="btn" onClick={onShowMap}>ดูบนแผนที่</button>
      </div>
      <div className="grid-4">
        {groups.map((g) => (
          <div key={g.g} className="card group-card" style={{ borderTop: `6px solid ${GROUP4[g.g - 1]}` }}>
            <div className="group-name">{g.name}</div>
            <div className="kpi-value">{g.count} <small>จังหวัด</small></div>
            <div className="muted small">% ทิ้งขยะผิดวิธี {fmtPct(g.improper)}</div>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <Card title="10 จังหวัดที่ต้องปรับปรุงที่สุด">
          <RankBars
            ariaLabel="10 จังหวัดที่มี % กำจัดไม่ถูกต้องสูงสุด"
            max={100}
            items={top10.map((n) => ({ label: n, value: avg4.provinces[n].improper_pct, color: GROUP4[avg4.provinces[n].group - 1], text: fmtPct(avg4.provinces[n].improper_pct) }))}
          />
        </Card>
        <Card title="ขยะไปไหนบ้าง (แยกตามกลุ่ม)">
          <StackedBar100
            ariaLabel="สัดส่วนขยะแต่ละกลุ่ม"
            columns={groups.map((g) => ({
              label: g.name,
              parts: [
                { name: 'กำจัดถูก', value: g.flow.proper, color: FLOW.proper },
                { name: 'รีไซเคิล', value: g.flow.recycle, color: FLOW.recycle },
                { name: 'กำจัดผิด', value: g.flow.improper, color: FLOW.improper },
              ],
            }))}
          />
        </Card>
      </div>
    </>
  )
}
