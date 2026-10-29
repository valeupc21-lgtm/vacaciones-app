# App de vacaciones (Google Sheets + Netlify)

Solicitud y aprobación de vacaciones con tres perfiles:

| Perfil | Qué puede hacer |
|---|---|
| **Colaborador** | Elegir fechas, ver sus días disponibles, enviar y cancelar solicitudes, ver el estado y el comentario de su jefatura. |
| **Jefatura** | Ver las solicitudes de su equipo y aprobarlas o rechazarlas con comentario (avisa si coincide con otra persona del equipo). |
| **RRHH** | Calendario mensual de vacaciones aprobadas, resolver cualquier solicitud pendiente y administrar personas (alta, rol, jefatura, días por año, restablecer clave). |

**Cómo funciona:** los datos viven en una hoja de Google (pestañas `Usuarios` y `Solicitudes`). Un pequeño programa de Google (Apps Script, archivo `google-apps-script/Code.gs`) hace de servidor. La página web (React) se publica en Netlify y habla con ese programa.

---

## Guía paso a paso

### Paso 1 · Crear la hoja de Google
1. Entra a <https://sheets.google.com> con la cuenta de Google que será la **dueña** de los datos.
2. Pulsa **En blanco** (hoja nueva) y ponle de nombre `Vacaciones`.

### Paso 2 · Pegar el servidor
1. En la hoja: menú **Extensiones → Apps Script**. Se abre una pestaña nueva.
2. Borra el texto que aparece (`function myFunction() {}`).
3. Abre el archivo `google-apps-script/Code.gs`, copia **todo** su contenido y pégalo.
4. Pulsa el ícono del disquete (**Guardar proyecto**).

### Paso 3 · Preparar las hojas
1. En la barra de arriba, a la derecha de **Depurar**, elige la función **`setup`** en el desplegable.
2. Pulsa **Ejecutar**.
3. Google pedirá permiso: **Revisar permisos** → elige tu cuenta → **Avanzado** → **Ir a (proyecto) (no seguro)** → **Permitir**. (Es tu propio programa; el aviso sale porque no está verificado por Google).
4. Vuelve a la hoja: ya existen las pestañas **Usuarios** y **Solicitudes**.
5. En **Usuarios**, fila 2, verás tu correo con el rol `rrhh` y, en la columna `clave_inicial`, tu **contraseña temporal**. Anótala.

### Paso 4 · Publicar el servidor
1. En Apps Script: **Implementar → Nueva implementación**.
2. Pulsa el engranaje ⚙ y elige **Aplicación web**.
3. Configura:
   - **Ejecutar como:** *Yo (tu correo)*
   - **Quién tiene acceso:** *Cualquier usuario*
4. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).

> Si más adelante cambias `Code.gs`, hay que republicar: **Implementar → Administrar implementaciones → ✏ editar → Versión: Nueva versión → Implementar**. La URL no cambia.

### Paso 5 · Probar en tu computadora (opcional pero recomendado)
Necesitas [Node.js 20 o superior](https://nodejs.org).

```bash
cd vacaciones-app
cp .env.example .env        # en Windows: copy .env.example .env
```
Edita `.env` y pega tu URL:
```
VITE_API_URL=https://script.google.com/macros/s/XXXXXXXX/exec
```
Luego:
```bash
npm install
npm run dev
```
Abre <http://localhost:5173>, entra con tu correo y la contraseña temporal; la app te pedirá crear una propia.

### Paso 6 · Crear a tu equipo
1. En la app, pestaña **Personas → Agregar persona**.
2. Completa nombre, correo, rol, jefatura directa y días por año. La app genera una **contraseña temporal**: entrégasela a la persona (la cambiará al primer ingreso).
3. Crea primero a las jefaturas y luego a sus colaboradores, para poder elegir la jefatura.

### Paso 7 · Subir el código a GitHub
```bash
git init
git add .
git commit -m "App de vacaciones"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/vacaciones-app.git
git push -u origin main
```
(Crea antes un repositorio vacío en <https://github.com/new>. El `.env` no se sube.)

### Paso 8 · Publicar en Netlify
1. Entra a <https://app.netlify.com> → **Add new site → Import an existing project** → GitHub → tu repositorio.
2. Netlify lee `netlify.toml`; no cambies nada.
3. En **Environment variables** agrega `VITE_API_URL` con tu URL `/exec`.
4. **Deploy**. En un par de minutos tendrás una URL como `https://tu-sitio.netlify.app`.

**Alternativa sin GitHub:** con el `.env` listo, ejecuta `npm run build` y arrastra la carpeta `dist` a <https://app.netlify.com/drop>.

### Paso 9 · Probar el flujo completo
1. Colaborador: **Mis vacaciones** → elige fechas → **Enviar solicitud**.
2. Jefatura: **Mi equipo** → **Aprobar** o **Rechazar**.
3. RRHH: **Calendario** → aparece la solicitud aprobada.

---

## Reglas que ya incluye
- Los días se cuentan **corridos** (calendario), con ambos extremos incluidos, y se descuentan del **año de la fecha de inicio**.
- No se permiten fechas pasadas, exceso de días ni cruces con otra solicitud pendiente o aprobada. Los días pendientes ya quedan reservados.
- Nadie aprueba su propia solicitud. La jefatura solo resuelve a su equipo; RRHH puede resolver cualquiera.
- Una solicitud pendiente, o aprobada que aún no empieza, se puede cancelar y libera los días.
- Las contraseñas se guardan cifradas (hash con sal); la temporal solo existe hasta el primer ingreso. Tras 5 intentos fallidos con un correo se bloquea 10 minutos.

## Importante sobre la hoja
- **No cambies el orden ni el nombre de las columnas** ni de las pestañas.
- Puedes **leer y filtrar** la hoja `Solicitudes` para reportes. Si editas datos a mano, hazlo con cuidado (fechas como `AAAA-MM-DD`).
- Solo comparte la hoja con quien deba ver todos los datos (RRHH): la hoja `Usuarios` contiene las contraseñas cifradas.
- Los roles que valen son: `colaborador`, `jefatura`, `rrhh`.

## Límites de esta opción (Google Sheets)
Funciona bien para equipos pequeños y medianos (decenas a pocos cientos de personas). Cada acción tarda 1–2 segundos porque Google arranca el programa en cada consulta. Si crece mucho, conviene migrar a una base de datos real.

## Personalizaciones frecuentes
| Quiero… | Dónde |
|---|---|
| Contar solo días hábiles (lun-vie) | `Code.gs`: función `daysBetween_`; y `countDays` en `src/lib/dates.js` |
| Otra zona horaria | `Code.gs`: constante `TZ` (arriba del todo) |
| Más o menos días por defecto | Pestaña **Personas** (por persona); el valor 30 de las altas está en `setup` y `addUser_` |
| Feriados o saldo acumulado de años anteriores | No incluido |

## Estructura
```
google-apps-script/Code.gs   Servidor (se pega en Apps Script)
src/api.js                   Conexión de la página con el servidor
src/App.jsx                  Sesión y pestañas según el rol
src/views/                   Pantallas (Mis vacaciones, Equipo, Calendario RRHH, Personas, Cuenta)
netlify.toml                 Configuración de publicación
```
