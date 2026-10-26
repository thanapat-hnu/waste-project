// ค่าที่ใช้ซ้ำหลายหน้า
import { YEARS } from './data'
import { BACKLOG_LEVEL, BACKLOG_LEVEL_NAMES, CLUSTER5, REC_LEVEL, REC_LEVEL_NAMES } from './colors'

// กลุ่มหลัก 7 ปี: กลุ่มที่อยู่บ่อยที่สุด ถ้าเท่ากันใช้ปีล่าสุด
export function mainCluster(clusters) {
  const count = {}
  clusters.forEach((c) => (count[c] = (count[c] || 0) + 1))
  const max = Math.max(...Object.values(count))
  for (let i = clusters.length - 1; i >= 0; i--) if (count[clusters[i]] === max) return clusters[i]
}

// ค่ารายจังหวัดของปีที่เลือก (year = 2562..2568 หรือ 'avg')
export function provinceSnapshot(data, name, year) {
  const p = data.yearly.provinces[name]
  if (year === 'avg') {
    const a = data.avg4.provinces[name]
    return {
      cluster: mainCluster(p.cluster),
      waste_tpd: a.waste_tpd,
      recycle_pct: a.recycle_pct,
      proper_pct: a.proper_pct,
      improper_pct: a.improper_pct,
      backlog_days: a.backlog_days,
      // ระดับเฉลี่ย 7 ปีจาก result_avg ใน Supabase
      rec_level: a.recycle_level,
      backlog_level: a.backlog_level,
      group4: a.group,
    }
  }
  const i = YEARS.indexOf(year)
  return {
    cluster: p.cluster[i],
    waste_tpd: p.waste_tpd[i],
    recycle_pct: p.recycle_pct[i],
    proper_pct: p.proper_pct[i],
    improper_pct: p.improper_pct[i],
    backlog_days: p.backlog_days[i],
    rec_level: p.rec_level[i],
    backlog_level: p.backlog_level[i],
  }
}

export const clusterColor = (c) => CLUSTER5[c - 1]
export const recColor = (l) => REC_LEVEL[l - 1]
export const backlogColor = (l) => BACKLOG_LEVEL[l - 1]
export const recName = (l) => REC_LEVEL_NAMES[l - 1]
export const backlogName = (l) => BACKLOG_LEVEL_NAMES[l - 1]
