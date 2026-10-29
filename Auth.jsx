import { useState } from 'react'
import { api, setToken } from '../api'

export default function Auth({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const data = await api('login', { email, password })
      setToken(data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="center">
      <form className="card narrow" onSubmit={submit}>
        <div className="brand big">
          <span className="brand-mark" aria-hidden="true">☀</span>
          <span>Vacaciones</span>
        </div>
        <p className="muted">Inicia sesión para continuar</p>

        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary block" disabled={busy}>
          {busy ? 'Un momento…' : 'Entrar'}
        </button>
        <p className="muted small">
          ¿No tienes acceso? Pídele a RRHH que cree tu usuario; te darán una contraseña temporal.
        </p>
      </form>
    </div>
  )
}
