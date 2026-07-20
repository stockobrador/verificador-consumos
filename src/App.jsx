import { useMemo, useState } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import FilterBar from './components/FilterBar.jsx'
import ResultsView from './components/ResultsView.jsx'
import { supabaseConfigured } from './config/supabase.js'
import {
  readWorkbook,
  parseEjecutado,
  parseControlConsumos,
  parseCertificado,
  jefesDeObra,
} from './lib/parseExcel.js'
import { fetchConsumosPanol } from './lib/supabaseData.js'
import { buildResumen } from './lib/verify.js'
import { inputDateToJS } from './lib/normalize.js'
import './App.css'

export default function App() {
  // Datos parseados de los 3 Excel
  const [frentes, setFrentes] = useState(null)
  const [consumos, setConsumos] = useState(null)
  const [certificado, setCertificado] = useState(null)

  // Filtros
  const [jo, setJo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  // Estado de ejecución
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resultado, setResultado] = useState(null)

  const jefes = useMemo(
    () => jefesDeObra(frentes || [], consumos || []),
    [frentes, consumos]
  )

  async function cargar(file, parser, setter, nombre) {
    if (!file) return
    setError(null)
    try {
      const wb = await readWorkbook(file)
      const data = parser(wb)
      if (!data || data.length === 0) {
        setError(`"${nombre}" se leyó pero no encontré filas con el formato esperado.`)
        return
      }
      setter(data)
    } catch (err) {
      setError(`Error leyendo "${nombre}": ${err.message}`)
    }
  }

  async function verificar() {
    setError(null)
    setResultado(null)

    if (!frentes) return setError('Falta cargar el Excel de frentes (EJECUTADO).')
    if (!certificado) return setError('Falta cargar el Excel de certificado.')
    if (!jo) return setError('Elegí un jefe de obra.')

    const desdeJS = inputDateToJS(desde, false)
    const hastaJS = inputDateToJS(hasta, true)

    setLoading(true)
    try {
      // Consumos de pañol desde Supabase (baldosas, hierro, cemento, etc.)
      let panol = { porRemito: {}, porItem: {}, remitos: [] }
      if (supabaseConfigured) {
        panol = await fetchConsumosPanol(jo, desdeJS, hastaJS)
      }

      const frentesJO = frentes.filter((f) => f.jo === jo)
      if (frentesJO.length === 0) {
        setError(`No hay frentes para "${jo}" en el EJECUTADO. ¿Tiene columna "Jefe de Obra"?`)
        setLoading(false)
        return
      }

      const res = buildResumen({
        frentes: frentesJO,
        consumosHormigon: consumos || [],
        certificado,
        panol,
        jo,
        desde: desdeJS,
        hasta: hastaJS,
      })

      setResultado(res)
    } catch (err) {
      setError(`Error en la verificación: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Verificador de Consumos por Frente</h1>
        <p>Compara lo ejecutado y certificado contra los consumos reales (Excel + Supabase) por jefe de obra y período.</p>
      </header>

      {!supabaseConfigured && (
        <div className="banner-warn">
          ⚠️ Supabase no configurado — los consumos de pañol (baldosas, hierro…) no se cargarán.
          Copiá <code>.env.example</code> a <code>.env.local</code> y completá las credenciales.
        </div>
      )}

      <UploadPanel
        estado={{ frentes, consumos, certificado }}
        onEjecutado={(f) => cargar(f, parseEjecutado, setFrentes, 'EJECUTADO')}
        onControl={(f) => cargar(f, parseControlConsumos, setConsumos, 'CONTROL HORMIGON')}
        onCertificado={(f) => cargar(f, parseCertificado, setCertificado, 'CERTIFICADO')}
      />

      <FilterBar
        jefes={jefes}
        jo={jo}
        setJo={setJo}
        desde={desde}
        setDesde={setDesde}
        hasta={hasta}
        setHasta={setHasta}
        onVerificar={verificar}
        loading={loading}
        puedeVerificar={Boolean(frentes && certificado)}
      />

      {error && <div className="banner-error">❌ {error}</div>}

      <ResultsView resultado={resultado} />
    </div>
  )
}
