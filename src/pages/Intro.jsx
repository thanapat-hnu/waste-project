import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, NavLink, useLocation } from 'react-router-dom'
import { usePageTitle } from '../lib/usePageTitle'
import { useData } from '../lib/DataContext'
import { YEARS } from '../lib/data'
import { SERIES } from '../lib/colors'
import { useTheme } from '../lib/theme'
import HangingBin from '../components/HangingBin'
import { SHOW_TREND } from '../lib/features'

// หน้าเปิดแบบเล่าเรื่อง (เลื่อนลงทีละฉาก) ก่อนเข้าแดชบอร์ด · ตัวเลขทั้งหมดดึงจากข้อมูลสด
const LAST = YEARS.length - 1
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ใส่ class "in" เมื่อเลื่อนมาถึง (ใช้ทำ fade/slide ตอนเลื่อน)
function useReveal() {
  const ref = useRef(null)
  // ผู้ใช้ปิดแอนิเมชันไว้ หรือเบราว์เซอร์ไม่รองรับ แสดงเลยตั้งแต่แรก
  const [shown, setShown] = useState(() => reducedMotion() || !('IntersectionObserver' in window))
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShown(true), io.disconnect()), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [shown])
  return [ref, shown]
}

function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const [ref, shown] = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

// ตัวเลขนับขึ้นตอนเลื่อนมาถึง
function CountUp({ value, decimals = 0, suffix = '' }) {
  const [ref, shown] = useReveal()
  const [v, setV] = useState(0)
  const still = reducedMotion()
  useEffect(() => {
    if (!shown || still) return
    let raf
    const start = performance.now()
    const tick = (t) => {
      const k = Math.min(1, (t - start) / 1400)
      setV(value * (1 - (1 - k) ** 3))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [shown, still, value])
  const text = (still ? value : v).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return <span ref={ref}>{text}{suffix}</span>
}

// แผนที่ประเทศไทยแบบ SVG เรียบๆ (ไม่มีแผนที่ฐาน) จังหวัดที่เน้นเป็นสีแดง
function StoryMap({ highlight }) {
  const [geo, setGeo] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/thailand_provinces.geojson`).then((r) => r.json()).then(setGeo)
  }, [])
  const paths = useMemo(() => {
    if (!geo) return []
    const kx = Math.cos((13 * Math.PI) / 180)
    // กรอบประเทศไทย (ลองจิจูดตะวันตก/ตะวันออก, ละติจูดเหนือ)
    const [x0, x1, y1] = [97.3, 105.7, 20.5]
    const W = 300
    const s = W / ((x1 - x0) * kx)
    const pt = ([lon, lat]) => `${((lon - x0) * kx * s).toFixed(1)},${((y1 - lat) * s).toFixed(1)}`
    const ring = (r) => `M${r.map(pt).join('L')}Z`
    return geo.features.map((f) => {
      const g = f.geometry
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
      return { name: f.properties.name_th, d: polys.map((p) => p.map(ring).join('')).join('') }
    })
  }, [geo])
  return (
    <svg viewBox="0 0 300 535" className="story-map" role="img" aria-label={`แผนที่ไฮไลต์ ${highlight.size} จังหวัด`}>
      {paths.map((p) => (
        <path key={p.name} d={p.d} className={highlight.has(p.name) ? 'hot' : ''}>
          <title>{p.name}</title>
        </path>
      ))}
    </svg>
  )
}

export default function Intro() {
  const { search } = useLocation()
  const data = useData()
  const { dark, toggle } = useTheme()
  const { yearly, names } = data
  usePageTitle(null)

  const story = useMemo(() => {
    const nat = yearly.national[YEARS[LAST]]
    const pct = (k) => (nat[k] / nat.waste_tpd) * 100
    const pop = names.reduce((a, n) => a + yearly.provinces[n].rows[LAST].population, 0)
    const worst = yearly.cluster_ids.at(-1)
    const hot = names.filter((n) => yearly.provinces[n].cluster[LAST] === worst)
    const hotRows = hot.map((n) => yearly.provinces[n].rows[LAST])
    const hotImproper = hotRows.reduce((a, r) => a + r.waste_improper_tpd, 0)
    const hotWaste = hotRows.reduce((a, r) => a + r.waste_generated_tpd, 0)
    return {
      waste: nat.waste_tpd,
      kgPerPerson: (nat.waste_tpd * 1000) / pop,
      recycle: pct('recycle_tpd'),
      proper: pct('proper_tpd'),
      improper: pct('improper_tpd'),
      improperTon: nat.improper_tpd,
      worst,
      worstName: yearly.cluster_names[worst],
      hot,
      // กลุ่มแย่สุด: % ขยะของกลุ่มที่กำจัดผิดวิธี และส่วนแบ่งในขยะกำจัดผิดวิธีทั้งประเทศ
      hotImproperPct: (hotImproper / hotWaste) * 100,
      hotShareOfNation: (hotImproper / nat.improper_tpd) * 100,
      years: YEARS.map((y) => ({ y, v: (yearly.national[y].improper_tpd / yearly.national[y].waste_tpd) * 100 })),
    }
  }, [yearly, names])

  // ลิงก์เก่าที่มี ?year= / ?tab= / ?p= ของหน้าภาพรวม พาไปหน้าภาพรวมตามเดิม
  if (search) return <Navigate to={`/overview${search}`} replace />

  const ny = story.years
  const first = ny[0]
  const last = ny[LAST]

  return (
    <div className="story">
      <header className="story-nav">
        <Link to="/" className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
          </svg>
          ขยะทั่วไทย
        </Link>
        <nav className="top-nav seg">
          <NavLink to="/overview">ภาพรวม</NavLink>
          <NavLink to="/province">ค้นหาจังหวัด</NavLink>
          {SHOW_TREND && <NavLink to="/trend">การเปลี่ยนแปลง</NavLink>}
        </nav>
        <button className="ghost-btn" onClick={toggle} aria-label={dark ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}>
          <span className="theme-icon" aria-hidden />
        </button>
        <Link to="/overview" className="theme-btn">เข้าสู่แดชบอร์ด</Link>
        <HangingBin />
      </header>

      {/* ฉาก 1: เปิดเรื่อง */}
      <section className="scene hero">
        <Reveal className="eyebrow">ข้อมูลขยะมูลฝอย 77 จังหวัด · พ.ศ. {YEARS[0]}–{YEARS[LAST]}</Reveal>
        <Reveal as="h1" className="mega" delay={120}>
          ขยะของเรา<br />ไปอยู่ที่ไหน<span className="accent">?</span>
        </Reveal>
        <Reveal as="p" className="lead" delay={260}>
          ขยะที่คนไทยทิ้งทุกวัน ได้ไปต่อ หรือไปจบผิดที่? เลื่อนลงไปดูคำตอบจากข้อมูล 7 ปี 77 จังหวัด
        </Reveal>
        <div className="scroll-hint" aria-hidden>
          <span>เลื่อนลง</span>
          <i />
        </div>
      </section>

      {/* ฉาก 2: ปริมาณขยะต่อวัน */}
      <section className="scene">
        <Reveal className="eyebrow">ปี {YEARS[LAST]}</Reveal>
        <Reveal as="p" className="lead">แค่วันเดียว คนไทยทั้งประเทศทิ้งขยะรวมกัน</Reveal>
        <Reveal as="div" className="giant" delay={100}>
          <CountUp value={story.waste} /> <small>ตัน</small>
        </Reveal>
        <Reveal as="p" className="lead" delay={200}>
          ตกคนละ <b>{story.kgPerPerson.toFixed(2)} กิโลกรัม</b> ต่อวัน
        </Reveal>
      </section>

      {/* ฉาก 3: ขยะไปไหน */}
      <section className="scene band green">
        <Reveal as="h2" className="mega sm">ทิ้งแล้ว ไปไหนต่อ?</Reveal>
        <div className="split">
          {[
            ['นำกลับมาใช้', story.recycle, SERIES.recycle],
            ['กำจัดถูกต้อง', story.proper, SERIES.proper],
            ['กำจัดไม่ถูกต้อง', story.improper, SERIES.improper],
          ].map(([label, v, color], i) => (
            <Reveal key={label} className="split-item" delay={i * 140}>
              <span className="split-num" style={{ color }}><CountUp value={v} decimals={1} suffix="%" /></span>
              <span className="split-label">{label}</span>
            </Reveal>
          ))}
        </div>
        <Reveal className="flow-bar" delay={420} aria-hidden>
          <span style={{ width: `${story.recycle}%`, background: SERIES.recycle }} />
          <span style={{ width: `${story.proper}%`, background: SERIES.proper }} />
          <span style={{ width: `${story.improper}%`, background: SERIES.improper }} />
        </Reveal>
        <Reveal as="p" className="lead" delay={500}>
          ยังมีขยะถูกกำจัดผิดวิธีถึง <b>{Math.round(story.improperTon).toLocaleString('en-US')} ตันต่อวัน</b>
        </Reveal>
      </section>

      {/* ฉาก 4: จังหวัดที่ต้องเร่งแก้ */}
      <section className="scene map-scene">
        <div className="map-copy">
          <Reveal className="eyebrow">กลุ่ม {story.worst} · ปี {YEARS[LAST]}</Reveal>
          <Reveal as="h2" className="mega sm" delay={100}>
            <span className="accent">{story.hot.length} จังหวัด</span><br />กำจัดขยะผิดวิธี<br />หนักสุดในประเทศ
          </Reveal>
          <Reveal as="p" className="lead" delay={160}>
            ขยะถึง <b>{Math.round(story.hotImproperPct)}%</b> ของจังหวัดกลุ่มนี้ยังไปจบผิดที่ คิดเป็น{' '}
            <b>{Math.round(story.hotShareOfNation)}%</b> ของขยะกำจัดผิดวิธีทั้งประเทศ
          </Reveal>
          <Reveal className="chips" delay={220}>
            {story.hot.map((n) => (
              <Link key={n} to={`/province/${encodeURIComponent(n)}`} className="chip-link">{n}</Link>
            ))}
          </Reveal>
        </div>
        <Reveal className="map-wrap" delay={150}>
          <StoryMap highlight={new Set(story.hot)} />
        </Reveal>
      </section>

      {/* ฉาก 5: 7 ปีที่ผ่านมา */}
      <section className="scene band brown">
        <Reveal className="eyebrow">7 ปีผ่านไป ขยะกำจัดผิดวิธีทั้งประเทศ</Reveal>
        <Reveal as="h2" className="mega sm" delay={100}>
          จาก {first.v.toFixed(1)}% {last.v <= first.v ? 'เหลือ' : 'เพิ่มเป็น'} <span className="accent">{last.v.toFixed(1)}%</span>
        </Reveal>
        <div className="years">
          {ny.map((r, i) => (
            <Reveal key={r.y} className={`year ${i === LAST ? 'now' : ''}`} delay={i * 80}>
              <span className="year-y">{r.y}</span>
              <span className="year-v">{r.v.toFixed(1)}%</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ฉาก 6: ไปต่อ */}
      <section className="scene cta">
        <Reveal as="h2" className="mega sm">จังหวัดของคุณอยู่ตรงไหน?</Reveal>
        <Reveal as="p" className="lead" delay={100}>เช็กตัวเลขบ้านคุณ เทียบกับจังหวัดในกลุ่มเดียวกัน และดูว่า 7 ปีที่ผ่านมาดีขึ้นหรือแย่ลง</Reveal>
        <Reveal className="cta-row" delay={200}>
          <Link to="/overview" className="theme-btn big">เข้าสู่แดชบอร์ด</Link>
          <Link to="/province" className="ghost-pill">ค้นหาจังหวัด</Link>
          <Link to="/clusters" className="ghost-pill">กลุ่มจังหวัด</Link>
          {SHOW_TREND && <Link to="/trend" className="ghost-pill">การเปลี่ยนแปลง</Link>}
        </Reveal>
        <p className="muted small credit">ข้อมูล: ฐานข้อมูลรวมของทีม ปี {YEARS[0]}–{YEARS[LAST]} · ขอบเขตจังหวัด: geoBoundaries (ODbL)</p>
      </section>
    </div>
  )
}
