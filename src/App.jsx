import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from './lib/DataContext'
import { SelectionProvider } from './lib/SelectionContext'
import Home from './pages/Home'
import Intro from './pages/Intro'
import Trend from './pages/Trend'
import Clusters from './pages/Clusters'
import Province from './pages/Province'
import Models from './pages/Models'
import EscCat from './components/EscCat'

export default function App() {
  return (
    <DataProvider>
      <SelectionProvider>
        <BrowserRouter>
          <Routes>
            {/* หน้าเปิดแบบเล่าเรื่อง แดชบอร์ดภาพรวมย้ายไป /overview */}
            <Route path="/" element={<Intro />} />
            <Route path="/overview" element={<Home />} />
            <Route path="/trend" element={<Trend />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/province" element={<Province />} />
            <Route path="/province/:name" element={<Province />} />
            <Route path="/models" element={<Models />} />
          </Routes>
          <EscCat />
        </BrowserRouter>
      </SelectionProvider>
    </DataProvider>
  )
}
