import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { YEARS } from '../lib/data'
import { CLUSTER5, CLUSTER5_FG, DELTA, GROUP4, MUTED } from '../lib/colors'
import { fmtPct, fmtTon } from '../lib/format'
import { Badge, Card, Header, Tabs, TwoColumn } from '../components/Layout'
import { BarChartV, KpiCard } from '../components/charts'
import ThailandMap from '../components/ThailandMap'
import Select from '../components/Select'

const LAST = YEARS.length - 1
const YEAR_OPTIONS = [{ value: 'avg', label: 'เฉลี่ย 7 ปี' }, ...YEARS.map((y) => ({ value: y, label: String(y) }))]

export default function Clusters() {
  const { yearly, avg4, names } = useData()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // ปีตามที่เลือกในหน้าแรก (?year=) ไม่มีหรือไม่ถูกต้องใช้ปีล่าสุด
  const yearParam = params.get('year')
  const year = yearParam === 'avg' ? 'avg' : YEARS.includes(Number(yearParam)) ? Number(yearParam) : YEARS[LAST]
  const isAvg = year === 'avg'
  const yearLabel = isAvg ? 'เฉลี่ย 7 ปี' : `ปี ${year}`
  const P = yearly.provinces

  // รายปีใช้ 5 กลุ่มจาก result_yearly, เฉลี่ย 7 ปีใช้ 4 กลุ่มจาก result_avg
  const groupIds = isAvg ? Object.keys(avg4.group_names).map(Number).sort((a, b) => a - b) : yearly.cluster_ids
  const groupNames = isAvg ? avg4.group_names : yearly.cluster_names
  const colors = isAvg ? GROUP4 : CLUSTER5
  // เลขกลุ่มที่ไม่มีอยู่จริง (เช่น c=9 หรือ c=5 ตอนเฉลี่ย) ใช้กลุ่มสุดท้ายแทน
  const cParam = Number(params.get('c'))
  const c = groupIds.includes(cParam) ? cParam : groupIds.at(-1)

  // กลุ่มของแต่ละจังหวัดในปีที่เลือก
  const current = useMemo(() => {
    const i = YEARS.indexOf(year)
    return Object.fromEntries(names.map((n) => [n, isAvg ? avg4.provinces[n].group : P[n].cluster[i]]))
  }, [names, P, avg4, year, isAvg])

  const update = (patch) => setParams({ c, year, ...patch }, { replace: true })

  const stats = useMemo(() => {
    const members = names.filter((n) => current[n] === c)
    if (isAvg) {
      // ค่าเฉลี่ย 7 ปีของจังหวัดในกลุ่ม (ถ่วงตามปริมาณขยะ)
      const A = avg4.provinces
      const waste = members.reduce((a, n) => a + A[n].waste_tpd, 0)
      const share = (key) => (members.reduce((a, n) => a + (A[n][key] * A[n].waste_tpd) / 100, 0) / waste) * 100
      return { members, waste, recycle: share('recycle_pct'), proper: share('proper_pct'), improper: share('improper_pct') }
    }
    let total = 0
    let stay = 0
    let pairs = 0
    names.forEach((n) =>
      P[n].cluster.forEach((k, i) => {
        if (k !== c) return
        total += 1
        if (i < LAST) {
          pairs += 1
          if (P[n].cluster[i + 1] === c) stay += 1
        }
      }),
    )
    const avg = (key) => {
      let w = 0
      let part = 0
      names.forEach((n) => P[n].cluster.forEach((k, i) => {
        if (k === c) {
          w += P[n].waste_tpd[i]
          part += (P[n][key][i] * P[n].waste_tpd[i]) / 100
        }
      }))
      return (part / w) * 100
    }
    return {
      members,
      total,
      stayPct: pairs ? (stay / pairs) * 100 : 0,
      perYear: YEARS.map((_, i) => names.filter((n) => P[n].cluster[i] === c).length),
      recycle: avg('recycle_pct'),
      proper: avg('proper_pct'),
      improper: avg('improper_pct'),
    }
  }, [names, P, avg4, c, current, isAvg])

  const legend = groupIds.map((k) => ({ key: k, color: colors[k - 1], label: `กลุ่ม ${k} ${groupNames[k]}`, count: names.filter((n) => current[n] === k).length }))
  // ระบายทุกกลุ่ม แล้วให้แผนที่เน้นกลุ่มที่เลือกในแท็บ (กลุ่มอื่นจางลง)
  const colorOf = useCallback((n) => colors[current[n] - 1] || MUTED, [current, colors])
  const keyOf = useCallback((n) => current[n], [current])

  const policy = (
    <Card title="ประเด็นนโยบายที่แนะนำ">
      <p className="muted small">รอข้อความจากทีม (ต้นแบบเดิมเขียนจากผลรอบเก่า)</p>
    </Card>
  )

  const tabs = (
    <div className="top-stack">
      {/* กลับหน้าหลักโดยคงปีที่เลือกไว้ */}
      <Link to={`/?year=${year}`} className="back-btn">
        <span aria-hidden>‹</span> กลับหน้าหลัก
      </Link>
      <Tabs
        tabs={groupIds.map((k) => ({ key: k, label: `กลุ่ม ${k}` }))}
        value={c}
        onChange={(k) => update({ c: k })}
      />
    </div>
  )

  const left = (
    <>
      <Card>
        <div className="cluster-head">
          <Badge color={colors[c - 1]}>กลุ่ม {c}</Badge>
          <span className="muted">อันดับ {c} จาก {groupIds.length}{isAvg && ' · กลุ่มเฉลี่ย 7 ปี'}</span>
        </div>
        <h2 className="province-title">{groupNames[c]}</h2>
        <p className="small">
          {isAvg ? 'ค่าเฉลี่ย 7 ปีของจังหวัดในกลุ่มนี้' : 'จังหวัด-ปีในกลุ่มนี้'} (ถ่วงตามปริมาณขยะ): นำกลับมาใช้ {fmtPct(stats.recycle)} · กำจัดถูกต้อง {fmtPct(stats.proper)} · กำจัดไม่ถูกต้อง {fmtPct(stats.improper)}
        </p>
        <div className="grid-3">
          <KpiCard label={`จังหวัด${yearLabel}`} value={stats.members.length} />
          {isAvg ? (
            <>
              <KpiCard label="ขยะเกิดขึ้นรวม" value={`${fmtTon(stats.waste)} ตัน/วัน`} />
              <KpiCard label="% กำจัดไม่ถูกต้อง" value={fmtPct(stats.improper)} />
            </>
          ) : (
            <>
              <KpiCard label="จังหวัด-ปีทั้งหมด" value={stats.total} />
              <KpiCard label="อยู่กลุ่มเดิมปีถัดไป" value={fmtPct(stats.stayPct)} />
            </>
          )}
        </div>
      </Card>

      {isAvg ? (
        <>
          <Card title={`จังหวัดในกลุ่ม (${yearLabel}) · ${stats.members.length} จังหวัด`}>
            {/* key ทำให้กลับไปหน้า 1 เมื่อเปลี่ยนกลุ่ม */}
            <AvgProvinceTable key={c} members={stats.members} />
          </Card>
          {policy}
        </>
      ) : (
        <>
          <Card title={`จังหวัดในกลุ่ม (${yearLabel}) · ${stats.members.length} จังหวัด`}>
            <p className="muted small card-sub">เส้นทางกลุ่มการกำจัด 7 ปีของแต่ละจังหวัด · ช่องสีเต็ม = ปีที่อยู่กลุ่ม {c}</p>
            <YearlyPathTable key={`${c}-${year}`} members={stats.members} c={c} year={year} />
          </Card>
          <div className="grid-2">
          {policy}
          <Card title="จำนวนจังหวัดในกลุ่มรายปี">
            <BarChartV
              ariaLabel="จำนวนจังหวัดในกลุ่มรายปี"
              items={YEARS.map((y, i) => ({ label: String(y), value: stats.perYear[i], color: CLUSTER5[c - 1], dim: y !== year, text: stats.perYear[i] }))}
            />
          </Card>
          </div>
        </>
      )}
    </>
  )

  return (
    <>
      <Header title="กลุ่มจังหวัด" subtitle={isAvg ? 'กลุ่มเฉลี่ย 7 ปี 4 กลุ่ม' : 'กลุ่มการกำจัดรายปี 5 กลุ่ม'}>
        <Select label="เลือกปี" align="right" value={year} onChange={(v) => update({ year: v })} options={YEAR_OPTIONS} />
      </Header>
      <TwoColumn
        top={tabs}
        left={left}
        right={
          <ThailandMap
            colorOf={colorOf}
            keyOf={keyOf}
            focus={c}
            onFocusChange={(k) => k != null && update({ c: k })}
            legendDefaultOpen
            onSelect={(p) => navigate(`/province/${encodeURIComponent(p)}`)}
            legend={legend}
            legendTitle={isAvg ? 'กลุ่มเฉลี่ย 7 ปี' : `กลุ่มการกำจัด ${yearLabel}`}
          />
        }
      />
    </>
  )
}

const PAGE_SIZE = 5
const byThai = (a, b) => a.localeCompare(b, 'th')
const DEFAULT_SORT = { key: 'name', dir: 1 }

// ตัวกรอง/การเรียง/แบ่งหน้าที่ใช้ร่วมกันของตารางจังหวัดในกลุ่ม
function useTableControls(all) {
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [sort, setSort] = useState(DEFAULT_SORT)

  const regions = [...new Set(all.map((r) => r.region))].sort(byThai)
  const filtered = all
    .filter((r) => (!region || r.region === region) && r.name.includes(q.trim()))
    .sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      return (typeof x === 'string' ? byThai(x, y) : x - y) * sort.dir || byThai(a.name, b.name)
    })
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const cur = Math.min(page, pages - 1)

  // เปลี่ยนตัวกรอง/การเรียงแล้วกลับไปหน้าแรก
  const reset = (fn) => (v) => {
    fn(v)
    setPage(0)
  }
  return {
    q, region, sort, regions, filtered, pages, cur,
    rows: filtered.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE),
    setQ: reset(setQ),
    setRegion: reset(setRegion),
    setPage,
    // คอลัมน์ข้อความเริ่มเรียง ก→ฮ, คอลัมน์ตัวเลขเริ่มจากมากไปน้อย
    toggleSort: (key) => reset(setSort)(sort.key === key ? { key, dir: -sort.dir } : { key, dir: typeof all[0]?.[key] === 'string' ? 1 : -1 }),
    dirty: q !== '' || region !== '' || sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir,
    clearAll: () => {
      setQ('')
      setRegion('')
      setSort(DEFAULT_SORT)
      setPage(0)
    },
  }
}

function TableToolbar({ t, idPrefix }) {
  return (
    <div className="table-filters">
      <label htmlFor={`${idPrefix}-q`} className="sr-only">ค้นหาจังหวัด</label>
      <input id={`${idPrefix}-q`} className="pill-input" placeholder="ค้นหาจังหวัด…" value={t.q} onChange={(e) => t.setQ(e.target.value)} />
      <Select
        label="กรองตามภาค"
        align="right"
        value={t.region}
        onChange={t.setRegion}
        options={[{ value: '', label: 'ทุกภาค' }, ...t.regions.map((r) => ({ value: r, label: r }))]}
      />
      <button className="btn filter-clear" disabled={!t.dirty} onClick={t.clearAll}>ล้าง</button>
    </div>
  )
}

function SortTh({ t, col }) {
  const on = t.sort.key === col.key
  return (
    <th aria-sort={on ? (t.sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-sort" onClick={() => t.toggleSort(col.key)}>
        {col.label}
        <span aria-hidden className={on ? '' : 'muted'}>{on ? (t.sort.dir > 0 ? ' ▲' : ' ▼') : ' ↕'}</span>
      </button>
    </th>
  )
}

function Pager({ t }) {
  return (
    <div className="pager">
      <button className="btn" disabled={t.cur === 0} onClick={() => t.setPage(t.cur - 1)}>‹ ก่อนหน้า</button>
      <span className="muted small">{t.filtered.length} จังหวัด · หน้า {t.cur + 1} / {t.pages}</span>
      <button className="btn" disabled={t.cur === t.pages - 1} onClick={() => t.setPage(t.cur + 1)}>ถัดไป ›</button>
    </div>
  )
}

const EmptyRow = ({ cols }) => (
  <tr><td colSpan={cols} className="muted">ไม่พบจังหวัดที่ตรงกับตัวกรอง</td></tr>
)

const AVG_COLUMNS = [
  { key: 'name', label: 'จังหวัด' },
  { key: 'region', label: 'ภาค' },
  { key: 'waste_tpd', label: 'ขยะเกิดขึ้น (ตัน/วัน)', fmt: fmtTon },
  { key: 'recycle_pct', label: 'นำกลับมาใช้', fmt: fmtPct },
  { key: 'proper_pct', label: 'กำจัดถูกต้อง', fmt: fmtPct },
  { key: 'improper_pct', label: 'กำจัดไม่ถูกต้อง', fmt: fmtPct },
]

// ตารางจังหวัดในกลุ่มเฉลี่ย 7 ปี: กรองตามชื่อ/ภาค กดหัวคอลัมน์เพื่อเรียง แบ่งหน้าละ 5 จังหวัด
function AvgProvinceTable({ members }) {
  const { avg4 } = useData()
  const t = useTableControls(members.map((n) => ({ name: n, ...avg4.provinces[n] })))
  return (
    <>
      <TableToolbar t={t} idPrefix="avg" />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>{AVG_COLUMNS.map((col) => <SortTh key={col.key} t={t} col={col} />)}</tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.name}>
                <td><Link to={`/province/${encodeURIComponent(r.name)}`}>{r.name}</Link></td>
                <td>{r.region}</td>
                {AVG_COLUMNS.slice(2).map((col) => <td key={col.key}>{col.fmt(r[col.key])}</td>)}
              </tr>
            ))}
            {t.rows.length === 0 && <EmptyRow cols={AVG_COLUMNS.length} />}
          </tbody>
        </table>
      </div>
      <Pager t={t} />
    </>
  )
}

// ตารางเส้นทาง 7 ปีของจังหวัดในกลุ่ม (รายปี)
// change = กลุ่มปีแรก − ปีสุดท้าย (กลุ่มเลขน้อย = ดีกว่า, บวก = ดีขึ้น)
function YearlyPathTable({ members, c, year }) {
  const { yearly } = useData()
  const P = yearly.provinces
  const t = useTableControls(
    members.map((n) => ({
      name: n,
      region: P[n].region,
      path: P[n].cluster,
      change: P[n].cluster[0] - P[n].cluster[LAST],
    })),
  )
  const short = (y) => String(y).slice(2)
  const nameCol = { key: 'name', label: 'จังหวัด' }
  const changeCol = { key: 'change', label: `${short(YEARS[0])}→${short(YEARS[LAST])}` }
  return (
    <>
      <TableToolbar t={t} idPrefix="path" />
      <div className="table-scroll">
        <table className="data-table path-table">
          <thead>
            <tr>
              <SortTh t={t} col={nameCol} />
              {YEARS.map((y) => <th key={y} className={`path-year${y === year ? ' is-cur' : ''}`}>{short(y)}</th>)}
              <SortTh t={t} col={changeCol} />
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r) => (
              <tr key={r.name}>
                <td>
                  <Link to={`/province/${encodeURIComponent(r.name)}`}>{r.name}</Link>
                  <span className="muted small block">{r.region}</span>
                </td>
                {r.path.map((k, i) => (
                  <td key={i} className={`path-year${YEARS[i] === year ? ' is-cur' : ''}`}>
                    <span
                      className={`path-cell${k === c ? '' : ' is-other'}`}
                      style={{ background: CLUSTER5[k - 1], color: CLUSTER5_FG[k - 1] }}
                      title={`${YEARS[i]}: กลุ่ม ${k} ${yearly.cluster_names[k]}`}
                    >
                      {k}
                    </span>
                  </td>
                ))}
                <td>
                  {r.change === 0 ? (
                    <span className="muted">คงที่</span>
                  ) : (
                    <span className="change" style={{ color: r.change > 0 ? DELTA.better : DELTA.worse }}>
                      {r.change > 0 ? '▲ ดีขึ้น' : '▼ แย่ลง'} {Math.abs(r.change)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {t.rows.length === 0 && <EmptyRow cols={YEARS.length + 2} />}
          </tbody>
        </table>
      </div>
      <Pager t={t} />
      <div className="path-legend small">
        {yearly.cluster_ids.map((k) => (
          <span key={k}>
            <span className="path-cell" style={{ background: CLUSTER5[k - 1], color: CLUSTER5_FG[k - 1] }}>{k}</span>
            {yearly.cluster_names[k]}
          </span>
        ))}
      </div>
    </>
  )
}
