import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Pane, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useData } from '../lib/DataContext'
import { MUTED } from '../lib/colors'
import Select from './Select'

const THAILAND_BOUNDS = [[5.6, 97.3], [20.5, 105.7]]

const geoCache = {}
function useGeo(file) {
  const [geo, setGeo] = useState(geoCache[file] || null)
  useEffect(() => {
    if (geoCache[file]) return
    fetch(`${import.meta.env.BASE_URL}data/${file}`)
      .then((r) => r.json())
      .then((g) => setGeo((geoCache[file] = g)))
  }, [file])
  return geo
}

// ขนาดกล่องเป็น 0 (เช่นตอนเพิ่ง mount หรือหน้าต่างถูกย่อ) จะทำให้ flyTo คำนวณได้ NaN
function canFly(map) {
  map.invalidateSize()
  const size = map.getSize()
  return size.x > 0 && size.y > 0
}

function FlyToSelected({ geo, selected }) {
  const map = useMap()
  const prev = useRef(selected)
  useEffect(() => {
    const had = prev.current
    prev.current = selected
    // ยกเลิกการเลือก (เช่นกดปิดการ์ด) ซูมกลับทั้งประเทศ
    if (!selected) {
      if (had && canFly(map)) map.flyToBounds(THAILAND_BOUNDS, { duration: 0.6 })
      return
    }
    if (!geo) return
    const f = geo.features.find((x) => x.properties.name_th === selected)
    if (!f || !canFly(map)) return
    map.flyToBounds(L.geoJSON(f).getBounds(), { maxZoom: 8, duration: 0.6 })
  }, [geo, selected, map])
  return null
}

// ปุ่มรีเซ็ตมุมมอง วางซ้อนเหนือปุ่มซูม ใช้หน้าตาเดียวกับ leaflet-bar
function ResetView() {
  const map = useMap()
  useEffect(() => {
    const control = L.control({ position: 'bottomright' })
    control.onAdd = () => {
      const bar = L.DomUtil.create('div', 'leaflet-bar')
      const a = L.DomUtil.create('a', 'reset-view', bar)
      a.href = '#'
      a.role = 'button'
      a.title = 'รีเซ็ตแผนที่'
      a.setAttribute('aria-label', 'รีเซ็ตแผนที่ ซูมกลับทั้งประเทศ')
      a.innerHTML =
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'
      L.DomEvent.disableClickPropagation(bar)
      L.DomEvent.on(a, 'click', (e) => {
        L.DomEvent.preventDefault(e)
        if (canFly(map)) map.flyToBounds(THAILAND_BOUNDS, { duration: 0.6 })
      })
      return bar
    }
    control.addTo(map)
    return () => control.remove()
  }, [map])
  return null
}

/**
 * แผนที่จังหวัด (react-leaflet)
 * colorOf(name) → สี, selected/onSelect = จังหวัดที่เลือก
 * legend = [{ key, color, label, count }], keyOf(name) → key ของจังหวัด
 * focus/onFocusChange = กลุ่มที่เน้น ให้หน้าเป็นคนคุม (ไม่ส่งมา แผนที่จะจำเอง)
 */
// badge = ป้ายที่แสดงแทนกล่องสัญลักษณ์ (เช่น กลุ่มของจังหวัดที่เลือก) ถ้าส่งมาจะไม่แสดง dropdown สัญลักษณ์
export default function ThailandMap({ colorOf, keyOf, selected, onSelect, legend = [], legendTitle, focus: focusProp, onFocusChange, legendDefaultOpen = false, badge, children }) {
  const { names } = useData()
  const geo = useGeo('thailand_provinces.geojson')
  // เส้นขอบประเทศ: รวมรูปทรง 77 จังหวัดเป็นวงนอก (สร้างจากไฟล์จังหวัดชุดเดียวกัน)
  const outline = useGeo('thailand_outline.geojson')
  // กลุ่มที่กดเน้นจากสัญลักษณ์ ผูกกับชุดสัญลักษณ์ (legendTitle) เปลี่ยนแท็บแล้วจะล้างเอง
  const [focusState, setFocusState] = useState({ title: legendTitle, key: null })
  const controlled = onFocusChange != null
  const focus = controlled ? (focusProp ?? null) : focusState.title === legendTitle ? focusState.key : null
  const setFocus = (key) => (controlled ? onFocusChange(key) : setFocusState({ title: legendTitle, key }))
  // ชื่อจังหวัดที่ไม่มีในข้อมูล (เช่นพิมพ์ผิดในลิงก์) ถือว่ายังไม่ได้เลือก
  const sel = selected && names.includes(selected) ? selected : null
  const provinceOptions = useMemo(() => names.map((n) => ({ value: n, label: n })), [names])
  const [legendOpen, setLegendOpen] = useState(legendDefaultOpen)
  const layerRef = useRef(null)
  // onEachFeature ผูกครั้งเดียว จึงต้องอ่าน onSelect ล่าสุดผ่าน ref
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // เส้นขอบ/สีเลือก/hover คุมด้วย CSS class .prov (เปลี่ยนตามโหมดมืดได้)
  const styleOf = useMemo(
    () => (feature) => {
      const name = feature.properties.name_th
      // เลือกจังหวัดแล้ว จังหวัดอื่นจางลง เหลือเด่นเฉพาะจังหวัดที่เลือก
      const dim = (sel && name !== sel) || (focus != null && keyOf && keyOf(name) !== focus)
      return { className: 'prov', fillColor: colorOf(name) || MUTED, fillOpacity: dim ? 0.12 : 0.88, weight: 0.8 }
    },
    [colorOf, keyOf, focus, sel],
  )

  // ยกจังหวัดที่เลือกขึ้นบนสุด ไม่ให้ขอบจังหวัดข้างเคียงทับกรอบ
  const selRef = useRef(sel)
  const raiseSelected = () => layerRef.current?.eachLayer((l) => l.feature.properties.name_th === selRef.current && l.bringToFront())
  useEffect(() => {
    selRef.current = sel
    const layer = layerRef.current
    if (!layer) return
    layer.setStyle(styleOf)
    layer.eachLayer((l) => {
      const isSel = l.feature.properties.name_th === sel
      l.getElement()?.classList.toggle('is-sel', isSel)
      if (isSel) l.bringToFront()
    })
  }, [styleOf, sel, geo])

  return (
    <div className="map-panel">
      <div className="map-top">
        <Select label="เลือกจังหวัด" placeholder="เลือกจังหวัด" value={sel || ''} onChange={onSelect} options={provinceOptions} />

        {badge && <div className="map-badge glass">{badge}</div>}
        {!badge && legend.length > 0 && (
          <div className="legend glass">
            <button className="legend-toggle" aria-expanded={legendOpen} onClick={() => setLegendOpen(!legendOpen)}>
              สัญลักษณ์ · {legendTitle} <span aria-hidden>{legendOpen ? '▴' : '▾'}</span>
            </button>
            {legendOpen && (
              <ul className="legend-list">
                {legend.map((l) => (
                  <li key={l.key}>
                    <button aria-pressed={focus === l.key} style={{ opacity: focus != null && focus !== l.key ? 0.45 : 1 }} onClick={() => setFocus(focus === l.key ? null : l.key)}>
                      <span className="swatch" style={{ background: l.color }} />
                      <span className="legend-label">{l.label}</span>
                      {l.count != null && <span className="legend-count">{l.count}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {children && <div className="map-info">{children}</div>}

      <MapContainer bounds={THAILAND_BOUNDS} className="map-canvas" zoomSnap={0.25} scrollWheelZoom zoomControl={false}>
        <ZoomControl position="bottomright" />
        <ResetView />
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ขอบเขตจังหวัด: <a href="https://www.geoboundaries.org/">geoBoundaries</a> (ODbL)'
        />
        {geo && (
          <GeoJSON
            ref={layerRef}
            data={geo}
            style={styleOf}
            onEachFeature={(f, layer) => {
              layer.bindTooltip(f.properties.name_th, { sticky: true, direction: 'top', offset: [0, -10], className: 'map-tip', opacity: 1 })
              layer.on('click', () => onSelectRef.current(f.properties.name_th))
              layer.on('mouseover', () => {
                layer.getElement()?.classList.add('is-hover')
                layer.bringToFront()
              })
              layer.on('mouseout', () => {
                layer.getElement()?.classList.remove('is-hover')
                raiseSelected()
              })
            }}
          />
        )}
        {outline && (
          <Pane name="outline" style={{ zIndex: 450, pointerEvents: 'none' }}>
            <GeoJSON data={outline} interactive={false} style={{ className: 'th-outline', fill: false, weight: 2 }} />
          </Pane>
        )}
        <FlyToSelected geo={geo} selected={sel} />
      </MapContainer>
    </div>
  )
}
