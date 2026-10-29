import { useState } from 'react'
import { api, setToken } from './api'
import { ROLE_LABEL } from './dates'

export default function Account({ user, forced = false, onChanged, onLogout }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    if (newPassword !== repeat) {
      setMsg({ type: 'error', text: 'Las dos contraseñas nuevas no coinciden.' })
      return
    }
    setBusy(true)
    try {
      const data = await api('changePassword', { oldPassword, newPassword })
      setToken(data.token)
      setOldPassword('')
      setNewPassword('')
      setRepeat('')
      setMsg({ type: 'ok', text: 'Contraseña actualizada.' })
      onChanged(data.user)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
    setBusy(false)
  }

  return (
    <form className={`card ${forced ? 'narrow' : ''}`} onSubmit={submit} style={forced ? undefined : { maxWidth: 440 }}>
      <h2>{forced ? 'Elige tu contraseña' : 'Mi cuenta'}</h2>
      {forced ? (
        <p className="muted">
          Es tu primer ingreso. Cambia la contraseña temporal por una propia (mínimo 8 caracteres).
        </p>
      ) : (
        <p className="muted small">
          {user.nombre} · {user.email} · {ROLE_LABEL[user.rol]}
        </p>
      )}

      {!forced && (
        <label className="field">
          <span>Contraseña actual</span>
          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required autoComplete="current-password" />
        </label>
      )}
      <label className="field">
        <span>Contraseña nueva</span>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Repite la contraseña nueva</span>
        <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required minLength={8} autoComplete="new-password" />
      </label>

      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
        {forced && <button type="button" className="btn ghost" onClick={onLogout}>Salir</button>}
      </div>
    </form>
  )
}
