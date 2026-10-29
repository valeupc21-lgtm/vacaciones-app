import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { daysInMonth, formatDate, formatRange, MONTHS, toISO, todayISO, weekdayMonFirst } from './dates'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_CHIPS = 3

// Color estable por persona
function hue(key) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export default function HRCalendar() {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() + 1 })
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  const first = toISO(ym.y, ym.m, 1)
  const last = toISO(ym.y, ym.m, daysInMonth(ym.y, ym.m))
  const today = todayISO()

  const load = useCallback(async () => {
    try {
      setRows(await api('calendar', { from: first, to: last }))
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }, [first, last])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? rows.filter((r) => r.nombre?.toLowerCase().includes(q)) : rows
  }, [rows, search])

  const on = (dateStr) => filtered.filter((r) => r.inicio <= dateStr && r.fin >= dateStr)

  function shift(delta) {
    setSelected(null)
    setYm(({ y, m }) => {
      const n = m + delta
      if (n < 1) return { y: y - 1, m: 12 }
      if (n > 12) return { y: y + 1, m: 1 }
      return { y, m: n }
    })
  }

  const blanks = weekdayMonFirst(ym.y, ym.m, 1)
  const total = daysInMonth(ym.y, ym.m)
  const cells = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ]
  const selectedRows = selected ? on(selected) : []

  return (
    <div className="stack">
      <section className="card">
        <div className="cal-head">
          <div className="cal-nav">
            <button className="btn ghost" onClick={() => shift(-1)} aria-label="Mes anterior">‹</button>
            <h2>{MONTHS[ym.m - 1]} {ym.y}</h2>
            <button className="btn ghost" onClick={() => shift(1)} aria-label="Mes siguiente">›</button>
            <button
              className="btn ghost small"
              onClick={() => { setSelected(null); setYm({ y: now.getFullYear(), m: now.getMonth() + 1 }) }}
            >
              Hoy
            </button>
          </div>
          <input
            className="search"
            placeholder="Buscar persona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="calendar">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-dow">{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} className="cal-cell empty" />
            const dateStr = toISO(ym.y, ym.m, d)
            const people = on(dateStr)
            const weekend = (blanks + d - 1) % 7 >= 5
            return (
              <button
                key={dateStr}
                className={[
                  'cal-cell',
                  weekend ? 'weekend' : '',
                  dateStr === today ? 'today' : '',
                  selected === dateStr ? 'selected' : '',
                ].join(' ')}
                onClick={() => setSelected(selected === dateStr ? null : dateStr)}
              >
                <span className="cal-day">{d}</span>
                <span className="cal-chips">
                  {people.slice(0, MAX_CHIPS).map((p) => (
                    <span
                      key={p.id}
                      className="cal-chip"
                      style={{ background: `hsl(${hue(p.email)} 70% 90%)`, color: `hsl(${hue(p.email)} 55% 25%)` }}
                      title={p.nombre}
                    >
                      {p.nombre}
                    </span>
                  ))}
                  {people.length > MAX_CHIPS && <span className="cal-more">+{people.length - MAX_CHIPS} más</span>}
                </span>
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="day-detail">
            <h3>{formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {selectedRows.length === 0 ? (
              <p className="muted">Nadie de vacaciones este día.</p>
            ) : (
              <ul>
                {selectedRows.map((r) => (
                  <li key={r.id}><strong>{r.nombre}</strong> · {formatRange(r.inicio, r.fin)}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Vacaciones aprobadas del mes <span className="muted">· {filtered.length}</span></h2>
        {filtered.length === 0 ? (
          <p className="muted">No hay vacaciones aprobadas en este mes.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Colaborador</th><th>Fechas</th><th>Días</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre}</td>
                    <td>{formatRange(r.inicio, r.fin)}</td>
                    <td>{r.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
