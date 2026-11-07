import { useEffect } from 'react'

// ชื่อบนแท็บเบราว์เซอร์ของแต่ละหน้า: "<หน้า> · ขยะจังหวัด 77" (ไม่ส่งชื่อ = ชื่อเว็บอย่างเดียว)
const SITE = 'ขยะจังหวัด 77'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
