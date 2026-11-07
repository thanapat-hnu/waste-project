// ผลทดสอบโมเดลจัดกลุ่มรายปี (K = 5) ดึงจากตาราง model_eval ใน Supabase
// (สร้างตารางด้วย supabase/create_model_eval.sql) ไฟล์นี้เก็บแค่คำอธิบายตัวชี้วัด
import { supabase } from './supabase'

// แปลงชื่อคอลัมน์ใน Supabase เป็นคีย์ที่หน้าเว็บใช้
export async function loadModels() {
  const { data, error } = await supabase.from('model_eval').select('*').order('sort_order')
  if (error) throw new Error(`model_eval: ${error.message}`)
  return data.map((r) => ({
    key: r.model,
    name: r.model_name,
    chosen: r.is_chosen,
    baseline: r.is_baseline,
    k: r.k,
    min_rows: r.min_rows,
    silhouette: r.silhouette_base,
    db: r.db_base,
    eta2_mean: r.eta2_mean,
    eta2_reuse: r.eta2_reuse,
    eta2_proper: r.eta2_proper,
    eta2_improper: r.eta2_improper,
    purity: r.province_purity,
    ari_median: r.ari_median,
    ari_vs_kmeans: r.ari_vs_kmeans,
  }))
}

// better: 'high' = ยิ่งสูงยิ่งดี, 'low' = ยิ่งต่ำยิ่งดี, null = ไม่ใช้จัดอันดับ
export const METRICS = [
  { key: 'min_rows', label: 'min_rows', name: 'ขนาดกลุ่มเล็กสุด', better: null, digits: 0, desc: 'จำนวนแถว (จังหวัด-ปี) ในกลุ่มที่เล็กที่สุด ใช้ดูว่าไม่มีกลุ่มที่เล็กจนใช้ไม่ได้' },
  { key: 'silhouette', label: 'silhouette', name: 'Silhouette', better: 'high', desc: 'จุดข้อมูลอยู่ใกล้กลุ่มตัวเองมากกว่ากลุ่มอื่นแค่ไหน (−1 ถึง 1)' },
  { key: 'db', label: 'DB', name: 'Davies–Bouldin', better: 'low', desc: 'ความทับซ้อนระหว่างกลุ่ม ยิ่งต่ำแปลว่ากลุ่มแยกกันชัด' },
  { key: 'eta2_mean', label: 'η² เฉลี่ย', name: 'η² เฉลี่ย', better: 'high', desc: 'สัดส่วนความแปรปรวนของตัวแปรที่กลุ่มอธิบายได้ เฉลี่ย 3 ตัวแปร' },
  { key: 'eta2_reuse', label: 'η² Reuse', name: 'η² นำกลับมาใช้', better: 'high', desc: 'กลุ่มอธิบายความต่างของ % นำกลับมาใช้ได้แค่ไหน' },
  { key: 'eta2_proper', label: 'η² Proper', name: 'η² กำจัดถูกต้อง', better: 'high', desc: 'กลุ่มอธิบายความต่างของ % กำจัดถูกต้องได้แค่ไหน' },
  { key: 'eta2_improper', label: 'η² Improper', name: 'η² กำจัดไม่ถูกต้อง', better: 'high', desc: 'กลุ่มอธิบายความต่างของ % กำจัดไม่ถูกต้องได้แค่ไหน' },
  { key: 'purity', label: 'purity', name: 'Province purity', better: 'high', desc: 'จังหวัดเดียวกันต่างปีกันอยู่กลุ่มเดิมบ่อยแค่ไหน' },
  { key: 'ari_median', label: 'ARI median', name: 'ความเสถียร (ARI)', better: 'high', desc: 'ค่ามัธยฐาน ARI เมื่อรันซ้ำ ยิ่งสูงยิ่งได้กลุ่มเดิมทุกครั้ง' },
  { key: 'ari_vs_kmeans', label: 'ARI vs K-means', name: 'ARI เทียบ K-means', better: null, desc: 'ผลจัดกลุ่มเหมือน K-means แค่ไหน (1 = เหมือนกันทุกแถว)' },
]

export const fmtMetric = (m, v) => (v == null ? '–' : v.toFixed(m.digits ?? 3))

// ค่าที่ดีที่สุดของแต่ละตัวชี้วัด (ไม่นับ baseline)
export function bestOf(models, metric) {
  if (!metric.better) return null
  const vals = models.filter((m) => !m.baseline && m[metric.key] != null).map((m) => m[metric.key])
  return metric.better === 'high' ? Math.max(...vals) : Math.min(...vals)
}
