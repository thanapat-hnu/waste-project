import { createContext, useContext, useEffect, useState } from 'react'
import { loadData } from './data'
import { LoadError, Loader } from '../components/Loader'

const DataContext = createContext(null)
const FADE_MS = 450 // เวลาที่หน้าโหลดค่อยๆ จางหายหลังข้อมูลมาครบ
const MIN_LOADING_MS = 2000 // หน้าโหลดแสดงอย่างน้อย 3 วินาที

export function DataProvider({ children }) {
  const [state, setState] = useState({ data: null, error: null })
  const [loaderGone, setLoaderGone] = useState(false)

  useEffect(() => {
    // ให้หน้าโหลดค้างอย่างน้อย MIN_LOADING_MS แม้ข้อมูลจะมาเร็วกว่า (โหลดพลาดจะแสดงทันที)
    const minWait = new Promise((r) => setTimeout(r, MIN_LOADING_MS))
    Promise.all([loadData(), minWait])
      .then(([data]) => setState({ data, error: null }))
      .catch((error) => setState({ data: null, error }))
  }, [])

  // ข้อมูลมาแล้ว: แสดงเว็บข้างใต้ทันที แล้วค่อยเอาหน้าโหลดที่ทับอยู่ออกหลังจางเสร็จ
  useEffect(() => {
    if (!state.data) return
    const t = setTimeout(() => setLoaderGone(true), FADE_MS)
    return () => clearTimeout(t)
  }, [state.data])

  if (state.error) return <LoadError error={state.error} />
  if (!state.data) return <Loader />
  return (
    <DataContext.Provider value={state.data}>
      {children}
      {!loaderGone && <Loader leaving />}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
