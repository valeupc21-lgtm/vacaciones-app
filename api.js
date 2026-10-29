// Comunicación con el servidor en Google Apps Script.
// Se envía como texto plano (sin cabeceras especiales) para que el navegador no pida permisos extra (CORS).

const API_URL = import.meta.env.VITE_API_URL
export const configured = Boolean(API_URL)

const KEY = 'vacaciones_token'

export function getToken() {
  try { return localStorage.getItem(KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch { /* sin almacenamiento disponible */ }
}

export async function api(action, payload = {}) {
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action, token: getToken(), ...payload }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión a internet.')
  }

  let out
  try {
    out = await res.json()
  } catch {
    throw new Error('El servidor respondió algo inesperado. Revisa que la dirección (VITE_API_URL) sea la correcta.')
  }

  if (!out.ok) {
    if (out.code === 'AUTH') {
      setToken(null)
      window.dispatchEvent(new Event('vacaciones-sesion-vencida'))
    }
    throw new Error(out.error || 'Ocurrió un error.')
  }
  return out.data
}
