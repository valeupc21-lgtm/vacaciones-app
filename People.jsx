import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { ROLE_LABEL } from '../lib/dates'

const ROLES = Object.keys(ROLE_LABEL)

function randomPass() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

const EMPTY = { nombre: '', email: '', rol: 'colaborador', jefe_email: '', dias_anuales: 30, clave_inicial: '' }

export default function People({ user }) {
  const [people, setPeople] = useState([])
  const [msg, setMsg] = useState(null)
  const [form, setForm] = useState({ ...EMPTY, clave_inicial: randomPass() })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setPeople(await api('listUsers'))
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function save(email, patch, okText = 'Cambios guardados.') {
    setMsg(null)
    try {
      await api('updateUser', { email, patch })
      setMsg({ type: 'ok', text: okText })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    load()
  }

  function reset(p) {
    const suggested = randomPass()
    const pass = window.prompt(
      `Nueva contraseña temporal para ${p.nombre} (mínimo 6 caracteres).\nCámbiala si quieres; luego avísale a la persona.`,
      suggested
    )
    if (pass) save(p.email, { resetPassword: pass }, `Contraseña temporal de ${p.nombre}: ${pass}  (entrégasela; la cambiará al entrar)`)
  }

  async function add(e) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await api('addUser', form)
      setMsg({
        type: 'ok',
        text: `Persona agregada. Dale estos datos: correo ${form.email.trim().toLowerCase()} · contraseña temporal ${form.clave_inicial}`,
      })
      setForm({ ...EMPTY, clave_inicial: randomPass() })
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setBusy(false)
  }

  const bosses = people.filter((p) => p.rol === 'jefatura' || p.rol === 'rrhh')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <div className="stack">
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <section className="card">
        <h2>Agregar persona</h2>
        <form onSubmit={add} className="form-grid">
          <label className="field">
            <span>Nombre completo</span>
            <input value={form.nombre} onChange={set('nombre')} required />
          </label>
          <label className="field">
            <span>Correo</span>
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label className="field">
            <span>Rol</span>
            <select value={form.rol} onChange={set('rol')}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Jefatura directa</span>
            <select value={form.jefe_email} onChange={set('jefe_email')}>
              <option value="">— Sin jefatura —</option>
              {bosses.map((b) => <option key={b.email} value={b.email}>{b.nombre}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Días de vacaciones por año</span>
            <input type="number" min="0" max="365" value={form.dias_anuales} onChange={set('dias_anuales')} required />
          </label>
          <label className="field">
            <span>Contraseña temporal</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ flex: 1 }} value={form.clave_inicial} onChange={set('clave_inicial')} required minLength={6} />
              <button type="button" className="btn ghost small" onClick={() => setForm({ ...form, clave_inicial: randomPass() })}>
                Generar
              </button>
            </div>
          </label>
          <div className="wide">
            <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Agregar persona'}</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Personas</h2>
        <p className="muted small">
          Cambia el rol, la jefatura directa y los días por año. Cada cambio se guarda al instante en la hoja “Usuarios”.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Rol</th><th>Jefatura directa</th><th>Días/año</th><th /></tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.email}>
                  <td>
                    {p.nombre} {p.mustChange && <span className="chip pendiente">Sin activar</span>}
                    <div className="muted small">{p.email}</div>
                  </td>
                  <td>
                    <select
                      value={p.rol}
                      disabled={p.email === user.email}
                      onChange={(e) => save(p.email, { rol: e.target.value })}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.jefe_email}
                      onChange={(e) => save(p.email, { jefe_email: e.target.value })}
                    >
                      <option value="">— Sin jefatura —</option>
                      {bosses.filter((b) => b.email !== p.email).map((b) => (
                        <option key={b.email} value={b.email}>{b.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="num"
                      type="number"
                      min="0"
                      max="365"
                      defaultValue={p.dias_anuales}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (Number.isInteger(v) && v >= 0 && v !== p.dias_anuales) save(p.email, { dias_anuales: v })
                      }}
                    />
                  </td>
                  <td className="right">
                    <button className="btn ghost small" onClick={() => reset(p)}>Restablecer clave</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
