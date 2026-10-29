import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { formatDate, formatRange, STATUS_LABEL } from './dates'

export default function Approvals({ user }) {
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      setAll(await api('teamRequests'))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const pending = useMemo(
    () => all.filter((r) => r.estado === 'pendiente').sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [all]
  )
  const history = useMemo(() => all.filter((r) => r.estado !== 'pendiente').slice(0, 30), [all])

  // Otras personas con vacaciones aprobadas que se cruzan con la solicitud
  function overlaps(r) {
    return [
      ...new Set(
        all
          .filter((o) => o.id !== r.id && o.estado === 'aprobada' && o.email !== r.email && o.inicio <= r.fin && o.fin >= r.inicio)
          .map((o) => o.nombre)
      ),
    ]
  }

  async function decide(id, approve) {
    setBusyId(id)
    setMsg(null)
    try {
      await api('decide', { id, approve, comment: comments[id] ?? '' })
      setMsg({ type: 'ok', text: approve ? 'Solicitud aprobada.' : 'Solicitud rechazada.' })
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setBusyId(null)
  }

  if (loading) return <p className="muted">Cargando…</p>

  return (
    <div className="stack">
      <section>
        <h2>
          {user.rol === 'rrhh' ? 'Solicitudes pendientes' : 'Solicitudes de mi equipo'}
          {pending.length > 0 && <span className="badge">{pending.length}</span>}
        </h2>
        {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

        {pending.length === 0 ? (
          <div className="card"><p className="muted">No hay solicitudes pendientes. 🎉</p></div>
        ) : (
          <div className="stack">
            {pending.map((r) => {
              const clash = overlaps(r)
              return (
                <article className="card request" key={r.id}>
                  <div className="request-head">
                    <div>
                      <strong>{r.nombre}</strong>
                      <div className="muted small">{r.email}</div>
                    </div>
                    <div className="right">
                      <div><strong>{formatRange(r.inicio, r.fin)}</strong></div>
                      <div className="muted small">
                        {r.dias} {r.dias === 1 ? 'día' : 'días'} · enviada el {formatDate(String(r.creado).slice(0, 10))}
                      </div>
                    </div>
                  </div>
                  {r.motivo && <p className="reason">“{r.motivo}”</p>}
                  {clash.length > 0 && (
                    <div className="alert warn">Coincide con vacaciones aprobadas de: {clash.join(', ')}.</div>
                  )}
                  <div className="request-actions">
                    <input
                      placeholder="Comentario (opcional)"
                      value={comments[r.id] ?? ''}
                      onChange={(e) => setComments({ ...comments, [r.id]: e.target.value })}
                      maxLength={200}
                    />
                    <button className="btn danger" disabled={busyId === r.id} onClick={() => decide(r.id, false)}>
                      Rechazar
                    </button>
                    <button className="btn primary" disabled={busyId === r.id} onClick={() => decide(r.id, true)}>
                      Aprobar
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Historial reciente</h2>
        {history.length === 0 ? (
          <p className="muted">Todavía no hay solicitudes resueltas.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Colaborador</th><th>Fechas</th><th>Días</th><th>Estado</th><th>Comentario</th></tr>
              </thead>
              <tbody>
                {history.map((r) => (
                  <tr key={r.id}>
                    <td>{r.nombre}</td>
                    <td>{formatRange(r.inicio, r.fin)}</td>
                    <td>{r.dias}</td>
                    <td><span className={`chip ${r.estado}`}>{STATUS_LABEL[r.estado]}</span></td>
                    <td className="muted">{r.comentario || '—'}</td>
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
