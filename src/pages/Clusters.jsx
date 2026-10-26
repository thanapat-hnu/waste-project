import { useCallback, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { YEARS } from '../lib/data'
import { CLUSTER5 } from '../lib/colors'
import { fmtPct } from '../lib/format'
import { Badge, Card, Header, Tabs, TwoColumn } from '../components/Layout'
import { BarChartV, KpiCard } from '../components/charts'
import ThailandMap from '../components/ThailandMap'

const LAST = YEARS.length - 1

export default function Clusters() {
  const { yearly, names } = useData()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const c = Number(params.get('c')) || 5
  const P = yearly.provinces

  const stats = useMemo(() => {
    const members = names.filter((n) => P[n].cluster[LAST] === c)
    let total = 0
    let stay = 0
    let pairs = 0
    names.forEach((n) =>
      P[n].cluster.forEach((k, i) => {
        if (k !== c) return
        total += 1
        if (i < LAST) {
          pairs += 1
          if (P[n].cluster[i + 1] === c) stay += 1
        }
      }),
    )
    const avg = (key) => {
      let w = 0
      let part = 0
      names.forEach((n) => P[n].cluster.forEach((k, i) => {
        if (k === c) {
          w += P[n].waste_tpd[i]
          part += (P[n][key][i] * P[n].waste_tpd[i]) / 100
        }
      }))
      return (part / w) * 100
    }
    return {
      members,
      total,
      stayPct: pairs ? (stay / pairs) * 100 : 0,
      perYear: YEARS.map((_, i) => names.filter((n) => P[n].cluster[i] === c).length),
      recycle: avg('recycle_pct'),
      proper: avg('proper_pct'),
      improper: avg('improper_pct'),
    }
  }, [names, P, c])

  const legend = yearly.cluster_ids.map((k) => ({ key: k, color: CLUSTER5[k - 1], label: `C${k} ${yearly.cluster_names[k]}`, count: yearly.national[2568].count_by_cluster[k - 1] }))
  const colorOf = useCallback((n) => (P[n].cluster[LAST] === c ? CLUSTER5[c - 1] : '#D8D8D2'), [P, c])
  const keyOf = useCallback((n) => P[n].cluster[LAST], [P])

  const left = (
    <>
      <Tabs
        tabs={yearly.cluster_ids.map((k) => ({ key: k, label: `C${k}` }))}
        value={c}
        onChange={(k) => setParams({ c: k }, { replace: true })}
      />

      <Card>
        <div className="cluster-head">
          <Badge color={CLUSTER5[c - 1]}>C{c}</Badge>
          <span className="muted">อันดับ {c} จาก {yearly.cluster_ids.length}</span>
        </div>
        <h2 className="province-title">{yearly.cluster_names[c]}</h2>
        <p className="small">
          จังหวัด-ปีในกลุ่มนี้ (ถ่วงตามปริมาณขยะ): นำกลับมาใช้ {fmtPct(stats.recycle)} · กำจัดถูกต้อง {fmtPct(stats.proper)} · กำจัดไม่ถูกต้อง {fmtPct(stats.improper)}
        </p>
        <div className="grid-3">
          <KpiCard label="จังหวัดปี 2568" value={stats.members.length} />
          <KpiCard label="จังหวัด-ปีทั้งหมด" value={stats.total} />
          <KpiCard label="อยู่กลุ่มเดิมปีถัดไป" value={fmtPct(stats.stayPct)} />
        </div>
      </Card>

      <Card title="จังหวัดในกลุ่ม (ปี 2568) + เส้นทาง 7 ปี">
        <div className="path-head"><span />{YEARS.map((y) => <span key={y}>{String(y).slice(2)}</span>)}</div>
        <ul className="path-list">
          {stats.members.map((n) => (
            <li key={n}>
              <Link to={`/province/${encodeURIComponent(n)}`}>{n}</Link>
              {P[n].cluster.map((k, i) => (
                <span key={i} className="path-cell" style={{ background: CLUSTER5[k - 1] }} title={`${YEARS[i]}: C${k}`}>{k}</span>
              ))}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid-2">
        <Card title="ประเด็นนโยบายที่แนะนำ">
          <p className="muted small">รอข้อความจากทีม (ต้นแบบเดิมเขียนจากผลรอบเก่า)</p>
        </Card>
        <Card title="จำนวนจังหวัดในกลุ่มรายปี">
          <BarChartV
            ariaLabel="จำนวนจังหวัดในกลุ่มรายปี"
            items={YEARS.map((y, i) => ({ label: String(y), value: stats.perYear[i], color: CLUSTER5[c - 1], text: stats.perYear[i] }))}
          />
        </Card>
      </div>
    </>
  )

  return (
    <>
      <Header title="กลุ่มจังหวัด" subtitle="กลุ่มการกำจัดรายปี 5 กลุ่ม" />
      <TwoColumn
        left={left}
        right={
          <ThailandMap
            colorOf={colorOf}
            keyOf={keyOf}
            onSelect={(p) => navigate(`/province/${encodeURIComponent(p)}`)}
            legend={legend}
            legendTitle="กลุ่มการกำจัด ปี 2568"
          />
        }
      />
    </>
  )
}
