import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, Pane, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useData } from '../lib/DataContext'
import { MUTED } from '../lib/colors'

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

function FlyToSelected({ geo, selected }) {
  const map = useMap()
  useEffect(() => {
    if (!geo || !selected) return
    const f = geo.features.find((x) => x.properties.name_th === selected)
    if (!f) return
    // ขนาดกล่องเป็น 0 (เช่นตอนเพิ่ง mount หรือหน้าต่างถูกย่อ) จะทำให้ flyTo คำนวณได้ NaN
    map.invalidateSize()
    const size = map.getSize()
    if (!size.x || !size.y) return
    map.flyToBounds(L.geoJSON(f).getBounds(), { maxZoom: 8, duration: 0.6 })
  }, [geo, selected, map])
  return null
}

/**
 * แผนที่จังหวัด (react-leaflet)
 * colorOf(name) → สี, selected/onSelect = จังหวัดที่เลือก
 * legend = [{ key, color, label, count }], focus = key ของกลุ่มที่เน้น, keyOf(name) → key ของจังหวัด
 */
export default function ThailandMap({ colorOf, keyOf, selected, onSelect, legend = [], legendTitle, children }) {
  const { names } = useData()
  const geo = useGeo('thailand_provinces.geojson')
  // เส้นขอบประเทศ: รวมรูปทรง 77 จังหวัดเป็นวงนอก (สร้างจากไฟล์จังหวัดชุดเดียวกัน)
  const outline = useGeo('thailand_outline.geojson')
  // กลุ่มที่กดเน้นจากสัญลักษณ์ ผูกกับชุดสัญลักษณ์ (legendTitle) เปลี่ยนแท็บแล้วจะล้างเอง
  const [focusState, setFocusState] = useState({ title: legendTitle, key: null })
  const focus = focusState.title === legendTitle ? focusState.key : null
  const setFocus = (key) => setFocusState({ title: legendTitle, key })
  // ชื่อจังหวัดที่ไม่มีในข้อมูล (เช่นพิมพ์ผิดในลิงก์) ถือว่ายังไม่ได้เลือก
  const sel = selected && names.includes(selected) ? selected : null
  const [legendOpen, setLegendOpen] = useState(false)
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
        <label className="sr-only" htmlFor="map-province">เลือกจังหวัด</label>
        <select id="map-province" className="pill-select" value={sel || ''} onChange={(e) => onSelect(e.target.value)}>
          <option value="" disabled>เลือกจังหวัด</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        {legend.length > 0 && (
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
