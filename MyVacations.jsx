import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { countDays, formatDate, formatRange, STATUS_LABEL, todayISO } from '../lib/dates'

export default function MyVacations({ user }) {
  const [rows, setRows] = useState([])
  const [balance, setBalance] = useState(null)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const today = todayISO()
  const year = start ? Number(start.slice(0, 4)) : new Date().getFullYear()

  const loadRows = useCallback(async () => {
    try {
      setRows(await api('myRequests'))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }, [])

  const loadBalance = useCallback(async () => {
    try {
      setBalance(await api('balance', { year }))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }, [year])

  useEffect(() => { loadRows() }, [loadRows])
  useEffect(() => { loadBalance() }, [loadBalance])

  const days = countDays(start, end)

  const problem = useMemo(() => {
    if (!start || !end) return ''
    if (end < start) return 'La fecha de fin no puede ser anterior al inicio.'
    if (start < today) return 'La fecha de inicio no puede estar en el pasado.'
    const overlap = rows.some(
      (r) => ['pendiente', 'aprobada'].includes(r.estado) && r.inicio <= end && r.fin >= start
    )
    if (overlap) return 'Ya tienes una solicitud pendiente o aprobada que se cruza con esas fechas.'
    if (balance && days > balance.available)
      return `Pides ${days} días y solo tienes ${balance.available} disponibles en ${year}.`
    return ''
  }, [start, end, rows, balance, days, today, year])

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await api('createRequest', { start, end, reason: reason.trim() })
      setMsg({ type: 'ok', text: 'Solicitud enviada a tu jefatura.' })
      setStart('')
      setEnd('')
      setReason('')
      await Promise.all([loadRows(), loadBalance()])
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setBusy(false)
  }

  async function cancel(id) {
    if (!window.confirm('¿Cancelar esta solicitud?')) return
    try {
      await api('cancelRequest', { id })
      setMsg({ type: 'ok', text: 'Solicitud cancelada.' })
      await Promise.all([loadRows(), loadBalance()])
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const canCancel = (r) => r.estado === 'pendiente' || (r.estado === 'aprobada' && r.inicio > today)

  return (
    <div className="stack">
      <section>
        <h2>Mis días disponibles <span className="muted">· {year}</span></h2>
        <div className="stats">
          <Stat label="Total del año" value={balance?.entitled} />
          <Stat label="Aprobados" value={balance?.approved} />
          <Stat label="En revisión" value={balance?.pending} />
          <Stat label="Disponibles" value={balance?.available} highlight />
        </div>
      </section>

      <section className="card">
        <h2>Solicitar vacaciones</h2>
        <form onSubmit={submit} className="form-grid">
          <label className="field">
            <span>Desde</span>
            <input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="field">
            <span>Hasta</span>
            <input type="date" value={end} min={start || today} onChange={(e) => setEnd(e.target.value)} required />
          </label>
          <label className="field wide">
            <span>Motivo o comentario (opcional)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </label>

          <div className="wide summary">
            {days > 0 && !problem && (
              <span>
                Pedirás <strong>{days}</strong> {days === 1 ? 'día' : 'días'} corridos ·{' '}
                te quedarían <strong>{Math.max((balance?.available ?? 0) - days, 0)}</strong> disponibles.
              </span>
            )}
            {problem && <span className="error-text">{problem}</span>}
          </div>

          {msg && <div className={`alert wide ${msg.type}`}>{msg.text}</div>}

          <div className="wide">
            <button className="btn primary" disabled={busy || !start || !end || Boolean(problem)}>
              {busy ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Mis solicitudes</h2>
        {rows.length === 0 ? (
          <p className="muted">Aún no has solicitado vacaciones.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fechas</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Comentario de jefatura</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {formatRange(r.inicio, r.fin)}
                      <div className="muted small">Enviada el {formatDate(String(r.creado).slice(0, 10))}</div>
                    </td>
                    <td>{r.dias}</td>
                    <td><span className={`chip ${r.estado}`}>{STATUS_LABEL[r.estado]}</span></td>
                    <td className="muted">{r.comentario || '—'}</td>
                    <td className="right">
                      {canCancel(r) && (
                        <button className="btn ghost small" onClick={() => cancel(r.id)}>Cancelar</button>
                      )}
                    </td>
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

function Stat({ label, value, highlight }) {
  return (
    <div className={`stat ${highlight ? 'highlight' : ''}`}>
      <span className="stat-value">{value ?? '–'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
