import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { GeoJSON, MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useData } from '../lib/DataContext'

const THAILAND_BOUNDS = [[5.6, 97.3], [20.5, 105.7]]

let geoCache = null
function useGeo() {
  const [geo, setGeo] = useState(geoCache)
  useEffect(() => {
    if (geoCache) return
    fetch(`${import.meta.env.BASE_URL}data/thailand_provinces.geojson`)
      .then((r) => r.json())
      .then((g) => setGeo((geoCache = g)))
  }, [])
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
  const geo = useGeo()
  const [focus, setFocus] = useState(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const layerRef = useRef(null)
  // onEachFeature ผูกครั้งเดียว จึงต้องอ่าน onSelect ล่าสุดผ่าน ref
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  const styleOf = useMemo(
    () => (feature) => {
      const name = feature.properties.name_th
      const dim = focus != null && keyOf && keyOf(name) !== focus
      const isSel = name === selected
      return {
        fillColor: colorOf(name) || '#D8D8D2',
        fillOpacity: dim ? 0.15 : 0.9,
        color: isSel ? '#1B1F1D' : '#FFFFFF',
        weight: isSel ? 2.4 : 0.7,
      }
    },
    [colorOf, keyOf, focus, selected],
  )

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.setStyle(styleOf)
    layer.eachLayer((l) => l.feature.properties.name_th === selected && l.bringToFront())
  }, [styleOf, selected])

  return (
    <div className="map-panel">
      <div className="map-top">
        <label className="sr-only" htmlFor="map-province">เลือกจังหวัด</label>
        <select id="map-province" className="pill-select" value={selected || ''} onChange={(e) => onSelect(e.target.value)}>
          <option value="" disabled>เลือกจังหวัด</option>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        {legend.length > 0 && (
          <div className="legend">
            <button className="legend-toggle" aria-expanded={legendOpen} onClick={() => setLegendOpen(!legendOpen)}>
              สัญลักษณ์ · {legendTitle} <span aria-hidden>{legendOpen ? '▴' : '▾'}</span>
            </button>
            {legendOpen && (
              <ul className="legend-list">
                {legend.map((l) => (
                  <li key={l.key}>
                    <button aria-pressed={focus === l.key} onClick={() => setFocus(focus === l.key ? null : l.key)}>
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
              layer.bindTooltip(f.properties.name_th, { sticky: true })
              layer.on('click', () => onSelectRef.current(f.properties.name_th))
            }}
          />
        )}
        <FlyToSelected geo={geo} selected={selected} />
      </MapContainer>
    </div>
  )
}
