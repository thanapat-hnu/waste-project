import { createContext, useCallback, useContext, useMemo, useState } from 'react'

// จังหวัดที่ผู้ใช้เลือกล่าสุด ใช้ร่วมกันทุกหน้า (จำไว้ใน localStorage ด้วย)
const KEY = 'selectedProvince'

const SelectionContext = createContext(null)

function readStored() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function SelectionProvider({ children }) {
  const [province, setProvinceState] = useState(readStored)
  // ฟังก์ชันคงที่ ใช้ใน dependency ของ effect ได้โดยไม่ทำให้ effect วิ่งซ้ำทุก render
  const setProvince = useCallback((p) => {
    setProvinceState(p || '')
    try {
      if (p) localStorage.setItem(KEY, p)
      else localStorage.removeItem(KEY)
    } catch {
      // ไม่มี localStorage ก็ยังใช้งานได้ แค่ไม่จำข้ามการรีเฟรช
    }
  }, [])
  const value = useMemo(() => ({ province, setProvince }), [province, setProvince])
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>
}

export const useSelection = () => useContext(SelectionContext)
