import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { YEARS } from '../lib/data'
import { SHOW_AVG } from '../lib/features'
import { useSelection } from '../lib/SelectionContext'
import { useTheme } from '../lib/theme'
import HangingBin from './HangingBin'

export function Header({ title, subtitle, children }) {
  const { province } = useSelection()
  const { dark, toggle } = useTheme()
  const modelsYear = useModelsYear()
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
          </svg>
          ขยะทั่วไทย
        </Link>
        <div className="page-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="header-extra">{children}</div>
        <nav className="top-nav seg">
          {/* พาจังหวัดที่เลือกอยู่ติดไปด้วย */}
          <NavLink to="/overview">ภาพรวม</NavLink>
          <NavLink to={province ? `/province/${encodeURIComponent(province)}` : '/province'}>ค้นหาจังหวัด</NavLink>
          <NavLink to={province ? `/trend?p=${encodeURIComponent(province)}` : '/trend'}>การเปลี่ยนแปลง</NavLink>
          {modelsYear ? (
            <NavLink to={`/models?year=${modelsYear}`}>ทดสอบโมเดล</NavLink>
          ) : (
            <span className="nav-disabled" aria-disabled="true" title="ผลทดสอบมีเฉพาะรายปี เลือกปี 2562–2568 ในหน้าภาพรวมหรือกลุ่มจังหวัดก่อน">ทดสอบโมเดล</span>
          )}
        </nav>
        <button className="theme-btn" onClick={toggle} aria-label={dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}>
          <span className="theme-icon" aria-hidden />
          <span>{dark ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
        </button>
      </div>
      <HangingBin />
    </header>
  )
}

// top = แถวเต็มความกว้างเหนือทั้งสองคอลัมน์ (เช่นแท็บ) ให้แผนที่เริ่มเสมอกับการ์ดแรก
// เมนู "ทดสอบโมเดล" มีให้เห็นทุกหน้า แต่กดได้เฉพาะตอนเลือกปี 2562–2568 ในหน้าที่มีตัวเลือกปี (ภาพรวม / กลุ่มจังหวัด)
// ผลทดสอบเป็นของการจัดกลุ่มรายปี ตอนเลือกเฉลี่ย 7 ปีหรือหน้าที่ไม่มีปี (คืน null) จึงเป็นปุ่มกดไม่ได้
const YEAR_PAGES = ['/overview', '/clusters', '/models']
function useModelsYear() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  if (!YEAR_PAGES.includes(pathname)) return null
  const y = params.get('year')
  // ภาพรวม/กลุ่มจังหวัดที่ยังไม่เลือกปีจะแสดงปีล่าสุด
  // ยังไม่เลือกปี หรือปิดโหมดเฉลี่ยอยู่แต่ลิงก์เป็น ?year=avg → หน้านั้นแสดงปีล่าสุด
  if (y == null || (!SHOW_AVG && y === 'avg')) return pathname === '/models' ? null : YEARS.at(-1)
  return YEARS.includes(Number(y)) ? Number(y) : null
}

export function TwoColumn({ left, right, top }) {
  return (
    <main className="two-col">
      {top && <div className="two-col-top">{top}</div>}
      <div className="col-left">{left}</div>
      <div className="col-right">{right}</div>
    </main>
  )
}

export function Card({ title, children, className = '', ...rest }) {
  return (
    <section className={`card ${className}`} {...rest}>
      {title && <h2 className="card-title">{title}</h2>}
      {children}
    </section>
  )
}

export function Tabs({ tabs, value, onChange, extra }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
      {extra}
    </div>
  )
}

// ป้ายแบบ v2: พื้นสีจางของกลุ่ม + จุดสี + ตัวอักษรสีหลัก (อ่านได้ทั้งสีอ่อนและเข้ม)
export function Badge({ color, children }) {
  return (
    <span className="badge" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)` }}>
      <span className="badge-dot" style={{ background: color }} />
      {children}
    </span>
  )
}
