// แสดงเมื่อยังไม่ได้เลือกจังหวัด: คำแนะนำด้านบน + แผนที่เต็มความกว้าง
export default function EmptyState({ top, map }) {
  return (
    <main className="full-map">
      {top}
      <p className="muted empty-hint">ยังไม่ได้เลือกจังหวัด · ค้นหาชื่อ เลือกจากรายการ หรือคลิกจังหวัดบนแผนที่</p>
      {map}
    </main>
  )
}
