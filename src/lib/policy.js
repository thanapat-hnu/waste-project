// ประเด็นนโยบายที่แนะนำของแต่ละกลุ่ม: ข้อความอิงลักษณะของกลุ่ม ส่วนตัวเลขในเหตุผลคำนวณจากข้อมูลสดทุกครั้ง
// หมายเหตุ: ข้อความผูกกับเลขกลุ่ม ถ้าทีมจัดกลุ่มใหม่จนความหมายของกลุ่มเปลี่ยน ต้องทบทวนข้อความในไฟล์นี้
import { YEARS } from './data'

const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b)
  if (!s.length) return 0
  const m = (s.length - 1) / 2
  return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2
}

// โปรไฟล์ของกลุ่มจากแถวข้อมูลดิบ (จังหวัด-ปี) ทุกแถวที่อยู่ในกลุ่ม
function profile(rows) {
  const sum = (k) => rows.reduce((a, r) => a + (r[k] || 0), 0)
  const waste = sum('waste_generated_tpd')
  return {
    n: rows.length,
    recycle: (sum('waste_recycled_tpd') / waste) * 100,
    proper: (sum('waste_proper_tpd') / waste) * 100,
    improper: (sum('waste_improper_tpd') / waste) * 100,
    improperPerYear: sum('waste_improper_tpd') / YEARS.length,
    // ใช้ค่ากลาง (median) กันค่าผิดปกติบางจังหวัดดึงตัวเลข
    backlogDays: median(rows.map((r) => r.waste_backlog_t / r.waste_generated_tpd)),
    kgPerPerson: (waste * 1000) / sum('population'),
    touristsPerPop: median(rows.map((r) => r.tourists / r.population)),
    properZero: rows.filter((r) => r.waste_proper_tpd === 0).length,
  }
}

// รายปี: ทุกจังหวัด-ปีที่อยู่กลุ่ม c (ทั้ง 7 ปี) + สัดส่วนที่ย้ายไปกลุ่มอื่นในปีถัดไป
export function yearlyProfile(data, c) {
  const rows = []
  let pairs = 0
  let moved = 0
  data.names.forEach((n) => {
    const p = data.yearly.provinces[n]
    p.cluster.forEach((k, i) => {
      if (k !== c) return
      rows.push(p.rows[i])
      if (i < p.cluster.length - 1) {
        pairs += 1
        if (p.cluster[i + 1] !== c) moved += 1
      }
    })
  })
  return { ...profile(rows), movedPct: pairs ? (moved / pairs) * 100 : 0 }
}

// เฉลี่ย 7 ปี: ทุกปีของจังหวัดที่อยู่กลุ่มเฉลี่ย g
export function avgProfile(data, g) {
  const rows = data.names.filter((n) => data.avg4.provinces[n].group === g).flatMap((n) => data.yearly.provinces[n].rows)
  return profile(rows)
}

const p1 = (x) => `${x.toFixed(1)}%`
const d0 = (x) => `${Math.round(x).toLocaleString('en-US')} วัน`
const t0 = (x) => `${Math.round(x).toLocaleString('en-US')} ตัน/วัน`
const kg = (x) => `${x.toFixed(2)} กก./คน/วัน`

const YEARLY = {
  1: (s) => [
    ['รักษามาตรฐานระบบกำจัดเดิม', `กำจัดถูกต้อง ${p1(s.proper)} กำจัดไม่ถูกต้องเพียง ${p1(s.improper)} และขยะตกค้างค่ากลาง ${d0(s.backlogDays)}`],
    ['เพิ่มการคัดแยกและนำกลับมาใช้', `นำกลับมาใช้ ${p1(s.recycle)} ต่ำกว่ากลุ่มอื่น เพราะส่งไปกำจัดเกือบทั้งหมด`],
    ['ลดขยะต้นทาง', `ขยะต่อคน ${kg(s.kgPerPerson)} สูงที่สุด เป็นเมืองใหญ่ เมืองท่องเที่ยว และเมืองอุตสาหกรรม`],
  ],
  2: (s) => [
    ['ใช้ระบบกำจัดร่วมแบบคลัสเตอร์หลายจังหวัด', `ขยะต่อคนต่ำ (${kg(s.kgPerPerson)}) จังหวัดขนาดเล็กลงทุนระบบเองไม่คุ้มทุน`],
    ['ยกระดับการกำจัดให้ถูกต้อง', `กำจัดไม่ถูกต้องยังอยู่ที่ ${p1(s.improper)}`],
    ['เฝ้าระวังไม่ให้ขยะตกค้างสะสม', `ตกค้างค่ากลาง ${d0(s.backlogDays)} แต่ ${p1(s.movedPct)} ของจังหวัด-ปีย้ายไปกลุ่มอื่นในปีถัดไป`],
  ],
  3: (s) => [
    ['ลงทุนระบบกำจัดถูกต้อง เช่น บ่อฝังกลบรวม หรือ RDF', `กำจัดถูกต้องเพียง ${p1(s.proper)}`],
    ['ให้ความสำคัญในการจัดงบเป็นอันดับต้น', `ปริมาณกำจัดไม่ถูกต้องรวมเฉลี่ย ${t0(s.improperPerYear)} มากที่สุดเพราะมีจังหวัดในกลุ่มมาก`],
    ['ต่อยอดการรีไซเคิลที่ทำได้ดี', `นำกลับมาใช้ ${p1(s.recycle)} สูงกว่ากลุ่มอื่น`],
  ],
  4: (s) => [
    ['เร่งกำจัดขยะตกค้างสะสม', `ขยะตกค้างค่ากลาง ${d0(s.backlogDays)}`],
    ['เพิ่มการคัดแยกและรีไซเคิล', `นำกลับมาใช้เพียง ${p1(s.recycle)}`],
    ['รองรับขยะจากนักท่องเที่ยวและอุตสาหกรรม', `นักท่องเที่ยวต่อประชากร (ค่ากลาง) ${s.touristsPerPop.toFixed(1)} เท่า และขยะต่อคน ${kg(s.kgPerPerson)}`],
  ],
  5: (s) => [
    ['สร้างหรือปรับปรุงระบบกำจัดถูกต้องเร่งด่วน', `กำจัดถูกต้องเพียง ${p1(s.proper)} และกำจัดไม่ถูกต้องสูงถึง ${p1(s.improper)}`],
    ['ตรวจสอบการรายงานข้อมูล', `${s.properZero} จาก ${s.n} จังหวัด-ปี รายงานกำจัดถูกต้องเป็น 0 อาจไม่มีระบบจริงหรือรายงานไม่ครบ`],
    ['จัดการขยะตกค้างสะสม', `ตกค้างค่ากลาง ${d0(s.backlogDays)} · ${p1(s.movedPct)} ของจังหวัด-ปีย้ายออกจากกลุ่มนี้ได้ในปีถัดไป แปลว่าแก้ได้จริง`],
  ],
}

const AVG = {
  1: (s) => [
    ['รักษามาตรฐานระบบกำจัดเดิม', `กำจัดถูกต้อง ${p1(s.proper)} กำจัดไม่ถูกต้องเพียง ${p1(s.improper)}`],
    ['เพิ่มการคัดแยกและนำกลับมาใช้', `นำกลับมาใช้ ${p1(s.recycle)}`],
    ['ลดขยะต้นทาง', `ขยะต่อคน ${kg(s.kgPerPerson)} สูงที่สุด`],
  ],
  2: (s) => [
    ['ใช้ระบบกำจัดร่วมแบบคลัสเตอร์หลายจังหวัด', `ขยะต่อคน ${kg(s.kgPerPerson)} จังหวัดขนาดเล็กลงทุนระบบเองไม่คุ้มทุน`],
    ['ลดการกำจัดไม่ถูกต้อง', `กำจัดไม่ถูกต้อง ${p1(s.improper)}`],
    ['ตรวจสอบการรายงานข้อมูล', `${s.properZero} จังหวัด-ปี รายงานกำจัดถูกต้องเป็น 0`],
  ],
  3: (s) => [
    ['ลงทุนระบบกำจัดถูกต้อง', `กำจัดถูกต้องเพียง ${p1(s.proper)}`],
    ['ต่อยอดการรีไซเคิลที่ทำได้ดี', `นำกลับมาใช้ ${p1(s.recycle)}`],
    ['คุมขยะตกค้างไม่ให้สะสมเพิ่ม', `ตกค้างค่ากลาง ${d0(s.backlogDays)}`],
  ],
  4: (s) => [
    ['ลงทุนระบบกำจัดถูกต้องเร่งด่วน', `กำจัดไม่ถูกต้อง ${p1(s.improper)} สูงที่สุด`],
    ['เร่งกำจัดขยะตกค้างสะสม', `ตกค้างค่ากลาง ${d0(s.backlogDays)}`],
    ['เพิ่มการคัดแยกและรีไซเคิล', `นำกลับมาใช้เพียง ${p1(s.recycle)}`],
  ],
}

// ---------- จุดเด่น / จุดด้อยของกลุ่มรายปี (เทียบกับกลุ่มอื่น ข้อมูลทั้ง 7 ปี) ----------
// better: 'high' = ยิ่งสูงยิ่งดี, 'low' = ยิ่งต่ำยิ่งดี · เรียงตามความสำคัญเวลาเลือกแสดง
const MEASURES = [
  { k: 'backlogDays', label: 'ขยะตกค้าง (ค่ากลาง)', better: 'low', fmt: d0 },
  { k: 'improper', label: 'กำจัดไม่ถูกต้อง', better: 'low', fmt: p1 },
  { k: 'proper', label: 'กำจัดถูกต้อง', better: 'high', fmt: p1 },
  { k: 'recycle', label: 'นำกลับมาใช้', better: 'high', fmt: p1 },
  { k: 'kgPerPerson', label: 'ขยะต่อคน', better: 'low', fmt: kg },
]

// อันดับ 1 = ดีที่สุด, อันดับ n = แย่ที่สุด → คำบรรยายตามทิศของตัวชี้วัด
function rankWord(rank, n, better) {
  const [best, worst] = better === 'high' ? ['สูง', 'ต่ำ'] : ['ต่ำ', 'สูง']
  if (rank === 1) return `${best}สุดในทุกกลุ่ม`
  if (rank === 2) return `${best}เป็นอันดับ 2`
  if (rank === n) return `${worst}สุดในทุกกลุ่ม`
  if (rank === n - 1) return `${worst}เป็นอันดับ 2`
  return 'อยู่ระดับกลาง'
}

// คืน { strengths, weaknesses } แต่ละอันเป็น [{ label, value, note }] อย่างละไม่เกิน 2
export function groupHighlights(data, c) {
  const ids = data.yearly.cluster_ids
  const profiles = Object.fromEntries(ids.map((g) => [g, yearlyProfile(data, g)]))
  const n = ids.length
  const ranked = MEASURES.map((m) => {
    const order = [...ids].sort((a, b) => (m.better === 'high' ? profiles[b][m.k] - profiles[a][m.k] : profiles[a][m.k] - profiles[b][m.k]))
    const rank = order.indexOf(c) + 1
    return { ...m, rank, value: m.fmt(profiles[c][m.k]), note: rankWord(rank, n, m.better) }
  })
  // จุดเด่น: ตัวที่ดีที่สุดในทุกกลุ่ม ถ้ามีไม่ถึง 2 ตัว เติมด้วยอันดับ 2
  // จุดด้อย: แย่ที่สุด/รองแย่ ถ้าไม่มีใช้ตัวที่อยู่ระดับกลางที่แย่สุด · แสดงอย่างละไม่เกิน 3
  const best = ranked.filter((m) => m.rank === 1)
  const strengths = best.length >= 2 ? best : [...best, ...ranked.filter((m) => m.rank === 2)].slice(0, 2)
  let weaknesses = ranked.filter((m) => m.rank >= n - 1).sort((a, b) => b.rank - a.rank)
  if (!weaknesses.length) {
    const worst = Math.max(...ranked.map((m) => m.rank))
    if (worst > 2) weaknesses = ranked.filter((m) => m.rank === worst)
  }
  return { strengths: strengths.slice(0, 3), weaknesses: weaknesses.slice(0, 3) }
}

// ---------- สิ่งที่ควรทำรายจังหวัด (หน้าข้อมูลจังหวัด) ----------
// ใช้ปีล่าสุดเทียบกับทั้งประเทศ + ทิศทาง 7 ปีจาก result_trend เรียงตามความสำคัญ คืนไม่เกิน max ข้อ
export function provinceActions(data, name, max = 4) {
  const LAST = YEARS.length - 1
  const p = data.yearly.provinces[name]
  const t = data.trend.provinces[name]
  const r = p.rows[LAST]
  const lastRows = data.names.map((n) => data.yearly.provinces[n].rows[LAST])
  const nat = data.yearly.national[YEARS[LAST]]
  const natPct = (k) => (nat[k] / nat.waste_tpd) * 100
  const natKg = (nat.waste_tpd * 1000) / lastRows.reduce((a, x) => a + x.population, 0)
  const natTourists = median(lastRows.map((x) => x.tourists / x.population))

  const imp = p.improper_pct[LAST]
  const rec = p.recycle_pct[LAST]
  const kgPP = (r.waste_generated_tpd * 1000) / r.population
  const tourists = r.tourists / r.population
  const backlogDays = r.waste_backlog_t / r.waste_generated_tpd
  const properZeroYears = YEARS.filter((_, i) => p.rows[i].waste_proper_tpd === 0)
  const dir = (i) => t?.trend_dir?.[i] || ''
  const sp = (i) => t?.slope_pp?.[i] ?? 0
  const y0 = YEARS[0]
  const y1 = YEARS[LAST]

  const out = []
  if (imp > natPct('improper_tpd'))
    out.push(['ลงทุนระบบกำจัดที่ถูกต้อง', `กำจัดไม่ถูกต้อง ${p1(imp)} (${t0(r.waste_improper_tpd)}) สูงกว่าค่าประเทศ ${p1(natPct('improper_tpd'))}`])
  if (dir(2).includes('เพิ่มขึ้น') && sp(2) > 0.5)
    out.push(['หยุดแนวโน้มกำจัดไม่ถูกต้องที่เพิ่มขึ้น', `เพิ่มเฉลี่ย ${sp(2).toFixed(1)} จุด%/ปี จาก ${p1(p.improper_pct[0])} (${y0}) เป็น ${p1(imp)} (${y1})`])
  if (backlogDays >= 145)
    out.push(['เร่งกำจัดขยะตกค้างสะสม', `ตกค้าง ${Math.round(r.waste_backlog_t).toLocaleString('en-US')} ตัน เท่ากับขยะที่เกิด ${d0(backlogDays)}`])
  if (properZeroYears.length)
    out.push(['ตรวจสอบการรายงานข้อมูลการกำจัด', `รายงานกำจัดถูกต้องเป็น 0 ในปี ${properZeroYears.join(', ')} อาจไม่มีระบบจริงหรือรายงานไม่ครบ`])
  if (dir(0).includes('ลดลง') && sp(0) < -0.5)
    out.push(['ฟื้นการรีไซเคิลที่ลดลง', `นำกลับมาใช้ลดลงเฉลี่ย ${Math.abs(sp(0)).toFixed(1)} จุด%/ปี เหลือ ${p1(rec)} ในปี ${y1}`])
  else if (rec < natPct('recycle_tpd'))
    out.push(['เพิ่มการคัดแยกและรีไซเคิล', `นำกลับมาใช้ ${p1(rec)} ต่ำกว่าค่าประเทศ ${p1(natPct('recycle_tpd'))}`])
  if (tourists >= natTourists * 2)
    out.push(['รองรับขยะจากนักท่องเที่ยว', `นักท่องเที่ยว ${tourists.toFixed(1)} เท่าของประชากร (ค่ากลางประเทศ ${natTourists.toFixed(1)} เท่า)`])
  if (kgPP > natKg * 1.25)
    out.push(['ลดขยะต้นทาง', `ขยะต่อคน ${kg(kgPP)} สูงกว่าค่าประเทศ ${kg(natKg)}`])
  if (!out.length)
    out.push(['รักษามาตรฐานการจัดการขยะ', `กำจัดถูกต้อง ${p1(p.proper_pct[LAST])} · นำกลับมาใช้ ${p1(rec)} · กำจัดไม่ถูกต้อง ${p1(imp)} ไม่มีประเด็นเร่งด่วน`])
  return out.slice(0, max)
}

// คืนรายการ [หัวข้อ, เหตุผล] ของกลุ่ม (ไม่มีข้อความสำหรับกลุ่มนี้ คืน [])
export function policiesFor(data, group, isAvg) {
  const make = (isAvg ? AVG : YEARLY)[group]
  if (!make) return []
  return make(isAvg ? avgProfile(data, group) : yearlyProfile(data, group))
}
