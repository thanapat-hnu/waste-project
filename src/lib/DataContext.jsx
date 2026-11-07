import { createContext, useContext, useEffect, useState } from 'react'
import { loadData } from './data'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    loadData()
      .then((data) => setState({ data, error: null }))
      .catch((error) => setState({ data: null, error }))
  }, [])

  if (state.error) return <div className="status error">โหลดข้อมูลไม่สำเร็จ: {state.error.message}</div>
  if (!state.data) return <div className="status">กำลังโหลดข้อมูลจาก Supabase…</div>
  return <DataContext.Provider value={state.data}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
