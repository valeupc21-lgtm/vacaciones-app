// Todas las fechas viajan como texto "YYYY-MM-DD" para evitar problemas de zona horaria.

const pad = (n) => String(n).padStart(2, '0')

export const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const toISO = (y, m, d) => `${y}-${pad(m)}-${pad(d)}` // m: 1-12

export function todayISO() {
  const n = new Date()
  return toISO(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Días corridos entre dos fechas, ambos extremos incluidos
export function countDays(a, b) {
  if (!a || !b) return 0
  const n = Math.round((parse(b) - parse(a)) / 86400000) + 1
  return n > 0 ? n : 0
}

export function formatDate(s, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return new Date(parse(s)).toLocaleDateString('es-PE', { ...opts, timeZone: 'UTC' })
}

export function formatRange(a, b) {
  return a === b ? formatDate(a) : `${formatDate(a)} – ${formatDate(b)}`
}

export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate()

// 0 = lunes … 6 = domingo
export function weekdayMonFirst(y, m, d) {
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return (wd + 6) % 7
}

export const STATUS_LABEL = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cancelada: 'Cancelada',
}

export const ROLE_LABEL = { colaborador: 'Colaborador', jefatura: 'Jefatura', rrhh: 'RRHH' }
