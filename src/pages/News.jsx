import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Card, Header, Tabs } from '../components/Layout'
import { BarChartV, SeriesLegend } from '../components/charts'
import { useData } from '../lib/DataContext'
import { YEARS } from '../lib/data'
import { BACKLOG_LEVEL, DELTA, SERIES } from '../lib/colors'
import { fmtTon } from '../lib/format'
import { NEWS } from '../lib/news'
import { usePageTitle } from '../lib/usePageTitle'

// หน้าข่าวกับข้อมูล: เลือกข่าวทีละเรื่อง (?n=) แล้วดูว่าตัวเลขในฐานข้อมูลตรงกับข่าวไหม
// เนื้อข่าวอยู่ใน lib/news.js ส่วนกราฟและตารางเทียบดึงค่าจริงรายปีจาก raw_yearly
// ตัวชี้วัดรายจังหวัด อ่านจากแถว raw_yearly ของจังหวัดนั้น
const METRICS = {
  tourists: { label: 'นักท่องเที่ยว (ล้านคน/ปี)', short: 'นักท่องเที่ยว (ล้านคน)', get: (r) => r.tourists / 1e6, fmt: (v) => v.toFixed(1), color: 'oklch(0.62 0.14 175)' },
  waste: { label: 'ขยะเกิดขึ้น (ตัน/วัน)', short: 'ขยะ (ตัน/วัน)', get: (r) => r.waste_generated_tpd, fmt: fmtTon, color: SERIES.recycle },
  improper: { label: 'กำจัดไม่ถูกต้อง (%)', get: (r) => r.im_pct, fmt: (v) => `${v.toFixed(0)}%`, color: SERIES.improper },
  backlog: { label: 'ขยะตกค้างสะสม (พันตัน)', get: (r) => r.waste_backlog_t / 1000, fmt: fmtTon, color: BACKLOG_LEVEL[2] },
}

// ตัวชี้วัดทั้งประเทศ อ่านจากผลรวมรายปี (yearly.national) แปลงตัน/วันเป็นล้านตัน/ปี ให้เทียบกับข่าวได้ตรงๆ
const NATIONAL = {
  waste_mt: { label: 'ขยะเกิดขึ้นทั้งประเทศ (ล้านตัน/ปี)', get: (n) => (n.waste_tpd * 365) / 1e6, fmt: (v) => v.toFixed(2), color: SERIES.recycle },
  improper_mt: { label: 'กำจัดไม่ถูกต้องทั้งประเทศ (ล้านตัน/ปี)', get: (n) => (n.improper_tpd * 365) / 1e6, fmt: (v) => v.toFixed(2), color: SERIES.improper },
}

const VERDICT = {
  match: { label: 'ข้อมูลตรงกับข่าว', color: DELTA.better },
  partial: { label: 'ตรงบางส่วน', color: 'oklch(0.78 0.15 80)' },
  mismatch: { label: 'ตัวเลขไม่สะท้อนข่าว', color: DELTA.worse },
}

export default function News() {
  const { yearly, names } = useData()
  const [params, setParams] = useSearchParams()
  usePageTitle('ข่าวกับข้อมูล')
  useHeaderHeight()
  const news = NEWS.find((x) => x.id === params.get('n')) ?? NEWS[0]
  const v = VERDICT[news.verdict]

  return (
    <>
      <Header title="ข่าวดังเรื่องขยะ ตรงกับข้อมูลไหม" subtitle="เหตุการณ์จริงที่อธิบายตัวเลขในฐานข้อมูล ปี 2562–2568" />
      <main className="page-main news-main">
        {/* มีข่าวเดียวไม่ต้องโชว์แท็บ */}
        {NEWS.length > 1 && <Tabs tabs={NEWS.map((x) => ({ key: x.id, label: x.tab }))} value={news.id} onChange={(n) => setParams({ n }, { replace: true })} />}

        {/* key ให้การ์ดเล่น animation ใหม่ทุกครั้งที่เปลี่ยนข่าว */}
        <Card key={news.id} className="news-card">
          <div className="news-meta">
            <Badge color={v.color}>{v.label}</Badge>
            <span className="muted small">เกิดขึ้น: {news.period} · ข่าว: {news.published}</span>
          </div>
          <h2 className="news-title">{news.title}</h2>
          <div className="news-provinces">
            {news.provinces.map((p) =>
              names.includes(p) ? (
                <Link key={p} to={`/province/${encodeURIComponent(p)}`} className="news-prov">{p}</Link>
              ) : (
                <span key={p} className="news-prov">{p}</span>
              ),
            )}
          </div>
          <div className="grid-2 news-compare">
            <div>
              <h3>ข่าวบอกว่า</h3>
              <ul>{news.said.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>ข้อมูลเราบอกว่า</h3>
              <ul>{news.data.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          </div>
          {news.caveat && <p className="news-caveat">⚠ {news.caveat}</p>}
          <div className="news-sources small">
            ที่มา:{' '}
            {news.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ' · '}
                <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
              </span>
            ))}
          </div>
        </Card>

        {news.checks?.length > 0 && <CheckTable key={`${news.id}-checks`} checks={news.checks} yearly={yearly} />}

        <div className="grid-2 news-pair-grid">
          {news.charts.map((c) => {
            const key = `${news.id}-${c.province ?? 'nat'}-${c.pair?.join('+') ?? c.metric ?? c.national}`
            if (c.national) return <NationalCard key={key} national={yearly.national} metric={NATIONAL[c.national]} focus={news.focus} />
            const rows = yearly.provinces[c.province]?.rows
            if (c.pair) return <PairCard key={key} rows={rows} name={c.province} metrics={c.pair.map((m) => METRICS[m])} focus={news.focus} />
            return <MetricCard key={key} rows={rows} name={c.province} metric={METRICS[c.metric]} focus={news.focus} />
          })}
        </div>
      </main>
    </>
  )
}

// ---------- ตารางเทียบตัวเลขข่าวกับข้อมูลเรา ----------
const fmtNum = (v, digits, unit) => {
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  if (unit === '%') return `${v < 0 ? '−' : v > 0 ? '+' : ''}${s}%`
  return `${v < 0 ? '−' : ''}${s}`
}

// exact = ต่างไม่เกิน 1% · direction = ขึ้นหรือลงทิศเดียวกัน · ไม่มีค่าในข้อมูลเรา = เทียบไม่ได้
function judge(c, ours) {
  if (ours == null) return { text: 'ไม่มีในข้อมูลเรา', cls: 'is-na' }
  if (c.match === 'direction') return Math.sign(ours) === Math.sign(c.news) ? { text: '✓ ทิศเดียวกัน', cls: 'is-ok' } : { text: '✗ คนละทิศ', cls: 'is-bad' }
  return Math.abs(ours - c.news) <= Math.abs(c.news) * 0.01 ? { text: '✓ ตรง', cls: 'is-ok' } : { text: '✗ ต่าง', cls: 'is-bad' }
}

function CheckTable({ checks, yearly }) {
  const rows = checks.map((c) => {
    const ours = c.ours(yearly)
    return { ...c, ours, verdict: judge(c, ours) }
  })
  const ok = rows.filter((r) => r.verdict.cls === 'is-ok').length
  const comparable = rows.filter((r) => r.verdict.cls !== 'is-na').length
  return (
    <Card title={`เทียบตัวเลข: ตรง ${ok} จาก ${comparable} รายการ`}>
      <div className="table-scroll">
        <table className="data-table news-check-table">
          <thead>
            <tr><th>รายการ</th><th>ข่าว</th><th>ข้อมูลเรา</th><th>ผล</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                <td>{fmtNum(r.news, r.digits, r.unit)}</td>
                <td>{r.ours == null ? '–' : fmtNum(r.ours, r.digits, r.unit)}</td>
                <td className={r.verdict.cls}>{r.verdict.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// เลื่อนทีละกราฟ (scroll-snap ใน index.css) ต้องรู้ความสูงหัวเว็บที่ติดด้านบน ไม่ให้กราฟไปหยุดใต้หัวเว็บ
// หัวเว็บสูงไม่เท่ากันตามความกว้างจอ (เมนูขึ้นบรรทัดใหม่) จึงวัดจริงแล้วเก็บไว้ใน --header-h
function useHeaderHeight() {
  useEffect(() => {
    const el = document.querySelector('.site-header')
    if (!el) return
    const root = document.documentElement
    const ro = new ResizeObserver(() => root.style.setProperty('--header-h', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => {
      ro.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [])
}

// รวม 2 ตัวชี้วัดที่หน่วยต่างกันไว้กราฟเดียว: ทำเป็นดัชนี ปีแรก = 100 แล้วใส่ค่าจริงไว้ในตารางใต้กราฟ
function PairCard({ rows, name, metrics, focus }) {
  if (!rows) return null
  const W = 520, H = 220, pad = { l: 40, r: 16, t: 14, b: 26 }
  const series = metrics.map((m, k) => {
    const raw = YEARS.map((_, i) => m.get(rows[i]) || 0)
    const base = raw[0] || 1
    return { m, raw, idx: raw.map((v) => (v / base) * 100), dash: k === 0 ? '6 4' : null }
  })
  const top = Math.ceil(Math.max(100, ...series.flatMap((s) => s.idx)) / 50) * 50
  const step = (W - pad.l - pad.r) / (YEARS.length - 1)
  const x = (i) => pad.l + i * step
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b)
  const ticks = Array.from({ length: top / 50 + 1 }, (_, i) => i * 50)
  return (
    <Card title={`${name} · ${metrics.map((m) => m.short).join(' กับ ')}`}>
      <p className="muted small card-sub">เทียบกับปี {YEARS[0]} = 100 · เส้นขึ้นลงพร้อมกัน = ขยะตามนักท่องเที่ยว · แถบเทา = ปีที่ข่าวพูดถึง</p>
      <SeriesLegend items={series.map((s) => ({ name: s.m.short, color: s.m.color }))} />
      <svg viewBox={`0 0 ${W} ${H}`} className="line-chart" role="img" aria-label={`${metrics.map((m) => m.label).join(' และ ')} ของ${name} เทียบปี ${YEARS[0]}`}>
        {YEARS.map((yr, i) => focus.includes(yr) && (
          <rect key={yr} x={x(i) - step / 2} y={pad.t} width={step} height={H - pad.t - pad.b} fill="var(--line)" opacity="0.5" />
        ))}
        {ticks.map((g) => (
          <g key={g}>
            <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} stroke="var(--line)" strokeWidth={g === 100 ? 2 : 1} />
            <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="var(--ink2)">{g}</text>
          </g>
        ))}
        {YEARS.map((yr, i) => (
          <text key={yr} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink2)">{yr}</text>
        ))}
        {series.map((s) => (
          <g key={s.m.label}>
            <polyline fill="none" stroke={s.m.color} strokeWidth="2.5" strokeDasharray={s.dash} strokeLinejoin="round" points={s.idx.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
            {s.idx.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.m.color}>
                <title>{`${s.m.label} ${YEARS[i]}: ${s.m.fmt(s.raw[i])} (ดัชนี ${v.toFixed(0)})`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="table-scroll">
        <table className="data-table news-pair-table">
          <thead>
            <tr><th />{YEARS.map((yr) => <th key={yr} className={focus.includes(yr) ? 'is-focus' : ''}>{yr}</th>)}</tr>
          </thead>
          <tbody>
            {series.map((s) => (
              <tr key={s.m.label}>
                <th><span className="swatch" style={{ background: s.m.color }} />{s.m.short}</th>
                {s.raw.map((v, i) => <td key={i} className={focus.includes(YEARS[i]) ? 'is-focus' : ''}>{s.m.fmt(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// แท่งรายปี: ปีที่ข่าวพูดถึงสีเข้ม ปีอื่นจาง
function YearBars({ title, values, metric, focus }) {
  const items = YEARS.map((y, i) => ({ label: String(y), value: values[i], color: metric.color, text: metric.fmt(values[i]), dim: !focus.includes(y) }))
  return (
    <Card title={title}>
      <p className="muted small card-sub">แท่งสีเข้ม = ปีที่ข่าวพูดถึง</p>
      <BarChartV items={items} height={200} ariaLabel={`${title} ปี ${YEARS[0]}–${YEARS.at(-1)}`} />
    </Card>
  )
}

function NationalCard({ national, metric, focus }) {
  return <YearBars title={metric.label} values={YEARS.map((y) => metric.get(national[y]))} metric={metric} focus={focus} />
}

function MetricCard({ rows, name, metric, focus }) {
  if (!rows) return null
  return <YearBars title={`${name} · ${metric.label}`} values={YEARS.map((_, i) => metric.get(rows[i]) || 0)} metric={metric} focus={focus} />
}
