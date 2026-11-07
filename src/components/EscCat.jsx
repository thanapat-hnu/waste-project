import { useEffect, useRef, useState } from 'react'

// ไข่อีสเตอร์: กด Esc แล้วมีแมวกระโดดออกมาร้อง "เมี้ยว"
// เสียงสังเคราะห์ด้วย Web Audio (ไม่ต้องมีไฟล์เสียง) ความดังระดับ 1 จาก 10 = 0.1
const VOLUME = 0.1
const SHOW_MS = 1900

function meow() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx()
  const t = ctx.currentTime
  const master = ctx.createGain()
  master.gain.value = VOLUME
  master.connect(ctx.destination)

  // เสียงแมว: ความถี่ไต่ขึ้นแล้วลง + ฟิลเตอร์เลื่อน "มี-เอี้ยว"
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(520, t)
  osc.frequency.linearRampToValueAtTime(880, t + 0.18)
  osc.frequency.linearRampToValueAtTime(760, t + 0.4)
  osc.frequency.linearRampToValueAtTime(460, t + 0.75)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 3
  filter.frequency.setValueAtTime(900, t)
  filter.frequency.linearRampToValueAtTime(2200, t + 0.2)
  filter.frequency.linearRampToValueAtTime(1100, t + 0.75)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(1, t + 0.06)
  env.gain.setValueAtTime(1, t + 0.45)
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)

  osc.connect(filter).connect(env).connect(master)
  osc.start(t)
  osc.stop(t + 0.82)
  osc.onended = () => ctx.close()
}

export default function EscCat() {
  const [jump, setJump] = useState(0)
  const timer = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      // ไม่แย่ง Esc จาก dropdown หรือช่องพิมพ์ที่ใช้ปุ่มนี้อยู่แล้ว
      if (e.key !== 'Escape' || e.defaultPrevented || e.repeat) return
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      try {
        meow()
      } catch {
        // เล่นเสียงไม่ได้ก็ยังโชว์แมว
      }
      setJump((n) => n + 1)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setJump(0), SHOW_MS)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer.current)
    }
  }, [])

  if (!jump) return null
  return (
    // key เปลี่ยนทุกครั้งที่กด ให้แอนิเมชันเล่นใหม่
    <div key={jump} className="esc-cat" aria-hidden>
      <div className="esc-cat-bubble">เมี้ยว~</div>
      <svg viewBox="0 0 120 120" className="esc-cat-svg">
        <path d="M30 38 L24 8 L50 28 Z" className="ec-fur" />
        <path d="M90 38 L96 8 L70 28 Z" className="ec-fur" />
        <path d="M31 33 L28 16 L43 28 Z" className="ec-ear" />
        <path d="M89 33 L92 16 L77 28 Z" className="ec-ear" />
        <ellipse cx="60" cy="62" rx="40" ry="34" className="ec-fur" />
        <ellipse cx="60" cy="112" rx="34" ry="22" className="ec-fur" />
        <path d="M44 52 q4 -6 8 0" className="ec-line" />
        <path d="M68 52 q4 -6 8 0" className="ec-line" />
        <circle cx="48" cy="58" r="5" className="ec-eye" />
        <circle cx="72" cy="58" r="5" className="ec-eye" />
        <circle cx="49.5" cy="56.5" r="1.6" className="ec-shine" />
        <circle cx="73.5" cy="56.5" r="1.6" className="ec-shine" />
        <path d="M57 66 L63 66 L60 69 Z" className="ec-nose" />
        <path d="M60 69 q-4 6 -9 3 M60 69 q4 6 9 3" className="ec-line" />
        <ellipse cx="60" cy="74" rx="5" ry="6" className="ec-mouth" />
        <path d="M22 62 L40 64 M22 70 L40 68 M98 62 L80 64 M98 70 L80 68" className="ec-whisker" />
        <ellipse cx="38" cy="70" rx="6" ry="3.5" className="ec-blush" />
        <ellipse cx="82" cy="70" rx="6" ry="3.5" className="ec-blush" />
      </svg>
    </div>
  )
}
