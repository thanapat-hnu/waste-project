# ขยะจังหวัด 77

เว็บสรุปผลการจัดกลุ่ม 77 จังหวัดตามการจัดการขยะมูลฝอย ปี 2562–2568 (React + Vite + JSX)
ข้อมูลดึงจาก Supabase (ตาราง `raw_yearly`, `result_yearly`, `result_avg`, `result_trend`) แล้วคำนวณ % / ระดับ / slope ฝั่งเว็บ

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local   # ใส่ URL และ publishable key ของ Supabase
npm run dev
```

## หน้าเว็บ

| path | หน้า |
|---|---|
| `/` | ภาพรวม (เลือกปี / แท็บ การกำจัด · รีไซเคิล · ขยะตกค้าง · ระดับ 4 กลุ่ม) |
| `/trend` | การเปลี่ยนแปลง 2562–2568 |
| `/clusters` | กลุ่มจังหวัด C1–C5 |
| `/province/:name` | ข้อมูลรายจังหวัด |

## โครงโค้ด

- `src/lib/data.js` ดึงข้อมูลจาก Supabase และคำนวณตามสูตรใน WEB_SPEC (พอร์ตจาก `build_data.py`)
- `src/components/ThailandMap.jsx` แผนที่ react-leaflet
- `src/components/charts.jsx` กราฟที่วาดเอง
- `public/data/thailand_provinces.geojson` ขอบเขตจังหวัด

## เครดิต

- ขอบเขตจังหวัด: [geoBoundaries](https://www.geoboundaries.org/) (THA ADM1, ข้อมูลจาก OpenStreetMap, ODbL 1.0)
- แผนที่ฐาน: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
