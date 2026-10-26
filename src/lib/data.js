// ดึง 4 ตารางจาก Supabase แล้วแปลงเป็นโครงเดียวกับ yearly/trend/avg4.json ใน WEB_SPEC (พอร์ตจาก build_data.py)
import { supabase } from './supabase'

export const YEARS = [2562, 2563, 2564, 2565, 2566, 2567, 2568]

async function fetchAll(table) {
  const { data, error } = await supabase.from(table).select('*').range(0, 9999)
  if (error) throw new Error(`${table}: ${error.message}`)
  return data
}

// numpy.percentile แบบ linear
function percentile(values, q) {
  const s = [...values].sort((a, b) => a - b)
  const pos = (s.length - 1) * (q / 100)
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}

// numpy.digitize(x, bins) + 1  → ระดับ 1..4
const level = (x, bins) => bins.filter((b) => x >= b).length + 1

// slope ของเส้นตรง OLS (เท่ากับ np.polyfit(x, y, 1)[0])
function slope(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i] - my)
    den += (x - mx) ** 2
  })
  return num / den
}

const r1 = (x) => Math.round(x * 10) / 10
const pct = (part, whole) => (whole ? (part / whole) * 100 : 0)
const byThai = (a, b) => a.localeCompare(b, 'th')

export async function loadData() {
  const [raw, resYearly, resAvg, resTrend] = await Promise.all(
    ['raw_yearly', 'result_yearly', 'result_avg', 'result_trend'].map(fetchAll),
  )

  const rows = raw
    .map((r) => ({
      ...r,
      re_pct: pct(r.waste_recycled_tpd, r.waste_generated_tpd),
      pr_pct: pct(r.waste_proper_tpd, r.waste_generated_tpd),
      im_pct: pct(r.waste_improper_tpd, r.waste_generated_tpd),
      backlog_days: r.waste_backlog_t / r.waste_generated_tpd,
    }))
    .sort((a, b) => byThai(a.province, b.province) || a.year - b.year)

  const thresholds = {
    recycle_pct: [25, 50, 75].map((q) => percentile(rows.map((r) => r.re_pct), q)),
    backlog_days: [25, 50, 75].map((q) => percentile(rows.map((r) => r.backlog_days), q)),
  }

  const clusterOf = new Map(resYearly.map((r) => [`${r.province}|${r.year}`, r.cluster]))
  const clusterNames = {}
  resYearly.forEach((r) => (clusterNames[r.cluster] ??= r.level_disposal))
  const clusterIds = Object.keys(clusterNames).map(Number).sort((a, b) => a - b)

  // ---------- yearly ----------
  const provinces = {}
  for (const r of rows) {
    const p = (provinces[r.province] ??= {
      region: r.region,
      cluster: [], waste_tpd: [], recycle_pct: [], proper_pct: [], improper_pct: [],
      backlog_days: [], rec_level: [], backlog_level: [], rows: [],
    })
    p.cluster.push(clusterOf.get(`${r.province}|${r.year}`))
    p.waste_tpd.push(r.waste_generated_tpd)
    p.recycle_pct.push(r.re_pct)
    p.proper_pct.push(r.pr_pct)
    p.improper_pct.push(r.im_pct)
    p.backlog_days.push(r.backlog_days)
    p.rec_level.push(level(r.re_pct, thresholds.recycle_pct))
    p.backlog_level.push(level(r.backlog_days, thresholds.backlog_days))
    p.rows.push(r)
  }

  const sumNational = (list) => {
    const s = (k) => list.reduce((a, r) => a + (r[k] || 0), 0)
    return {
      waste_tpd: s('waste_generated_tpd'),
      recycle_tpd: s('waste_recycled_tpd'),
      proper_tpd: s('waste_proper_tpd'),
      improper_tpd: s('waste_improper_tpd'),
      backlog_t: s('waste_backlog_t'),
    }
  }
  const national = {}
  YEARS.forEach((yr) => {
    const list = rows.filter((r) => r.year === yr)
    const cl = (r) => clusterOf.get(`${r.province}|${r.year}`)
    national[yr] = {
      ...sumNational(list),
      improper_by_cluster: clusterIds.map((k) =>
        list.filter((r) => cl(r) === k).reduce((a, r) => a + r.waste_improper_tpd, 0)),
      count_by_cluster: clusterIds.map((k) => list.filter((r) => cl(r) === k).length),
    }
  })
  // ทั้งประเทศเฉลี่ย 7 ปี: ผลรวมทุกปี (ถ่วงตามปริมาณ) ÷ 7
  const all = sumNational(rows)
  national.avg = Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v / YEARS.length]))

  const yearly = { years: YEARS, cluster_names: clusterNames, cluster_ids: clusterIds, thresholds, provinces, national }

  // ---------- trend ----------
  const trendGroupNames = {}
  const trendSums = {}
  const trendProv = {}
  for (const t of resTrend) {
    const g = Number(String(t.cluster).replace('C', ''))
    trendGroupNames[g] ??= t.cluster_name
    const s = (trendSums[g] ??= { n: 0, v: [0, 0, 0] })
    s.n += 1
    s.v[0] += t.slope_recycled
    s.v[1] += t.slope_proper
    s.v[2] += t.slope_improper
    const p = provinces[t.province]
    trendProv[t.province] = {
      region: p.region,
      group: g,
      group_name: t.cluster_name,
      slope_yj: [t.slope_recycled, t.slope_proper, t.slope_improper],
      slope_pp: [p.recycle_pct, p.proper_pct, p.improper_pct].map((ys) => slope(YEARS, ys)),
      recycle_pct: p.recycle_pct, proper_pct: p.proper_pct, improper_pct: p.improper_pct, waste_tpd: p.waste_tpd,
    }
  }
  const trend = {
    years: YEARS,
    group_names: trendGroupNames,
    group_mean_slope_yj: Object.fromEntries(Object.entries(trendSums).map(([g, s]) => [g, s.v.map((v) => v / s.n)])),
    provinces: trendProv,
  }

  // ---------- avg4 ----------
  const avgGroupNames = {}
  const avgProv = {}
  for (const a of resAvg) {
    avgGroupNames[a.cluster] ??= a.level_disposal
    const list = provinces[a.province].rows
    const m = (k) => list.reduce((s, r) => s + r[k], 0) / list.length
    const w = m('waste_generated_tpd')
    avgProv[a.province] = {
      group: a.cluster,
      group_name: a.level_disposal,
      recycle_level: a.level_recycling,
      backlog_level: a.level_backlog,
      waste_tpd: w,
      recycle_pct: pct(m('waste_recycled_tpd'), w),
      proper_pct: pct(m('waste_proper_tpd'), w),
      improper_pct: pct(m('waste_improper_tpd'), w),
      backlog_days: m('waste_backlog_t') / w,
      region: provinces[a.province].region,
    }
  }
  const avg4 = { group_names: avgGroupNames, provinces: avgProv }

  const names = Object.keys(provinces).sort(byThai)
  return { yearly, trend, avg4, names, round: r1 }
}
