import { Link, NavLink } from 'react-router-dom'
import { useSelection } from '../lib/SelectionContext'

export function Header({ title, subtitle, children }) {
  const { province } = useSelection()
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1E6B5C" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
          </svg>
          ขยะจังหวัด 77
        </Link>
        <div className="page-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="header-extra">{children}</div>
        <nav className="top-nav">
          {/* พาจังหวัดที่เลือกอยู่ติดไปด้วย */}
          <NavLink to={province ? `/province/${encodeURIComponent(province)}` : '/province'}>ค้นหาจังหวัด</NavLink>
          <NavLink to={province ? `/trend?p=${encodeURIComponent(province)}` : '/trend'}>การเปลี่ยนแปลง</NavLink>
        </nav>
      </div>
    </header>
  )
}

export function TwoColumn({ left, right }) {
  return (
    <main className="two-col">
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

export function Badge({ color, children }) {
  return <span className="badge" style={{ background: color }}>{children}</span>
}
