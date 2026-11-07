import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { useSelection } from '../lib/SelectionContext'
import { YEARS } from '../lib/data'
import { BACKLOG_LEVEL, BACKLOG_LEVEL_NAMES, CLUSTER5, DELTA, FLOW, GROUP4, REC_LEVEL, REC_LEVEL_NAMES, SERIES } from '../lib/colors'
import { fmtDays, fmtPct, fmtTon } from '../lib/format'
import { backlogName, clusterColor, provinceSnapshot, recName } from '../lib/model'
import { Badge, Card, Header, Tabs, TwoColumn } from '../components/Layout'
import { BarChartV, Donut, KpiCard, RankBars, SeriesLegend, StackedBar100 } from '../components/charts'
import ThailandMap from '../components/ThailandMap'
import ImproperValue from '../components/ImproperValue'
import Select from '../components/Select'

const YEAR_OPTIONS = [{ value: 'avg', label: 'เฉลี่ย 7 ปี' }, ...YEARS.map((y) => ({ value: y, label: String(y) }))]
const TAB_LABELS = { dis: 'การกำจัด', rec: 'รีไซเคิล', bl: 'ขยะตกค้าง' }

export default function Home() {
  const data = useData()
  const { yearly, avg4, names } = data
  const [params, setParams] = useSearchParams()
  // ปีในลิงก์ที่ไม่มีข้อมูล (เช่น 2570) ใช้ปีล่าสุดแทน
  const yearParam = params.get('year')
  const year = yearParam === 'avg' ? 'avg' : YEARS.includes(Number(yearParam)) ? Number(yearParam) : 2568
  const isAvg = year === 'avg'
  // แท็บที่ไม่มีแล้ว (เช่น g4 เดิม ซึ่งรวมเข้าแท็บการกำจัดตอนเฉลี่ย 7 ปี) ใช้แท็บการกำจัดแทน
  const tabParam = params.get('tab')
  const tab = tabParam in TAB_LABELS ? tabParam : 'dis'
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
    // การกำจัด: เฉลี่ย 7 ปีใช้ 4 กลุ่มจาก result_avg, รายปีใช้ 5 กลุ่มจาก result_yearly
    if (isAvg)
      return {
        key: (s) => s.group4,
        color: (s) => GROUP4[s.group4 - 1],
        legend: Object.entries(avg4.group_names).map(([g, l]) => ({ key: +g, color: GROUP4[g - 1], label: `กลุ่ม ${g} ${l}`, count: count((s) => s.group4, +g) })),
      }
    return {
      key: (s) => s.cluster,
      color: (s) => CLUSTER5[s.cluster - 1],
      legend: yearly.cluster_ids.map((c) => ({ key: c, color: CLUSTER5[c - 1], label: `กลุ่ม ${c} ${yearly.cluster_names[c]}`, count: count((s) => s.cluster, c) })),
    }
  }, [tab, isAvg, names, snaps, avg4, yearly])

  // กลุ่มที่เน้นบนแผนที่ (จากสัญลักษณ์หรือการ์ดสรุป 4 กลุ่ม) ผูกกับแท็บ+ปี เปลี่ยนแล้วล้างเอง
  const [focusState, setFocusState] = useState({ scope: '', key: null })
  const scope = `${tab}|${year}`
  const focus = focusState.scope === scope ? focusState.key : null
  const setFocus = (key) => setFocusState({ scope, key })
  const pickGroup = (g) => {
    // การ์ดกลุ่มใช้สีแท็บการกำจัด ถ้าอยู่แท็บอื่นสลับมาก่อน, กดซ้ำเพื่อยกเลิก
    // จังหวัดที่เลือกอยู่จะทำให้จังหวัดอื่นจางหมด จึงล้างการเลือกออกเพื่อให้เห็นทั้งกลุ่ม
    const off = tab === 'dis' && focus === g
    if (tab !== 'dis' || (!off && selected)) update({ tab: 'dis', ...(off ? {} : { p: null }) })
    setFocusState({ scope: `dis|${year}`, key: off ? null : g })
    // จอแคบแผนที่อยู่ด้านล่าง เลื่อนให้เห็น
    document.querySelector('.map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const colorOf = useCallback((n) => snaps[n] && scheme.color(snaps[n]), [snaps, scheme])
  const keyOf = useCallback((n) => snaps[n] && scheme.key(snaps[n]), [snaps, scheme])

  // KPI ใบที่ 3
  const kpi3 = {
    // กลุ่มสุดท้าย = ควรปรับปรุง (รายปีคือกลุ่ม 5, เฉลี่ย 7 ปีคือกลุ่ม 4)
    dis: { label: `จังหวัดกลุ่ม ${scheme.legend.at(-1)?.key}`, value: `${scheme.legend.at(-1)?.count ?? 0} จังหวัด` },
    rec: { label: '% นำกลับมาใช้ทั้งประเทศ', value: fmtPct((nat.recycle_tpd / nat.waste_tpd) * 100) },
    bl: { label: 'จังหวัดตกค้างมาก', value: `${scheme.legend[3]?.count ?? 0} จังหวัด` },
  }[tab]

  // KPI เฉลี่ย 7 ปีตามแท็บ: ค่าทั้งประเทศของแท็บนั้น + จำนวนจังหวัดที่แย่กว่าค่าประเทศ
  // (คิดจาก raw_yearly ไม่ใช้ระดับรีไซเคิล/ตกค้างใน result_avg)
  const natPct = (k) => (nat[k] / nat.waste_tpd) * 100
  const natDays = nat.backlog_t / nat.waste_tpd
  const countAvg = (fn) => `${names.filter((n) => fn(avg4.provinces[n])).length} จังหวัด`
  const avgKpis = isAvg && {
    dis: [
      { label: '% กำจัดไม่ถูกต้อง', value: fmtPct(natPct('improper_tpd')), sub: `${fmtTon(nat.improper_tpd)} ตัน/วัน`, color: DELTA.improper },
      { label: 'จังหวัดกำจัดไม่ถูกต้องสูงกว่าค่าประเทศ', value: countAvg((a) => a.improper_pct > natPct('improper_tpd')), sub: `ค่าประเทศ ${fmtPct(natPct('improper_tpd'))}` },
    ],
    rec: [
      { label: '% นำกลับมาใช้', value: fmtPct(natPct('recycle_tpd')), sub: `${fmtTon(nat.recycle_tpd)} ตัน/วัน`, color: SERIES.recycle },
      { label: 'จังหวัดรีไซเคิลต่ำกว่าค่าประเทศ', value: countAvg((a) => a.recycle_pct < natPct('recycle_tpd')), sub: `ค่าประเทศ ${fmtPct(natPct('recycle_tpd'))}` },
    ],
    bl: [
      { label: 'ขยะตกค้าง (เฉลี่ยต่อปี)', value: `${(nat.backlog_t / 1e6).toFixed(1)} ล้านตัน`, sub: `≈ ${fmtDays(natDays)} วันของขยะที่เกิดขึ้น`, color: BACKLOG_LEVEL[2] },
      { label: 'จังหวัดตกค้างมากกว่าค่าประเทศ', value: countAvg((a) => a.backlog_days > natDays), sub: `ค่าประเทศ ${fmtDays(natDays)} วัน` },
    ],
  }[tab]

  // ขยะกำจัดไม่ถูกต้องแยกตามกลุ่ม: รายปีใช้กลุ่ม 1–5 ของปีนั้น, เฉลี่ย 7 ปีใช้กลุ่มเฉลี่ย 4 กลุ่ม (result_avg)
  const improperGroups = isAvg
    ? Object.entries(avg4.group_names).map(([g, name]) => ({
        label: name,
        color: GROUP4[g - 1],
        value: names
          .filter((n) => avg4.provinces[n].group === +g)
          .reduce((a, n) => a + (avg4.provinces[n].waste_tpd * avg4.provinces[n].improper_pct) / 100, 0),
      }))
    : yearly.cluster_ids.map((c, i) => ({ label: `กลุ่ม ${c}`, color: CLUSTER5[c - 1], value: nat.improper_by_cluster[i] }))
  const improperTotal = improperGroups.reduce((a, g) => a + g.value, 0)

  // แนวโน้ม 7 ปี ทั้งประเทศตามแท็บ
  const trendVal = (n) =>
    tab === 'rec' ? (n.recycle_tpd / n.waste_tpd) * 100 : tab === 'bl' ? n.backlog_t / n.waste_tpd : (n.improper_tpd / n.waste_tpd) * 100
  const trendTitle = { dis: '% กำจัดไม่ถูกต้อง', rec: '% นำกลับมาใช้', bl: 'วันตกค้าง (ถ่วงน้ำหนัก)' }[tab]
  const trendColor = tab === 'rec' ? SERIES.recycle : tab === 'bl' ? BACKLOG_LEVEL[2] : SERIES.improper

  const sel = selected && snaps[selected]

  // แท็บอยู่แถวบนเหนือทั้งสองคอลัมน์ ให้แผนที่เริ่มเสมอกับการ์ด KPI
  const tabs = (
    <Tabs
      tabs={[
        { key: 'dis', label: TAB_LABELS.dis },
        { key: 'rec', label: TAB_LABELS.rec },
        { key: 'bl', label: TAB_LABELS.bl },
      ]}
      value={tab}
      onChange={(t) => update({ tab: t })}
      extra={<Link className="tab-link" to={`/clusters?year=${year}`}>กลุ่มจังหวัด</Link>}
    />
  )

  const left = (
    <>
      <div className="grid-3">
        <KpiCard label="ขยะเกิดขึ้นทั้งประเทศ" value={`${fmtTon(nat.waste_tpd)} ตัน/วัน`} />
        {isAvg ? (
          avgKpis.map((k) => <KpiCard key={k.label} {...k} />)
        ) : (
          <>
            <KpiCard
              label="% กำจัดไม่ถูกต้อง"
              value={fmtPct((nat.improper_tpd / nat.waste_tpd) * 100)}
              sub={`${fmtTon(nat.improper_tpd)} ตัน/วัน`}
              color={DELTA.improper}
            />
            <KpiCard label={kpi3.label} value={kpi3.value} />
          </>
        )}
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

      {/* แนวโน้มรายปีแสดงเฉพาะโหมดรายปี (โหมดเฉลี่ย 7 ปีไม่แสดง) */}
      {!isAvg && (
        <Card title={`${trendTitle} ทั้งประเทศ 7 ปี`}>
          <BarChartV
            ariaLabel={`${trendTitle} รายปี`}
            items={YEARS.map((y) => {
              const v = trendVal(yearly.national[y])
              return { label: String(y), value: v, color: trendColor, dim: y !== year, text: tab === 'bl' ? fmtDays(v) : fmtPct(v) }
            })}
          />
          {tab === 'bl' && <p className="muted small">หมายเหตุ: ปี 2567 หลายจังหวัดใช้ค่าขยะตกค้างซ้ำปีก่อน</p>}
        </Card>
      )}

      {isAvg && <Avg4Section tab={tab} focus={tab === 'dis' ? focus : null} onPick={pickGroup} />}
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
      focus={focus}
      onFocusChange={setFocus}
    >
      {sel && (
        // key ทำให้การ์ดเด้งขึ้นใหม่เมื่อเปลี่ยนจังหวัด
        <div className="info-card" key={selected}>
          <button className="close" aria-label="ปิด" onClick={() => update({ p: null })}>×</button>
          <h3>{selected}</h3>
          <div className="muted small">{isAvg ? 'เฉลี่ย 7 ปี' : `ปี ${year}`}</div>
          {/* ป้ายเปลี่ยนตามแท็บ ให้ตรงกับสีที่จังหวัดนี้ได้บนแผนที่ */}
          {tab === 'rec' ? (
            <Badge color={REC_LEVEL[sel.rec_level - 1]}>ระดับรีไซเคิล · {recName(sel.rec_level)}</Badge>
          ) : tab === 'bl' ? (
            <Badge color={BACKLOG_LEVEL[sel.backlog_level - 1]}>ระดับขยะตกค้าง · {backlogName(sel.backlog_level)}</Badge>
          ) : isAvg ? (
            <Badge color={GROUP4[sel.group4 - 1]}>กลุ่ม {sel.group4} {avg4.group_names[sel.group4]} (เฉลี่ย 7 ปี)</Badge>
          ) : (
            <Badge color={clusterColor(sel.cluster)}>กลุ่ม {sel.cluster} {yearly.cluster_names[sel.cluster]}</Badge>
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
        <Select label="เลือกปี" align="right" value={year} onChange={(v) => update({ year: v })} options={YEAR_OPTIONS} />
      </Header>
      <TwoColumn top={tabs} left={left} right={right} />
    </>
  )
}

// 10 จังหวัดที่ต้องปรับปรุงตามแท็บ (ค่าเฉลี่ย 7 ปีจาก raw_yearly), dir = -1 มากไปน้อย / 1 น้อยไปมาก
// max = null ให้แท่งยาวเทียบอันดับ 1 (วันตกค้างบางจังหวัดหลักพัน)
const TOP10 = {
  dis: { title: '10 จังหวัดกำจัดไม่ถูกต้องสูงสุด', key: 'improper_pct', dir: -1, max: 100, fmt: fmtPct },
  rec: { title: '10 จังหวัดรีไซเคิลต่ำสุด', key: 'recycle_pct', dir: 1, max: 100, fmt: fmtPct },
  bl: { title: '10 จังหวัดขยะตกค้างมากสุด', key: 'backlog_days', dir: -1, max: null, fmt: (v) => `${fmtDays(v)} วัน` },
}

function Avg4Section({ tab, focus, onPick }) {
  const { avg4, names } = useData()
  const groups = Object.entries(avg4.group_names).map(([g, name]) => {
    const list = names.filter((n) => avg4.provinces[n].group === +g)
    const mean = (k) => list.reduce((a, n) => a + avg4.provinces[n][k], 0) / list.length
    const sumW = list.reduce((a, n) => a + avg4.provinces[n].waste_tpd, 0)
    const share = (k) => list.reduce((a, n) => a + (avg4.provinces[n][k] * avg4.provinces[n].waste_tpd) / 100, 0) / sumW * 100
    return { g: +g, name, count: list.length, improper: mean('improper_pct'), flow: { proper: share('proper_pct'), recycle: share('recycle_pct'), improper: share('improper_pct') } }
  })
  const top = TOP10[tab] || TOP10.dis
  const val = (n) => avg4.provinces[n][top.key]
  const top10 = [...names].sort((a, b) => (val(a) - val(b)) * top.dir).slice(0, 10)

  return (
    <>
      <div className="section-head">
        <h2>สรุป 4 กลุ่ม (เฉลี่ย 7 ปี)</h2>
        <span className="muted small">กดการ์ดเพื่อเน้นกลุ่มบนแผนที่</span>
      </div>
      <div className="grid-4">
        {groups.map((g) => (
          <button
            key={g.g}
            type="button"
            className="card group-card"
            aria-pressed={focus === g.g}
            title={focus === g.g ? 'กดอีกครั้งเพื่อยกเลิกการเน้น' : 'เน้นกลุ่มนี้บนแผนที่'}
            style={{ borderTop: `6px solid ${GROUP4[g.g - 1]}`, '--group': GROUP4[g.g - 1] }}
            onClick={() => onPick(g.g)}
          >
            <div className="group-name">{g.name}</div>
            <div className="kpi-value">{g.count} <small>จังหวัด</small></div>
            <div className="muted small">% ทิ้งขยะผิดวิธี {fmtPct(g.improper)}</div>
          </button>
        ))}
      </div>
      <div className="grid-2">
        <Card title={top.title}>
          <RankBars
            ariaLabel={top.title}
            max={top.max ?? val(top10[0])}
            items={top10.map((n) => ({ label: n, value: val(n), color: GROUP4[avg4.provinces[n].group - 1], text: top.fmt(val(n)) }))}
          />
          <p className="muted small">ค่าเฉลี่ย 7 ปี · สีแท่ง = กลุ่มการกำจัด</p>
        </Card>
        <Card title="ขยะไปไหนบ้าง (แยกตามกลุ่ม)" className="fill-card">
          <SeriesLegend items={[{ name: 'กำจัดถูก', color: FLOW.proper }, { name: 'รีไซเคิล', color: FLOW.recycle }, { name: 'กำจัดผิด', color: FLOW.improper }]} />
          <StackedBar100
            height={null}
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
