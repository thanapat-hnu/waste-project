// หน้าโหลดตอนเปิดเว็บ: จุดสีกะพริบเป็นคลื่น + ข้อความว่ากำลังดึงข้อมูลจาก Supabase
// ใช้ Loader โดย Fadhilmagass (Uiverse.io, MIT License) https://uiverse.io/Fadhilmagass/evil-gecko-62
export function Loader({ leaving = false }) {
  return (
    <div className={`loader ${leaving ? 'leaving' : ''}`} role="status" aria-live="polite">
      <div className="dots-loader" aria-hidden>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <span key={n} className={`dot dot-${n}`} />
        ))}
      </div>
      <div className="loader-brand">ขยะจังหวัด 77</div>
      <div className="loader-msg">กำลังดึงข้อมูลจาก Supabase…</div>
    </div>
  )
}

// โหลดไม่สำเร็จ: แสดงข้อความในธีมเดียวกัน พร้อมปุ่มลองใหม่
export function LoadError({ error }) {
  return (
    <div className="loader" role="alert">
      <div className="loader-stage" aria-hidden>
        <svg className="ld-bin tipped" viewBox="0 0 56 64" width="112" height="128">
          <path d="M22 9 Q28 1 34 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="ld-handle" />
          <g className="ld-lid"><rect x="6" y="9" width="44" height="7" rx="3" /></g>
          <path d="M10 19 H46 L42 60 Q41.5 63 38.5 63 H17.5 Q14.5 63 14 60 Z" className="ld-body" />
          <path d="M21 26 V55 M28 26 V55 M35 26 V55" className="ld-ribs" />
        </svg>
      </div>
      <div className="loader-brand">โหลดข้อมูลไม่สำเร็จ</div>
      <div className="loader-msg static">{error?.message || 'เชื่อมต่อฐานข้อมูลไม่ได้'}</div>
      <button className="theme-btn" onClick={() => window.location.reload()}>ลองใหม่อีกครั้ง</button>
    </div>
  )
}
