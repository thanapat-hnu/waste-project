import { useEffect, useState } from 'react'

// โหมดสว่าง/มืด: เริ่มตามระบบ ถ้ากดเปลี่ยนเองจะจำไว้
const KEY = 'theme'
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches

function readStored() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function useTheme() {
  const [choice, setChoice] = useState(readStored)
  const [sys, setSys] = useState(systemDark)
  const dark = choice ? choice === 'dark' : sys

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const on = (e) => setSys(e.matches)
    mq?.addEventListener('change', on)
    return () => mq?.removeEventListener('change', on)
  }, [])

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
