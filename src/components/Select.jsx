import { useEffect, useId, useRef, useState } from 'react'

/**
 * ดรอปดาวน์แบบ Apple (แทน <select> ที่แต่งหน้ารายการไม่ได้)
 * options = [{ value, label }], onChange(value), label = ชื่อสำหรับโปรแกรมอ่านหน้าจอ
 * align = 'left' | 'right' ฝั่งที่รายการเปิดชิด
 */
export default function Select({ value, onChange, options, label, placeholder = 'เลือก', align = 'left', className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const btnRef = useRef(null)
  const id = useId()
  const selectedIndex = options.findIndex((o) => o.value === value)
  const current = options[selectedIndex]

  const openList = (index = selectedIndex) => {
    setActive(index < 0 ? 0 : index)
    setOpen(true)
  }
  const close = (focusButton = true) => {
    setOpen(false)
    if (focusButton) btnRef.current?.focus()
  }
  const pick = (i) => {
    const o = options[i]
    if (o && o.value !== value) onChange(o.value)
    close()
  }

  // คลิกนอกกล่องแล้วปิด
  useEffect(() => {
    if (!open) return
    const onDown = (e) => !rootRef.current?.contains(e.target) && close(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // เปิดแล้วโฟกัสรายการ และเลื่อนให้เห็นตัวที่เลือกอยู่
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const onButtonKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }
  const onListKey = (e) => {
    const last = options.length - 1
    const move = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last }
    if (e.key in move) {
      e.preventDefault()
      setActive(move[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      pick(active)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      close()
    } else if (e.key.length === 1) {
      // พิมพ์ตัวอักษรแรกเพื่อกระโดดไปหา
      const i = options.findIndex((o, k) => k > active && String(o.label).startsWith(e.key))
      const j = i >= 0 ? i : options.findIndex((o) => String(o.label).startsWith(e.key))
      if (j >= 0) setActive(j)
    }
  }

  return (
    <div ref={rootRef} className={`ui-select ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className="pill-select ui-select-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label ? `${label}: ${current ? current.label : placeholder}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
      >
        <span className={current ? '' : 'muted'}>{current ? current.label : placeholder}</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          className={`ui-select-list glass align-${align}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={i === active ? 'is-active' : ''}
              onPointerMove={() => setActive(i)}
              onClick={() => pick(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
