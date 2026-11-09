import { useEffect, useRef, useState } from 'react'
import { ADS, ONCE_PER_SESSION, SKIP_AFTER } from '../lib/ads'

// ป็อปอัพโฆษณาก่อนเข้าใช้งาน: เล่นโฆษณาทีละอัน กดข้ามได้หลัง SKIP_AFTER วินาที ครบทุกอันแล้วปิดเอง
const KEY = 'adsSeen'

function alreadySeen() {
  if (!ONCE_PER_SESSION) return false
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export default function AdGate() {
  const [index, setIndex] = useState(() => (alreadySeen() || ADS.length === 0 ? -1 : 0))
  const [elapsed, setElapsed] = useState(0)
  const [muted, setMuted] = useState(true)
  const [videoLength, setVideoLength] = useState(null)
  const skipRef = useRef(null)
  const ad = ADS[index]

  const next = () => {
    setElapsed(0)
    setVideoLength(null)
    setIndex((i) => {
      if (i + 1 < ADS.length) return i + 1
      try {
        sessionStorage.setItem(KEY, '1')
      } catch {
        // ไม่มี sessionStorage ก็ปิดได้ แค่รีเฟรชแล้วจะเด้งอีก
      }
      return -1
    })
  }

  // นับเวลาโฆษณาอันปัจจุบัน (ทีละ 0.1 วิ) ครบความยาวแล้วไปอันถัดไป ยกเว้นไฟล์วิดีโอที่รอเล่นจบเอง (onEnded)
  const nextRef = useRef(next)
  useEffect(() => {
    nextRef.current = next
  })
  useEffect(() => {
    if (!ad) return
    let t = 0
    const id = setInterval(() => {
      t = Math.round((t + 0.1) * 10) / 10
      if (!ad.video && t >= ad.seconds) nextRef.current()
      else setElapsed(t)
    }, 100)
    return () => clearInterval(id)
  }, [ad])

  // ระหว่างโฆษณา ล็อกการเลื่อนหน้าเว็บข้างหลัง
  const open = Boolean(ad)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const canSkip = elapsed >= SKIP_AFTER
  useEffect(() => {
    if (canSkip) skipRef.current?.focus()
  }, [canSkip, index])

  if (!ad) return null
  const total = (ad.video && videoLength) || ad.seconds
  const progress = Math.min(1, elapsed / total)

  return (
    <div className="ad-gate" role="dialog" aria-modal="true" aria-label={`โฆษณา ${index + 1} จาก ${ADS.length}`}>
      <div className="ad-box" key={index}>
        <div className="ad-media">
          {ad.video ? (
            <video onLoadedMetadata={(e) => setVideoLength(e.currentTarget.duration)} src={`${import.meta.env.BASE_URL}${ad.video}`} autoPlay muted={muted} playsInline onEnded={next} />
          ) : ad.youtube ? (
            <iframe
              title={ad.title}
              src={`https://www.youtube-nocookie.com/embed/${ad.youtube}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1`}
              allow="autoplay; encrypted-media"
            />
          ) : (
            <AdScene scene={ad.scene} title={ad.title} />
          )}

          <div className="ad-top">
            <span className="ad-tag">โฆษณา {index + 1}/{ADS.length}</span>
            {ad.video && (
              <button type="button" className="ad-mute" onClick={() => setMuted((m) => !m)}>
                {muted ? 'เปิดเสียง' : 'ปิดเสียง'}
              </button>
            )}
          </div>

          <button
            ref={skipRef}
            type="button"
            className={`ad-skip ${canSkip ? 'ready' : ''}`}
            disabled={!canSkip}
            onClick={next}
            aria-live="polite"
          >
            {canSkip ? (
              <>ข้ามโฆษณา <span aria-hidden>›</span></>
            ) : (
              `ข้ามได้ใน ${Math.ceil(SKIP_AFTER - elapsed)}`
            )}
          </button>

          <div className="ad-progress" aria-hidden>
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="ad-foot">
          <span className="ad-sponsor">{ad.sponsor}</span>
          <span className="muted small">{ad.title}</span>
        </div>
      </div>
    </div>
  )
}

// โฆษณาแบบแอนิเมชันที่ทำไว้ในเว็บ ใช้แทนวิดีโอได้เลย
function AdScene({ scene, title }) {
  if (scene === 'sort') {
    return (
      <div className="ad-scene sort">
        <div className="ad-bins">
          {[
            ['รีไซเคิล', '#f2b400'],
            ['เปียก', '#2e9b55'],
            ['ทั่วไป', '#2f6fd6'],
            ['อันตราย', '#d92b24'],
          ].map(([label, color], i) => (
            <div key={label} className="ad-bin" style={{ '--c': color, '--d': `${i * 0.25}s` }}>
              <span className="ad-bin-lid" />
              <span className="ad-bin-body">{label}</span>
            </div>
          ))}
          <span className="ad-drop" />
        </div>
        <h3 className="ad-headline">{title}</h3>
        <p className="ad-sub">แยก 4 ถัง ช่วยให้ขยะถูกนำกลับมาใช้ได้มากขึ้น</p>
      </div>
    )
  }
  if (scene === 'bag') {
    return (
      <div className="ad-scene bag">
        <div className="ad-bag-row">
          <span className="ad-plastic">ถุงพลาสติก</span>
          <span className="ad-arrow" aria-hidden>→</span>
          <span className="ad-tote">ถุงผ้า</span>
        </div>
        <h3 className="ad-headline">{title}</h3>
        <p className="ad-sub">ถุงผ้า 1 ใบ ใช้ซ้ำได้นับร้อยครั้ง</p>
      </div>
    )
  }
  return (
    <div className="ad-scene map">
      <div className="ad-pins" aria-hidden>
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="ad-pin" style={{ '--d': `${i * 0.18}s`, left: `${12 + ((i * 37) % 76)}%`, top: `${14 + ((i * 53) % 60)}%` }} />
        ))}
      </div>
      <h3 className="ad-headline">{title}</h3>
      <p className="ad-sub">ดูข้อมูลขยะ 77 จังหวัด ปี 2562–2568 ได้ในเว็บนี้</p>
    </div>
  )
}
