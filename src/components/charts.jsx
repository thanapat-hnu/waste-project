// กราฟพื้นฐาน วาดเองด้วย HTML/SVG ตาม WEB_SPEC ข้อ 3 (โครงหยาบ รอ design จริง)

export function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

/** แท่งแนวตั้ง: items = [{ label, value, color, text, dim }] */
export function BarChartV({ items, height = 180, ariaLabel }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="barv" role="img" aria-label={ariaLabel} style={{ height }}>
      {items.map((i) => (
        <div className="barv-col" key={i.label}>
          {/* แยกพื้นที่วาดแท่งออกจากข้อความ ไม่ให้ flex บีบความสูงแท่งจนดูเท่ากัน */}
          <div className="barv-plot">
            <div className="barv-bar" style={{ height: `${(i.value / max) * 100}%` }}>
              <span className="barv-fill" style={{ background: i.color, opacity: i.dim ? 0.35 : 1 }} />
              <span className="barv-text">{i.text}</span>
            </div>
          </div>
          <div className="barv-label">{i.label}</div>
        </div>
      ))}
    </div>
  )
}

/** โดนัท conic-gradient: items = [{ label, value, color }] */
export function Donut({ items, center, ariaLabel }) {
  const total = items.reduce((a, i) => a + i.value, 0) || 1
  const ends = items.map((_, k) => items.slice(0, k + 1).reduce((a, i) => a + i.value, 0))
  const stops = items.map((i, k) => `${i.color} ${((ends[k] - i.value) / total) * 360}deg ${(ends[k] / total) * 360}deg`)
  return (
    <div className="donut-wrap" role="img" aria-label={ariaLabel}>
      <div className="donut" style={{ background: `conic-gradient(${stops.join(',')})` }}>
        <div className="donut-hole">{center}</div>
      </div>
      <ul className="donut-legend">
        {items.map((i) => (
          <li key={i.label}><span className="swatch" style={{ background: i.color }} />{i.label}<b>{i.value}</b></li>
        ))}
      </ul>
    </div>
  )
}

/** แท่งแนวนอนเรียงอันดับ: items = [{ label, value, color, text }] */
export function RankBars({ items, max, ariaLabel }) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1)
  return (
    <ol className="rank" role="img" aria-label={ariaLabel}>
      {items.map((i) => (
        <li key={i.label}>
          <span className="rank-label">{i.label}</span>
          <span className="rank-track"><span style={{ width: `${(i.value / m) * 100}%`, background: i.color }} /></span>
          <span className="rank-text">{i.text}</span>
        </li>
      ))}
    </ol>
  )
}

/** แท่งซ้อน 100%: columns = [{ label, sub, parts: [{ value, color, name }] , top }] (ล่าง→บน) */
export function StackedBar100({ columns, height = 220, ariaLabel }) {
  return (
    <div className="stack" role="img" aria-label={ariaLabel} style={{ height }}>
      {columns.map((c) => {
        const total = c.parts.reduce((a, p) => a + p.value, 0) || 1
        return (
          <div className="stack-col" key={c.label}>
            <div className="stack-top">{c.top}</div>
            <div className="stack-bar">
              {[...c.parts].reverse().map((p) => {
                const pct = (p.value / total) * 100
                return (
                  <div key={p.name} title={`${p.name} ${pct.toFixed(1)}%`} style={{ height: `${pct}%`, background: p.color }}>
                    {pct >= 8 && `${pct.toFixed(0)}%`}
                  </div>
                )
              })}
            </div>
            <div className="stack-label">{c.label}</div>
            {c.sub && <div className="stack-sub">{c.sub}</div>}
          </div>
        )
      })}
    </div>
  )
}

/** กราฟเส้น 0–100%: series = [{ name, color, values }] */
export function LineChart({ labels, series, ariaLabel, width = 640, height = 260 }) {
  const pad = { l: 40, r: 16, t: 12, b: 28 }
  const x = (i) => pad.l + (i * (width - pad.l - pad.r)) / (labels.length - 1)
  const y = (v) => pad.t + (1 - v / 100) * (height - pad.t - pad.b)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart" role="img" aria-label={ariaLabel}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={width - pad.r} y1={y(g)} y2={y(g)} stroke="#ECEAE3" />
          <text x={pad.l - 6} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#5E6662">{g}%</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#5E6662">{l}</text>
      ))}
      {series.map((s) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth="2.5" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          {s.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.color}>
              <title>{`${s.name} ${labels[i]}: ${v.toFixed(1)}%`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  )
}

export function SeriesLegend({ items }) {
  return (
    <div className="series-legend">
      {items.map((i) => <span key={i.name}><span className="swatch" style={{ background: i.color }} />{i.name}</span>)}
    </div>
  )
}
