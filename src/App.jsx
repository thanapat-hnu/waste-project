import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DataProvider } from './lib/DataContext'
import { SelectionProvider } from './lib/SelectionContext'
import Home from './pages/Home'
import Trend from './pages/Trend'
import Clusters from './pages/Clusters'
import Province from './pages/Province'

export default function App() {
  return (
    <DataProvider>
      <SelectionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/trend" element={<Trend />} />
            <Route path="/clusters" element={<Clusters />} />
            <Route path="/province" element={<Province />} />
            <Route path="/province/:name" element={<Province />} />
          </Routes>
        </BrowserRouter>
      </SelectionProvider>
    </DataProvider>
  )
}
