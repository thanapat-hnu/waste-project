import { useEffect } from 'react'

// ชื่อบนแท็บเบราว์เซอร์ของแต่ละหน้า: "<หน้า> · ขยะทั่วไทย" (ไม่ส่งชื่อ = ชื่อเว็บอย่างเดียว)
const SITE = 'ขยะทั่วไทย'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
