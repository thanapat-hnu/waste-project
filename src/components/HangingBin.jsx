import { useEffect, useRef, useState } from 'react'

// ถังขยะห้อยเชือกจากใต้แถบเมนู แกว่งแบบลูกตุ้ม
// - เมาส์ผ่านใกล้ๆ: ได้แรงตามความเร็วเมาส์ · ชี้ที่ถัง: ฝาเปิด · กดค้างแล้วลาก: ดึงแล้วปล่อยให้แกว่ง
// ผู้ใช้ที่ปิดแอนิเมชันในเครื่อง ถังจะห้อยนิ่ง
const LEN = 110 // ความยาวเชือก (px)
const G = 0.000027 // ความโน้มถ่วง (ต่อ ms²) → แกว่งไป-กลับราว 1.2 วินาที
const DAMP = 0.0006 // แรงหน่วง → ค่อยๆ หยุดในไม่กี่วินาที
const PUSH = 0.00025 // แรงจากเมาส์ที่ผ่านใกล้ๆ
const NEAR = 140 // ระยะที่เมาส์ส่งแรงให้ถัง (px)
const MAX = 1.1 // มุมแกว่งสูงสุด (เรเดียน)

export default function HangingBin() {
  const rootRef = useRef(null)
  const armRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [still] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (still) return
    const s = { a: 0, w: 0, drag: false, last: null }
    let raf
    let prevT = performance.now()

    // จุดแขวน (บนจอ) และตำแหน่งตัวถังตามมุมปัจจุบัน
    const pivot = () => {
      const r = rootRef.current.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top }
    }
    const binPos = () => {
      const p = pivot()
      return { x: p.x + Math.sin(s.a) * LEN, y: p.y + Math.cos(s.a) * LEN }
    }

    const step = (t) => {
      const dt = Math.min(32, t - prevT)
      prevT = t
      if (!s.drag) {
        s.w += (-G * Math.sin(s.a) - DAMP * s.w) * dt
        s.a = Math.max(-MAX, Math.min(MAX, s.a + s.w * dt))
      }
      if (armRef.current) armRef.current.style.transform = `rotate(${(-s.a * 180) / Math.PI}deg)`
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    const onMove = (e) => {
      const now = performance.now()
      if (s.drag) {
        // ดึง: มุมชี้ตามตำแหน่งเมาส์เทียบกับจุดแขวน
        const p = pivot()
        const a = Math.atan2(e.clientX - p.x, Math.max(20, e.clientY - p.y))
        s.w = s.last ? (a - s.a) / Math.max(8, now - s.last.t) : 0
        s.a = Math.max(-MAX, Math.min(MAX, a))
      } else if (s.last) {
        // เมาส์ผ่านใกล้ถัง: ส่งแรงตามความเร็วแนวนอนของเมาส์
        const b = binPos()
        const d = Math.hypot(e.clientX - b.x, e.clientY - b.y)
        if (d < NEAR) {
          const vx = (e.clientX - s.last.x) / Math.max(8, now - s.last.t)
          s.w += vx * PUSH * (1 - d / NEAR)
        }
      }
      s.last = { x: e.clientX, y: e.clientY, t: now }
    }
    const onUp = () => {
      s.drag = false
      document.body.classList.remove('bin-dragging')
    }
    const onDown = (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      s.drag = true
      s.last = { x: e.clientX, y: e.clientY, t: performance.now() }
      document.body.classList.add('bin-dragging')
    }

    const bin = armRef.current.querySelector('.hb-bin')
    bin.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      cancelAnimationFrame(raf)
      bin.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.classList.remove('bin-dragging')
    }
  }, [still])

  return (
    <div ref={rootRef} className="hanging-bin" aria-hidden>
      <div ref={armRef} className="hb-arm" style={{ height: LEN + 64 }}>
        <span className="hb-rope" style={{ height: LEN }} />
        <svg
          className={`hb-bin ${open ? 'open' : ''}`}
          viewBox="0 0 56 64"
          width="56"
          height="64"
          onPointerEnter={() => setOpen(true)}
          onPointerLeave={() => setOpen(false)}
        >
          {/* ห่วงแขวน */}
          <path d="M22 9 Q28 1 34 9" className="hb-handle" />
          {/* ฝา (หมุนเปิดตอนชี้) */}
          <g className="hb-lid">
            <rect x="6" y="9" width="44" height="7" rx="3" />
          </g>
          {/* ตัวถัง */}
          <path d="M10 19 H46 L42 60 Q41.5 63 38.5 63 H17.5 Q14.5 63 14 60 Z" className="hb-body" />
          <path d="M21 26 V55 M28 26 V55 M35 26 V55" className="hb-ribs" />
        </svg>
      </div>
    </div>
  )
}
