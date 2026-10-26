// กฎตัวเลขตาม WEB_SPEC ข้อ 8.5
export const fmtTon = (x) => Math.round(x).toLocaleString('en-US')
export const fmtPct = (x) => `${x.toFixed(1)}%`
export const fmtDays = (x) => Math.round(x).toLocaleString('en-US')
export const fmtSigned = (x, digits = 1) => {
  const abs = Math.abs(x).toFixed(digits)
  if (Number(abs) === 0) return `±${abs}`
  return `${x > 0 ? '+' : '−'}${abs}`
}
