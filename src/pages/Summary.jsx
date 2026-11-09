import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, Header } from '../components/Layout'
import { useData } from '../lib/DataContext'
import { useSelection } from '../lib/SelectionContext'
import { YEARS } from '../lib/data'
import { DELTA, GROUP_RAMP, GROUP_RAMP_FG } from '../lib/colors'
import { usePageTitle } from '../lib/usePageTitle'
import Select from '../components/Select'

// หน้าสรุปรวม: จังหวัดดีขึ้นไหมเทียบปีก่อน
// ดีขึ้น = ปีนั้นย้ายไปกลุ่มการกำจัดที่ดีกว่า (เลขกลุ่มน้อยลง, result_yearly) · แย่ลง = ย้ายไปกลุ่มที่แย่กว่า
// ตัวกรอง: ?g= กลุ่ม (ตามกลุ่มปีล่าสุด) แล้วค่อย ?p= จังหวัด · ไม่เลือกอะไร = ดูภาพรวมทุกจังหวัดในตัวกรอง
// สีใช้แค่ เขียว (ดีขึ้น) / แดง (แย่ลง) / เทา (เท่าเดิม)
const byThai = (a, b) => a.localeCompare(b, 'th')
const LAST = YEARS.length - 1
const NONE = ''
const LOOK = {
  1: { word: 'ดีขึ้น', icon: '▲', color: DELTA.better },
  0: { word: 'เท่าเดิม', icon: '●', color: 'var(--ink2)' },
  [-1]: { word: 'แย่ลง', icon: '▼', color: DELTA.worse },
}

// กลุ่มของแต่ละปี + ผลเทียบปีก่อน (+1 ดีขึ้น, -1 แย่ลง, 0 เท่าเดิม, null = ปีแรก)
function pathOf(yearly, name) {
  const c = yearly.provinces[name].cluster
  return YEARS.map((y, i) => ({ y, g: c[i], prev: i ? c[i - 1] : null, j: i ? Math.sign(c[i - 1] - c[i]) : null }))
}

// ป้ายเลขกลุ่มสีตามระดับ (เขียว = ดี → แดง = แย่)
function GroupChip({ g, children }) {
  return (
    <span className="group-chip" style={{ background: GROUP_RAMP[g - 1], color: GROUP_RAMP_FG[g - 1] }}>
      {children ?? g}
    </span>
  )
}

function Verdict({ j }) {
  const L = LOOK[j]
  return (
    <span className="move-result" style={{ color: L.color, background: `color-mix(in oklab, ${L.color} 14%, transparent)` }}>
      {L.icon} {L.word}
    </span>
  )
}

export default function Summary() {
  const { yearly, names } = useData()
  const { setProvince } = useSelection()
  const [params, setParams] = useSearchParams()
  usePageTitle('สรุปรวม')

  const groups = yearly.cluster_ids
  const gParam = Number(params.get('g'))
  const g = groups.includes(gParam) ? gParam : null
  const inGroup = (n) => g == null || yearly.provinces[n].cluster[LAST] === g
  const list = names.filter(inGroup).sort(byThai)
  const pParam = params.get('p')
  const name = pParam && yearly.provinces[pParam] && inGroup(pParam) ? pParam : null

  const set = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => (v == null || v === NONE ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }
  const pickGroup = (v) => {
    const ng = v === NONE ? null : Number(v)
    // จังหวัดที่เลือกอยู่ไม่ได้อยู่ในกลุ่มใหม่ ให้ล้างออก
    const keep = name && (ng == null || yearly.provinces[name].cluster[LAST] === ng)
    set({ g: ng == null ? null : String(ng), p: keep ? name : null })
  }
  const pickProvince = (v) => {
    if (v !== NONE) setProvince(v)
    set({ p: v })
  }

  const groupOptions = [{ value: NONE, label: 'ทุกกลุ่ม' }, ...groups.map((k) => ({ value: String(k), label: `กลุ่ม ${k} · ${yearly.cluster_names[k]}` }))]
  const provinceOptions = [{ value: NONE, label: `ทุกจังหวัด (${list.length})` }, ...list.map((n) => ({ value: n, label: n }))]

  return (
    <>
      <Header title="จังหวัดไหน ดีขึ้นบ้าง?" subtitle="เทียบทีละปีกับปีก่อนหน้า ว่าการจัดการขยะดีขึ้นหรือแย่ลง" />
      <main className="page-main better-main">
        {/* ตัวกรอง: เลือกกลุ่มก่อน แล้วค่อยเลือกจังหวัด (ไม่เลือกก็ได้) */}
        <div className="better-filter">
          <div className="filter-step">
            <span>1. กลุ่ม <small className="muted">(ปี {YEARS[LAST]})</small></span>
            <Select label="เลือกกลุ่ม" value={g == null ? NONE : String(g)} onChange={pickGroup} options={groupOptions} />
          </div>
          <span className="filter-arrow" aria-hidden>→</span>
          <div className="filter-step">
            <span>2. จังหวัด</span>
            <Select label="เลือกจังหวัด" value={name ?? NONE} onChange={pickProvince} options={provinceOptions} />
          </div>
          {(g != null || name) && (
            <button type="button" className="btn filter-clear" onClick={() => set({ g: null, p: null })}>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {name ? (
          <ProvinceView yearly={yearly} name={name} />
        ) : (
          <OverviewView yearly={yearly} list={list} g={g} onPick={pickProvince} />
        )}
      </main>
    </>
  )
}

// ---------- เลือกจังหวัด: กราฟเส้นกลุ่มรายปี + ตาราง ----------
function ProvinceView({ yearly, name }) {
  const s = pathOf(yearly, name)
  const r = s.slice(1)
  const latest = r.at(-1)
  const n = (j) => r.filter((x) => x.j === j).length
  return (
    <>
      <Card className="better-card">
        <div className="better-name">{name}</div>
        <p className="better-headline">
          ปีล่าสุด ({latest.y}) <Verdict j={latest.j} /> {latest.j === 0 ? 'เหมือนปีก่อน' : 'จากปีก่อน'}
        </p>
        <p className="better-sub">
          {r.length} ปีที่ผ่านมา: <b style={{ color: DELTA.better }}>ดีขึ้น {n(1)} ปี</b> · <b style={{ color: DELTA.worse }}>แย่ลง {n(-1)} ปี</b> · เท่าเดิม {n(0)} ปี
        </p>
        <GroupLine s={s} groups={yearly.cluster_ids} />
        <p className="better-note">
          เส้นขึ้น = <b>ดีขึ้น</b> ย้ายไปกลุ่มที่จัดการขยะได้ดีกว่าปีก่อน · เส้นลง = <b>แย่ลง</b> · เส้นเรียบ = <b>เท่าเดิม</b>
        </p>
      </Card>
      <Card title={`การย้ายกลุ่มของ${name} ทีละปี`}>
        <p className="muted small card-sub">กลุ่ม 1 จัดการขยะดีที่สุด → กลุ่ม 5 แย่ที่สุด</p>
        <div className="table-scroll">
          <table className="data-table move-table">
            <thead>
              <tr><th>ปี</th><th>อยู่กลุ่ม</th><th>เปลี่ยนจากปีก่อน</th><th>ผล</th></tr>
            </thead>
            <tbody>
              {[...s].reverse().map((p) => (
                <tr key={p.y}>
                  <td>{p.y}</td>
                  <td><GroupChip g={p.g}>กลุ่ม {p.g}</GroupChip> <span className="muted">{yearly.cluster_names[p.g]}</span></td>
                  <td>
                    {p.prev == null ? <span className="muted">ปีแรกของข้อมูล</span> : p.prev === p.g ? <span className="muted">อยู่กลุ่มเดิม</span> : <>กลุ่ม {p.prev} → กลุ่ม {p.g}</>}
                  </td>
                  <td>{p.j == null ? <span className="muted">–</span> : <Verdict j={p.j} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// กราฟเส้นกลุ่มรายปี: แกน y = กลุ่ม 1–5 (1 อยู่บน) เส้นขึ้น = ดีขึ้น
function GroupLine({ s, groups }) {
  const [hover, setHover] = useState(null)
  const W = 760
  const H = 290
  const pad = { l: 64, r: 30, t: 40, b: 48 }
  // เว้นระยะในกราฟซ้ายขวา ไม่ให้จุดปีแรก/ปีสุดท้ายชนเลขบนแกน
  const inset = 30
  const g0 = groups[0]
  const g1 = groups.at(-1)
  const x = (i) => pad.l + inset + (i * (W - pad.l - pad.r - inset * 2)) / (s.length - 1)
  const y = (g) => pad.t + ((g - g0) / (g1 - g0)) * (H - pad.t - pad.b)
  const step = (W - pad.l - pad.r - inset * 2) / (s.length - 1)
  const rowH = (H - pad.t - pad.b) / (g1 - g0)
  const hi = s.findIndex((p) => p.y === hover)
  const hp = s[hi]

  return (
    <div className="better-plot" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`กลุ่มรายปี: ${s.map((p) => `${p.y} กลุ่ม ${p.g}`).join(', ')}`}>
        <text x={pad.l - 26} y={pad.t - 20} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink2)">กลุ่ม</text>
        {groups.map((k) => (
          <g key={k}>
            <rect x={pad.l} y={y(k) - rowH / 2} width={W - pad.l - pad.r} height={rowH} fill={GROUP_RAMP[k - 1]} opacity="0.08" />
            <line x1={pad.l} x2={W - pad.r} y1={y(k)} y2={y(k)} stroke="var(--line)" />
            <circle cx={pad.l - 26} cy={y(k)} r="12" fill={GROUP_RAMP[k - 1]} />
            <text x={pad.l - 26} y={y(k) + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={GROUP_RAMP_FG[k - 1]}>{k}</text>
          </g>
        ))}
        {hp && <line x1={x(hi)} x2={x(hi)} y1={pad.t} y2={H - pad.b} stroke="var(--ink2)" strokeOpacity="0.4" strokeDasharray="3 3" />}
        {s.slice(1).map((p, k) => (
          <line key={p.y} x1={x(k)} y1={y(s[k].g)} x2={x(k + 1)} y2={y(p.g)} stroke="var(--ink2)" strokeWidth="3" strokeOpacity="0.6" strokeLinecap="round" />
        ))}
        {s.map((p, i) => {
          const c = p.j == null ? 'var(--ink2)' : LOOK[p.j].color
          const below = p.g === g0
          return (
            <g key={p.y} onMouseEnter={() => setHover(p.y)}>
              <rect x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent" />
              {/* จุดของปีนั้น มีเลขกลุ่มอยู่ข้างใน */}
              <circle cx={x(i)} cy={y(p.g)} r={hover === p.y ? 15 : 13} fill={GROUP_RAMP[p.g - 1]} stroke="var(--surface)" strokeWidth="3" />
              <text x={x(i)} y={y(p.g) + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={GROUP_RAMP_FG[p.g - 1]}>{p.g}</text>
              {p.j != null && p.j !== 0 && (
                <text x={x(i)} y={y(p.g) + (below ? 33 : -21)} textAnchor="middle" fontSize="14" fontWeight="700" fill={c}>{LOOK[p.j].word}</text>
              )}
              <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="14" fontWeight={hover === p.y ? 700 : 500} fill={hover === p.y ? 'var(--ink)' : 'var(--ink2)'}>{p.y}</text>
            </g>
          )
        })}
      </svg>
      <div className="axis-hint small"><span>1 = ดีที่สุด</span><span>5 = แย่ที่สุด</span></div>
      {hp && (
        <div className="better-tip" style={{ left: `${Math.min(82, Math.max(18, (x(hi) / W) * 100))}%`, color: hp.j == null ? 'var(--ink2)' : LOOK[hp.j].color }}>
          {hp.j == null
            ? `ปี ${hp.y} อยู่กลุ่ม ${hp.g} (ปีแรก)`
            : hp.j === 0
              ? `ปี ${hp.y} อยู่กลุ่ม ${hp.g} เท่าเดิม`
              : `ปี ${hp.y} ${LOOK[hp.j].word} จากกลุ่ม ${hp.prev} ${hp.j > 0 ? 'ขึ้นมา' : 'ตกไป'}กลุ่ม ${hp.g}`}
        </div>
      )}
    </div>
  )
}

// ---------- ไม่ได้เลือกจังหวัด: ภาพรวมของทุกจังหวัดในตัวกรอง ----------
function OverviewView({ yearly, list, g, onPick }) {
  const paths = list.map((n) => ({ n, s: pathOf(yearly, n) }))
  // แต่ละปี: จำนวนจังหวัดที่ดีขึ้น / แย่ลง / เท่าเดิม
  const perYear = YEARS.slice(1).map((y, k) => {
    const js = paths.map((p) => p.s[k + 1].j)
    return { y, up: js.filter((j) => j > 0).length, down: js.filter((j) => j < 0).length, same: js.filter((j) => j === 0).length }
  })
  const last = perYear.at(-1)
  const scope = g == null ? `ทั้ง ${list.length} จังหวัด` : `จังหวัดที่อยู่กลุ่ม ${g} ในปี ${YEARS[LAST]} (${list.length} จังหวัด)`

  return (
    <>
      <Card className="better-card">
        <div className="better-name">{g == null ? 'ทุกจังหวัด' : `กลุ่ม ${g}`}</div>
        <p className="better-headline">
          ปีล่าสุด ({last.y}): <span style={{ color: DELTA.better }}>ดีขึ้น {last.up}</span> · <span style={{ color: DELTA.worse }}>แย่ลง {last.down}</span> · เท่าเดิม {last.same} จังหวัด
        </p>
        <p className="better-sub">{scope} · เลือกจังหวัดด้านบนหรือกดชื่อในตารางเพื่อดูทีละจังหวัด</p>
        <CountLine data={perYear} />
      </Card>
      <Card title="ผลแต่ละปีของแต่ละจังหวัด">
        <p className="muted small card-sub">▲ ดีขึ้น · ▼ แย่ลง · ● เท่าเดิม (เทียบปีก่อน) · กดชื่อจังหวัดเพื่อดูกราฟ</p>
        <div className="table-scroll">
          <table className="data-table move-matrix">
            <thead>
              <tr>
                <th>จังหวัด</th>
                {YEARS.slice(1).map((y) => <th key={y}>{y}</th>)}
                <th>กลุ่มปี {YEARS[LAST]}</th>
              </tr>
            </thead>
            <tbody>
              {paths.map(({ n, s }) => (
                <tr key={n}>
                  <td><button type="button" className="link-btn" onClick={() => onPick(n)}>{n}</button></td>
                  {s.slice(1).map((p) => (
                    <td key={p.y} title={`${p.y}: ${LOOK[p.j].word}`} style={{ color: LOOK[p.j].color }}>{LOOK[p.j].icon}</td>
                  ))}
                  <td><GroupChip g={s[LAST].g} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

// กราฟเส้นจำนวนจังหวัดที่ดีขึ้น (เขียว) และแย่ลง (แดง) แต่ละปี
function CountLine({ data }) {
  const [hover, setHover] = useState(null)
  const W = 760
  const H = 260
  const pad = { l: 44, r: 30, t: 22, b: 38 }
  const max = Math.max(1, ...data.flatMap((d) => [d.up, d.down]))
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (data.length - 1)
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const step = (W - pad.l - pad.r) / (data.length - 1)
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i)
  const hd = data.find((d) => d.y === hover)
  const lines = [
    { key: 'up', label: 'ดีขึ้น', color: DELTA.better },
    { key: 'down', label: 'แย่ลง', color: DELTA.worse },
  ]
  return (
    <div className="better-plot" onMouseLeave={() => setHover(null)}>
      <div className="series-legend">
        {lines.map((l) => <span key={l.key}><span className="swatch" style={{ background: l.color }} />จำนวนจังหวัดที่{l.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`จำนวนจังหวัดที่ดีขึ้นและแย่ลงแต่ละปี: ${data.map((d) => `${d.y} ดีขึ้น ${d.up} แย่ลง ${d.down}`).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={pad.l - 10} y={y(t) + 4} textAnchor="end" fontSize="12" fill="var(--ink2)">{t}</text>
          </g>
        ))}
        {hd && <line x1={x(data.indexOf(hd))} x2={x(data.indexOf(hd))} y1={pad.t} y2={H - pad.b} stroke="var(--ink2)" strokeOpacity="0.4" strokeDasharray="3 3" />}
        {lines.map((l) => (
          <g key={l.key}>
            <polyline fill="none" stroke={l.color} strokeWidth="3" strokeLinejoin="round" points={data.map((d, i) => `${x(i)},${y(d[l.key])}`).join(' ')} />
            {data.map((d, i) => <circle key={d.y} cx={x(i)} cy={y(d[l.key])} r={hover === d.y ? 7 : 5} fill={l.color} stroke="var(--surface)" strokeWidth="2" />)}
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.y} onMouseEnter={() => setHover(d.y)}>
            <rect x={x(i) - step / 2} y={0} width={step} height={H} fill="transparent" />
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize="14" fontWeight={hover === d.y ? 700 : 500} fill={hover === d.y ? 'var(--ink)' : 'var(--ink2)'}>{d.y}</text>
          </g>
        ))}
      </svg>
      {hd && (
        <div className="better-tip" style={{ left: `${Math.min(82, Math.max(18, (x(data.indexOf(hd)) / W) * 100))}%` }}>
          ปี {hd.y}: <span style={{ color: DELTA.better }}>ดีขึ้น {hd.up}</span> · <span style={{ color: DELTA.worse }}>แย่ลง {hd.down}</span> · เท่าเดิม {hd.same} จังหวัด
        </div>
      )}
    </div>
  )
}
