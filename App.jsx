import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, configured, getToken, setToken } from './api'
import { ROLE_LABEL } from './dates'
import Auth from './Auth.jsx'
import Account from './Account.jsx'
import SetupNotice from './SetupNotice.jsx'
import MyVacations from './MyVacations.jsx'
import Approvals from './Approvals.jsx'
import HRCalendar from './HRCalendar.jsx'
import People from './People.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  const [tab, setTab] = useState('mine')

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // Al abrir la app, si hay una sesión guardada, la recupera
  useEffect(() => {
    if (!configured || !getToken()) return
    api('me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  // Si el servidor dice que la sesión venció
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('vacaciones-sesion-vencida', onExpired)
    return () => window.removeEventListener('vacaciones-sesion-vencida', onExpired)
  }, [])

  const tabs = useMemo(() => {
    if (!user) return []
    const list = [{ id: 'mine', label: 'Mis vacaciones' }]
    if (user.rol === 'jefatura') list.push({ id: 'team', label: 'Mi equipo' })
    if (user.rol === 'rrhh') {
      list.push({ id: 'team', label: 'Solicitudes' })
      list.push({ id: 'calendar', label: 'Calendario' })
      list.push({ id: 'people', label: 'Personas' })
    }
    list.push({ id: 'account', label: 'Mi cuenta' })
    return list
  }, [user])

  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === tab)) setTab(tabs[0].id)
  }, [tabs, tab])

  if (!configured) return <SetupNotice />
  if (loading) return <div className="center muted">Cargando…</div>
  if (!user) return <Auth onLogin={setUser} />

  // Primer ingreso: obliga a cambiar la contraseña temporal
  if (user.mustChange) {
    return (
      <div className="center">
        <Account forced user={user} onChanged={setUser} onLogout={logout} />
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">☀</span>
          <span>Vacaciones</span>
        </div>
        <nav className="tabs" aria-label="Secciones">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="user">
          <div className="user-info">
            <strong>{user.nombre}</strong>
            <span className="muted small">{ROLE_LABEL[user.rol]}</span>
          </div>
          <button className="btn ghost" onClick={logout}>Salir</button>
        </div>
      </header>

      <main className="content">
        {tab === 'mine' && <MyVacations user={user} />}
        {tab === 'team' && <Approvals user={user} />}
        {tab === 'calendar' && user.rol === 'rrhh' && <HRCalendar />}
        {tab === 'people' && user.rol === 'rrhh' && <People user={user} />}
        {tab === 'account' && <Account user={user} onChanged={setUser} onLogout={logout} />}
      </main>
    </div>
  )
}
