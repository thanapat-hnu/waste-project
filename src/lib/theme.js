import { useEffect, useState } from 'react'

// โหมดสว่าง/มืด: เริ่มที่โหมดมืด (ธีมหลักของเว็บ) ถ้ากดเปลี่ยนเองจะจำไว้
const KEY = 'theme'

function readStored() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function useTheme() {
  const [choice, setChoice] = useState(readStored)
  const dark = choice !== 'light'

  useEffect(() => {
    document.body.classList.toggle('dark', dark)
  }, [dark])

  const toggle = () => {
    const next = dark ? 'light' : 'dark'
    setChoice(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // ไม่มี localStorage ก็สลับได้ แค่ไม่จำ
    }
  }
  return { dark, toggle }
}
