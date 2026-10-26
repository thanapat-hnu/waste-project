// สีข้อมูลตาม mockup "Waste Map v2" (ระดับรีไซเคิล/ตกค้างไม่มีใน mockup จึงใช้ชุดเดิมจาก WEB_SPEC)
export const CLUSTER5 = ['oklch(0.55 0.19 300)', 'oklch(0.86 0.012 80)', 'oklch(0.73 0.014 80)', 'oklch(0.6 0.016 80)', 'oklch(0.72 0.17 55)']
// ตัวอักษรบนพื้นสีของระดับรายปี (ระดับ 2–4 เป็นสีอ่อน)
export const CLUSTER5_FG = ['#ffffff', '#1d1d1f', '#1d1d1f', '#1d1d1f', '#1d1d1f']
export const GROUP4 = ['oklch(0.52 0.19 278)', 'oklch(0.68 0.12 182)', 'oklch(0.79 0.15 76)', 'oklch(0.57 0.21 355)']
export const REC_LEVEL = ['#C9DCEF', '#8DB5DD', '#4F86C0', '#1F4E8C']
export const BACKLOG_LEVEL = ['#F3DDBF', '#E8AE70', '#CF6E26', '#8E3D12']
export const TREND4 = ['oklch(0.52 0.1 200)', 'oklch(0.76 0.09 192)', 'oklch(0.64 0.13 300)', 'oklch(0.68 0.19 45)']

// นำกลับมาใช้ / กำจัดถูกต้อง / กำจัดไม่ถูกต้อง
export const SERIES = { recycle: 'oklch(0.62 0.17 250)', proper: 'oklch(0.66 0.16 150)', improper: 'oklch(0.62 0.2 27)' }
export const FLOW = SERIES
export const DELTA = { worse: 'oklch(0.55 0.2 27)', better: 'oklch(0.55 0.14 150)', same: 'var(--ink2)', improper: 'oklch(0.58 0.2 27)' }
// สีจังหวัดที่ไม่อยู่ในกลุ่มที่สนใจ
export const MUTED = 'rgba(118, 118, 128, 0.25)'

export const REC_LEVEL_NAMES = ['รีไซเคิลต่ำ', 'ค่อนข้างต่ำ', 'ค่อนข้างดี', 'รีไซเคิลสูง']
export const BACKLOG_LEVEL_NAMES = ['ตกค้างน้อย', 'ค่อนข้างน้อย', 'ค่อนข้างมาก', 'ตกค้างมาก']
