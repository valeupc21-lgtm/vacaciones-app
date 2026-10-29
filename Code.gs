/**
 * App de vacaciones · servidor en Google Apps Script
 * Guarda los datos en las hojas "Usuarios" y "Solicitudes" de esta hoja de cálculo.
 *
 * Uso: pegar este archivo en Extensiones → Apps Script, ejecutar la función "setup"
 * una vez y publicar como Aplicación web (ver README.md).
 */

const TZ = 'America/Lima';
const SHEET_USERS = 'Usuarios';
const SHEET_REQ = 'Solicitudes';
const USER_HEADERS = ['email', 'nombre', 'rol', 'jefe_email', 'dias_anuales', 'clave_inicial', 'clave_hash'];
const REQ_HEADERS = ['id', 'email', 'nombre', 'inicio', 'fin', 'dias', 'motivo', 'estado',
  'decidido_por', 'fecha_decision', 'comentario', 'creado'];
const NUMERIC_COLS = { dias_anuales: true, dias: true };
const ROLES = ['colaborador', 'jefatura', 'rrhh'];
const TOKEN_DAYS = 7;
const MAX_LOGIN_FAILS = 5;

/* ------------------------------------------------------------------ */
/* Configuración inicial (se ejecuta UNA vez a mano)                   */
/* ------------------------------------------------------------------ */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());

  const users = ensureSheet_(ss, SHEET_USERS, USER_HEADERS);
  ensureSheet_(ss, SHEET_REQ, REQ_HEADERS);

  // Quita la hoja vacía que Google crea por defecto
  ss.getSheets().forEach(function (s) {
    const n = s.getName();
    if ((n === 'Hoja 1' || n === 'Sheet1') && s.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(s);
    }
  });

  let msg = 'Listo: hojas creadas.';
  if (users.getLastRow() < 2) {
    const mail = (Session.getEffectiveUser().getEmail() || 'TU-CORREO@gmail.com').toLowerCase();
    const temp = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    appendRow_(SHEET_USERS, USER_HEADERS, {
      email: mail, nombre: 'Administrador RRHH', rol: 'rrhh', jefe_email: '',
      dias_anuales: 30, clave_inicial: temp, clave_hash: '',
    });
    msg += ' Se creó tu usuario RRHH (' + mail + '). Tu contraseña temporal está en la hoja "Usuarios", fila 2, columna clave_inicial.';
  }
  Logger.log(msg);
  return msg;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  const head = sh.getRange(1, 1, 1, headers.length);
  head.setValues([headers]);
  head.setFontWeight('bold');
  head.setBackground('#d9f0ec');
  sh.setFrozenRows(1);
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  headers.forEach(function (h, i) {
    sh.getRange(2, i + 1, rows, 1).setNumberFormat(NUMERIC_COLS[h] ? '0' : '@');
  });
  return sh;
}

/* ------------------------------------------------------------------ */
/* Entrada web                                                         */
/* ------------------------------------------------------------------ */
function doGet() {
  return json_({ ok: true, message: 'API de vacaciones funcionando' });
}

function doPost(e) {
  let lock = null;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = ACTIONS[req.action];
    if (!fn) throw new Error('Acción desconocida');
    if (WRITES[req.action]) {
      lock = LockService.getScriptLock();
      lock.waitLock(20000);
    }
    return json_({ ok: true, data: fn(req) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err), code: err && err.code });
  } finally {
    if (lock) lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ------------------------------------------------------------------ */
/* Acceso a las hojas                                                  */
/* ------------------------------------------------------------------ */
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Falta la hoja "' + name + '". Ejecuta la función setup en Apps Script.');
  return sh;
}

function normCell_(v, header) {
  if (v instanceof Date) {
    const long = header === 'creado' || header === 'fecha_decision';
    return Utilities.formatDate(v, TZ, long ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : v;
}

function readAll_(name, headers) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  const out = [];
  values.forEach(function (row, i) {
    if (String(row[0]).trim() === '') return; // fila vacía
    const o = { _row: i + 2 };
    headers.forEach(function (h, c) { o[h] = normCell_(row[c], h); });
    out.push(o);
  });
  return out;
}

function saveRow_(name, headers, obj) {
  sheet_(name).getRange(obj._row, 1, 1, headers.length)
    .setValues([headers.map(function (h) { return obj[h]; })]);
}

function appendRow_(name, headers, obj) {
  const sh = sheet_(name);
  const row = Math.max(sh.getLastRow(), 1) + 1;
  const rng = sh.getRange(row, 1, 1, headers.length);
  rng.setNumberFormats([headers.map(function (h) { return NUMERIC_COLS[h] ? '0' : '@'; })]);
  rng.setValues([headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; })]);
  obj._row = row;
  return obj;
}

const mail_ = function (v) { return String(v === null || v === undefined ? '' : v).trim().toLowerCase(); };

function users_() {
  return readAll_(SHEET_USERS, USER_HEADERS).map(function (u) {
    u.email = mail_(u.email);
    u.jefe_email = mail_(u.jefe_email);
    u.rol = ROLES.indexOf(mail_(u.rol)) >= 0 ? mail_(u.rol) : 'colaborador';
    u.nombre = String(u.nombre || u.email);
    u.dias_anuales = Number(u.dias_anuales) || 0;
    u.clave_inicial = String(u.clave_inicial);
    u.clave_hash = String(u.clave_hash);
    return u;
  });
}

function findUser_(email) {
  const target = mail_(email);
  const list = users_();
  for (let i = 0; i < list.length; i++) if (list[i].email === target) return list[i];
  return null;
}

function requests_() {
  return readAll_(SHEET_REQ, REQ_HEADERS).map(function (r) {
    r.email = mail_(r.email);
    r.dias = Number(r.dias) || 0;
    r.estado = mail_(r.estado);
    return r;
  });
}

function clean_(r) {
  const o = {};
  REQ_HEADERS.forEach(function (h) { o[h] = r[h]; });
  return o;
}

function publicUser_(u) {
  return {
    email: u.email, nombre: u.nombre, rol: u.rol, jefe_email: u.jefe_email,
    dias_anuales: u.dias_anuales, mustChange: u.clave_inicial !== '',
  };
}

/* ------------------------------------------------------------------ */
/* Contraseñas y sesiones                                              */
/* ------------------------------------------------------------------ */
function toHex_(bytes) {
  return bytes.map(function (b) { return ((b < 0 ? b + 256 : b)).toString(16).padStart(2, '0'); }).join('');
}

function safeEq_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hashPass_(pass, salt) {
  return toHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass));
}
function makeHash_(pass) {
  const salt = Utilities.getUuid();
  return salt + '$' + hashPass_(pass, salt);
}
function checkHash_(pass, stored) {
  const i = String(stored).indexOf('$');
  if (i < 0) return false;
  return safeEq_(hashPass_(pass, stored.slice(0, i)), stored.slice(i + 1));
}

function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SECRET');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty('SECRET', s);
  }
  return s;
}
function sign_(data) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, secret_()));
}

// "v" liga la sesión a la contraseña actual: si cambia la clave, las sesiones viejas dejan de valer.
function versionOf_(u) { return (u.clave_inicial !== '' ? 'i' + u.clave_inicial : u.clave_hash).slice(-10); }

function makeToken_(u) {
  const payload = Utilities.base64EncodeWebSafe(JSON.stringify({
    e: u.email, v: versionOf_(u), x: Date.now() + TOKEN_DAYS * 86400000,
  }));
  return payload + '.' + sign_(payload);
}

function authError_(msg) {
  const e = new Error(msg);
  e.code = 'AUTH';
  return e;
}

function auth_(req) {
  const token = String(req.token || '');
  const parts = token.split('.');
  if (parts.length !== 2 || !safeEq_(sign_(parts[0]), parts[1])) throw authError_('Sesión no válida. Inicia sesión de nuevo.');
  let p;
  try {
    p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
  } catch (err) {
    throw authError_('Sesión no válida. Inicia sesión de nuevo.');
  }
  if (Date.now() > p.x) throw authError_('Tu sesión venció. Inicia sesión de nuevo.');
  const u = findUser_(p.e);
  if (!u || versionOf_(u) !== p.v) throw authError_('Sesión no válida. Inicia sesión de nuevo.');
  return u;
}

function needRole_(u, roles) {
  if (roles.indexOf(u.rol) < 0) throw new Error('No tienes permiso para hacer esto.');
}

/* ------------------------------------------------------------------ */
/* Fechas                                                              */
/* ------------------------------------------------------------------ */
function todayStr_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function nowStr_() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss"); }

function utc_(s) {
  const p = String(s).split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]);
}

function validDate_(s) {
  s = String(s || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('Fecha no válida');
  const d = new Date(utc_(s));
  if (d.toISOString().slice(0, 10) !== s) throw new Error('Fecha no válida');
  return s;
}

function daysBetween_(a, b) { return Math.round((utc_(b) - utc_(a)) / 86400000) + 1; }

function balance_(user, year, rows) {
  let ap = 0;
  let pe = 0;
  rows.forEach(function (r) {
    if (r.email !== user.email || Number(String(r.inicio).slice(0, 4)) !== year) return;
    if (r.estado === 'aprobada') ap += r.dias;
    else if (r.estado === 'pendiente') pe += r.dias;
  });
  return {
    entitled: user.dias_anuales, approved: ap, pending: pe,
    available: Math.max(user.dias_anuales - ap - pe, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */
function login_(req) {
  const email = mail_(req.email);
  const pass = String(req.password || '');
  const cache = CacheService.getScriptCache();
  const key = 'fail:' + email;
  const fails = Number(cache.get(key) || 0);
  if (fails >= MAX_LOGIN_FAILS) throw new Error('Demasiados intentos fallidos. Espera 10 minutos e inténtalo de nuevo.');

  const u = findUser_(email);
  let ok = false;
  if (u) ok = u.clave_inicial !== '' ? safeEq_(u.clave_inicial, pass) : (u.clave_hash !== '' && checkHash_(pass, u.clave_hash));
  if (!ok) {
    cache.put(key, String(fails + 1), 600);
    throw new Error('Correo o contraseña incorrectos.');
  }
  cache.remove(key);
  return { token: makeToken_(u), user: publicUser_(u) };
}

function changePassword_(req) {
  const u = auth_(req);
  const np = String(req.newPassword || '');
  if (np.length < 8) throw new Error('La contraseña nueva debe tener al menos 8 caracteres.');
  if (u.clave_inicial !== '') {
    if (np === u.clave_inicial) throw new Error('Elige una contraseña distinta a la temporal.');
  } else if (!checkHash_(String(req.oldPassword || ''), u.clave_hash)) {
    throw new Error('La contraseña actual no es correcta.');
  }
  u.clave_hash = makeHash_(np);
  u.clave_inicial = '';
  saveRow_(SHEET_USERS, USER_HEADERS, u);
  return { token: makeToken_(u), user: publicUser_(u) };
}

function me_(req) {
  return { user: publicUser_(auth_(req)) };
}

function balance(req) {
  const u = auth_(req);
  const year = Number(req.year) || Number(todayStr_().slice(0, 4));
  return balance_(u, year, requests_());
}

function createRequest_(req) {
  const u = auth_(req);
  const start = validDate_(req.start);
  const end = validDate_(req.end);
  if (end < start) throw new Error('La fecha de fin no puede ser anterior al inicio.');
  if (start < todayStr_()) throw new Error('La fecha de inicio no puede estar en el pasado.');

  const rows = requests_();
  const clash = rows.some(function (r) {
    return r.email === u.email && (r.estado === 'pendiente' || r.estado === 'aprobada') &&
      r.inicio <= end && r.fin >= start;
  });
  if (clash) throw new Error('Ya tienes una solicitud pendiente o aprobada que se cruza con esas fechas.');

  const days = daysBetween_(start, end);
  const year = Number(start.slice(0, 4));
  const bal = balance_(u, year, rows);
  if (days > bal.available) {
    throw new Error('Pides ' + days + ' días y solo tienes ' + bal.available + ' disponibles en ' + year + '.');
  }

  const row = appendRow_(SHEET_REQ, REQ_HEADERS, {
    id: Utilities.getUuid(), email: u.email, nombre: u.nombre, inicio: start, fin: end, dias: days,
    motivo: String(req.reason || '').slice(0, 200), estado: 'pendiente', decidido_por: '',
    fecha_decision: '', comentario: '', creado: nowStr_(),
  });
  return clean_(row);
}

function myRequests_(req) {
  const u = auth_(req);
  return requests_()
    .filter(function (r) { return r.email === u.email; })
    .sort(function (a, b) { return a.inicio < b.inicio ? 1 : -1; })
    .map(clean_);
}

function cancelRequest_(req) {
  const u = auth_(req);
  const r = requests_().filter(function (x) { return x.id === String(req.id); })[0];
  if (!r || r.email !== u.email) throw new Error('Solicitud no encontrada.');
  const ok = r.estado === 'pendiente' || (r.estado === 'aprobada' && r.inicio > todayStr_());
  if (!ok) throw new Error('Esta solicitud ya no se puede cancelar.');
  r.estado = 'cancelada';
  saveRow_(SHEET_REQ, REQ_HEADERS, r);
  return { id: r.id };
}

function teamRequests_(req) {
  const u = auth_(req);
  needRole_(u, ['jefatura', 'rrhh']);
  let list = requests_().filter(function (r) { return r.email !== u.email; });
  if (u.rol === 'jefatura') {
    const team = {};
    users_().forEach(function (p) { if (p.jefe_email === u.email) team[p.email] = true; });
    list = list.filter(function (r) { return team[r.email]; });
  }
  return list.sort(function (a, b) { return a.creado < b.creado ? 1 : -1; }).map(clean_);
}

function decide_(req) {
  const u = auth_(req);
  needRole_(u, ['jefatura', 'rrhh']);
  const r = requests_().filter(function (x) { return x.id === String(req.id); })[0];
  if (!r) throw new Error('Solicitud no encontrada.');
  if (r.estado !== 'pendiente') throw new Error('Esta solicitud ya fue resuelta.');
  if (r.email === u.email) throw new Error('No puedes resolver tu propia solicitud.');
  const owner = findUser_(r.email);
  if (u.rol !== 'rrhh' && !(owner && owner.jefe_email === u.email)) {
    throw new Error('Esta persona no es de tu equipo.');
  }
  r.estado = req.approve ? 'aprobada' : 'rechazada';
  r.decidido_por = u.nombre;
  r.fecha_decision = nowStr_();
  r.comentario = String(req.comment || '').trim().slice(0, 200);
  saveRow_(SHEET_REQ, REQ_HEADERS, r);
  return clean_(r);
}

function calendar_(req) {
  const u = auth_(req);
  needRole_(u, ['rrhh']);
  const from = validDate_(req.from);
  const to = validDate_(req.to);
  return requests_()
    .filter(function (r) { return r.estado === 'aprobada' && r.inicio <= to && r.fin >= from; })
    .sort(function (a, b) { return a.inicio < b.inicio ? -1 : 1; })
    .map(clean_);
}

function listUsers_(req) {
  const u = auth_(req);
  needRole_(u, ['rrhh']);
  return users_().map(publicUser_).sort(function (a, b) { return a.nombre.localeCompare(b.nombre); });
}

function addUser_(req) {
  const u = auth_(req);
  needRole_(u, ['rrhh']);
  const email = mail_(req.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo no es válido.');
  if (findUser_(email)) throw new Error('Ya existe una persona con ese correo.');
  const nombre = String(req.nombre || '').trim();
  if (!nombre) throw new Error('Escribe el nombre.');
  const rol = mail_(req.rol || 'colaborador');
  if (ROLES.indexOf(rol) < 0) throw new Error('Rol no válido.');
  const jefe = mail_(req.jefe_email);
  if (jefe && !findUser_(jefe)) throw new Error('La jefatura indicada no existe.');
  const dias = Number(req.dias_anuales === undefined ? 30 : req.dias_anuales);
  if (!(dias >= 0 && dias <= 365)) throw new Error('Días por año no válidos.');
  const clave = String(req.clave_inicial || '');
  if (clave.length < 6) throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
  appendRow_(SHEET_USERS, USER_HEADERS, {
    email: email, nombre: nombre, rol: rol, jefe_email: jefe, dias_anuales: dias,
    clave_inicial: clave, clave_hash: '',
  });
  return { email: email };
}

function updateUser_(req) {
  const me = auth_(req);
  needRole_(me, ['rrhh']);
  const target = findUser_(req.email);
  if (!target) throw new Error('Persona no encontrada.');
  const patch = req.patch || {};

  if (patch.rol !== undefined) {
    const rol = mail_(patch.rol);
    if (ROLES.indexOf(rol) < 0) throw new Error('Rol no válido.');
    if (target.email === me.email && rol !== me.rol) throw new Error('No puedes cambiar tu propio rol.');
    target.rol = rol;
  }
  if (patch.jefe_email !== undefined) {
    const jefe = mail_(patch.jefe_email);
    if (jefe && !findUser_(jefe)) throw new Error('La jefatura indicada no existe.');
    if (jefe === target.email) throw new Error('Nadie puede ser su propia jefatura.');
    target.jefe_email = jefe;
  }
  if (patch.dias_anuales !== undefined) {
    const d = Number(patch.dias_anuales);
    if (!(Number.isInteger(d) && d >= 0 && d <= 365)) throw new Error('Días por año no válidos.');
    target.dias_anuales = d;
  }
  if (patch.nombre !== undefined) {
    const n = String(patch.nombre).trim();
    if (!n) throw new Error('El nombre no puede estar vacío.');
    target.nombre = n;
  }
  if (patch.resetPassword !== undefined) {
    const c = String(patch.resetPassword);
    if (c.length < 6) throw new Error('La contraseña temporal debe tener al menos 6 caracteres.');
    target.clave_inicial = c;
    target.clave_hash = '';
  }
  saveRow_(SHEET_USERS, USER_HEADERS, target);
  return publicUser_(target);
}

const ACTIONS = {
  login: login_,
  changePassword: changePassword_,
  me: me_,
  balance: balance,
  createRequest: createRequest_,
  myRequests: myRequests_,
  cancelRequest: cancelRequest_,
  teamRequests: teamRequests_,
  decide: decide_,
  calendar: calendar_,
  listUsers: listUsers_,
  addUser: addUser_,
  updateUser: updateUser_,
};

// Acciones que escriben en las hojas: se ejecutan de una en una para evitar choques
const WRITES = {
  changePassword: true, createRequest: true, cancelRequest: true,
  decide: true, addUser: true, updateUser: true,
};
