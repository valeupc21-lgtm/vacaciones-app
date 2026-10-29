export default function SetupNotice() {
  return (
    <div className="center">
      <div className="card narrow">
        <h2>Falta conectar con Google Sheets</h2>
        <p>
          Define la variable <code>VITE_API_URL</code> con la dirección de tu aplicación web de
          Google (la que termina en <code>/exec</code>).
        </p>
        <ul className="small">
          <li>En tu computadora: copia <code>.env.example</code> como <code>.env</code> y complétalo.</li>
          <li>En Netlify: Site configuration → Environment variables, y vuelve a desplegar.</li>
        </ul>
      </div>
    </div>
  )
}
