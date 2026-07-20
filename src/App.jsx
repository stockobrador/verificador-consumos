import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import './App.css'

const SUPABASE_URL = 'https://nmwaylkgzvaneqaftbrf.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td2F5bGtnenZhbmVxYWZ0YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDE3NDUsImV4cCI6MjA4OTE3Nzc0NX0.Meei4OyVR6VHIGK90lC2yEuVu2xKkGVuSnpZcsxgodI'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Utilidades
function extractAddressComponents(text) {
  if (!text) return { calle: '', altura: null }
  const match = text.match(/^(.+?)\s+(\d+)/)
  if (match) {
    return { calle: match[1].trim(), altura: parseInt(match[2]) }
  }
  return { calle: text, altura: null }
}

function findClosestHeight(targetHeight, heights, tolerance = 50) {
  if (heights.length === 0) return null
  const closest = heights.reduce((prev, curr) =>
    Math.abs(curr - targetHeight) < Math.abs(prev - targetHeight) ? curr : prev
  )
  return Math.abs(closest - targetHeight) <= tolerance ? closest : null
}

function normalizeString(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ')
}

function extractFrontesFromEjecutado(data) {
  // Extrae frentes con formato: Calle, Altura, M2, etc.
  return data
    .filter(row => row['Calle'] && row['Altura'])
    .map(row => ({
      calle: normalizeString(row['Calle']),
      altura: parseInt(row['Altura']) || null,
      m2: parseFloat(row['M2 EJECUTADOS']) || 0,
      estado: row['Estado'] || '',
      intervencion: row['Intervención'] || '',
      materialidad: row['MATERIALIDAD'] || ''
    }))
}

function extractItemsFromCertificado(data) {
  // Extrae items con formato: Descripción, Cantidad, Ubicación
  const items = {}

  data.forEach(row => {
    const ubicacion = row['Texto Breve de Orden'] || row['Denominación de la ubicación técnica']
    const descripcion = row['Descripcion Operación'] || row['Descripción']
    const cantidad = parseFloat(row['Cantidad Realizada']) || 0

    if (!ubicacion || !descripcion) return

    const normUbicacion = normalizeString(ubicacion)
    if (!items[normUbicacion]) {
      items[normUbicacion] = []
    }

    items[normUbicacion].push({
      descripcion,
      cantidad,
      orden: row['N° de Orden'],
      unidad: ''
    })
  })

  return items
}

function compareWithTolerance(value1, value2, tolerance = 0.1) {
  // tolerance como porcentaje (0.1 = 10%)
  if (!value1 || !value2) return { match: false, diff: 0 }
  const diff = Math.abs(value1 - value2) / Math.max(value2, 1)
  return {
    match: diff <= tolerance,
    diff: ((diff) * 100).toFixed(1),
    actual: value1,
    certificado: value2
  }
}

function App() {
  const [ejecutadoData, setEjecutadoData] = useState(null)
  const [ejecutadoSheetName, setEjecutadoSheetName] = useState('')
  const [certificadoData, setCertificadoData] = useState(null)
  const [selectedJefe, setSelectedJefe] = useState(null)
  const [supabaseData, setSupabaseData] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleEjecutadoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { header: true })
        let sheetData = null
        let sheetName = null

        // Buscar hojas con "FRENTES"
        for (const name of workbook.SheetNames) {
          if (name.toUpperCase().includes('FRENTES')) {
            sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[name])
            sheetName = name
            break
          }
        }

        if (sheetData && sheetData.length > 0) {
          setEjecutadoData(sheetData)
          setEjecutadoSheetName(sheetName)
          setError(null)
        } else {
          setError('No se encontró hoja con "FRENTES" o está vacía')
        }
      } catch (err) {
        setError(`Error al leer EJECUTADO.xlsx: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleCertificadoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { header: true })

        // Buscar hoja 'cert'
        let sheetData = null
        for (const name of workbook.SheetNames) {
          if (name.toLowerCase().includes('cert')) {
            sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[name])
            break
          }
        }

        // Si no existe 'cert', usar primera hoja
        if (!sheetData) {
          sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
        }

        if (sheetData && sheetData.length > 0) {
          setCertificadoData(sheetData)
          setError(null)
        } else {
          setError('No hay datos en el archivo Certificado')
        }
      } catch (err) {
        setError(`Error al leer Certificado.xlsx: ${err.message}`)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const fetchSupabaseData = async () => {
    if (!selectedJefe) {
      setError('Selecciona un jefe de obra')
      return
    }

    if (!ejecutadoData || !certificadoData) {
      setError('Carga ambos archivos antes de consultar')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Obtener remitos del jefe
      const { data: remitos, error: remitosError } = await supabase
        .from('remitos')
        .select('*')
        .eq('jefe_obra', selectedJefe)
        .eq('tipo', 'RETIRO')

      if (remitosError) throw remitosError
      if (!remitos || remitos.length === 0) {
        setError(`No hay remitos registrados para ${selectedJefe}`)
        setLoading(false)
        return
      }

      // Obtener items de los remitos
      const remitosIds = remitos.map(r => r.id)
      const { data: items, error: itemsError } = await supabase
        .from('remito_items')
        .select('*')
        .in('remito_id', remitosIds)

      if (itemsError) throw itemsError

      // Consolidar por item y por ubicación (desde obs del remito)
      const consolidated = {}
      const byLocation = {}

      items.forEach(item => {
        const remito = remitos.find(r => r.id === item.remito_id)
        const location = normalizeString(remito?.obs || 'sin ubicación')

        // Consolidado global
        if (!consolidated[item.item_nombre]) {
          consolidated[item.item_nombre] = {
            nombre: item.item_nombre,
            unidad: item.item_unidad,
            total: 0,
            registros: []
          }
        }
        consolidated[item.item_nombre].total += item.cantidad

        // Por ubicación
        if (!byLocation[location]) {
          byLocation[location] = {}
        }
        if (!byLocation[location][item.item_nombre]) {
          byLocation[location][item.item_nombre] = 0
        }
        byLocation[location][item.item_nombre] += item.cantidad
      })

      setSupabaseData({
        remitos,
        items,
        consolidated,
        byLocation
      })

      compareData(ejecutadoData, certificadoData, consolidated, byLocation)
    } catch (err) {
      setError(`Error al consultar Supabase: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const compareData = (ejecutado, certificado, supabaseConsolidated, supabaseByLocation) => {
    const frentes = extractFrontesFromEjecutado(ejecutado)
    const certItems = extractItemsFromCertificado(certificado)

    const comparison = {
      frentes: [],
      inconsistencies: [],
      summary: {
        total_frentes: frentes.length,
        frentes_con_datos_supabase: 0,
        discrepancias_encontradas: 0
      }
    }

    // Comparar cada frente
    frentes.forEach(frente => {
      const frenteKey = `${frente.calle} ${frente.altura}`
      const certSpecsForFrente = certItems[`${frente.calle} ${frente.altura}`] || []

      // Buscar en Supabase por ubicación similar
      let supabaseItemsForFrente = {}
      Object.entries(supabaseByLocation).forEach(([location, items]) => {
        const locNorm = normalizeString(location)
        const frenteNorm = normalizeString(frenteKey)

        // Matcheo exacto o por proximidad
        if (locNorm.includes(frente.calle.substring(0, 10))) {
          const locComponents = extractAddressComponents(location)
          const frenteComponents = { calle: frente.calle, altura: frente.altura }

          if (locComponents.altura && frenteComponents.altura) {
            const closeHeight = findClosestHeight(frenteComponents.altura, [locComponents.altura])
            if (closeHeight) {
              supabaseItemsForFrente = items
            }
          }
        }
      })

      const frenteResult = {
        frente: frenteKey,
        m2: frente.m2,
        certificado: certSpecsForFrente,
        consumido_supabase: supabaseItemsForFrente,
        validaciones: [],
        discrepancias: []
      }

      if (Object.keys(supabaseItemsForFrente).length > 0) {
        comparison.summary.frentes_con_datos_supabase++

        // Validar cada item del certificado
        certSpecsForFrente.forEach(spec => {
          const consumed = supabaseItemsForFrente[spec.descripcion] || 0
          const validation = compareWithTolerance(consumed, spec.cantidad, 0.15)

          if (!validation.match) {
            frenteResult.discrepancias.push({
              item: spec.descripcion,
              certificado: spec.cantidad,
              consumido: consumed,
              diferencia: `${validation.diff}%`
            })
            comparison.summary.discrepancias_encontradas++
          } else {
            frenteResult.validaciones.push({
              item: spec.descripcion,
              certificado: spec.cantidad,
              consumido: consumed,
              estado: '✓'
            })
          }
        })
      }

      comparison.frentes.push(frenteResult)
    })

    setResults(comparison)
  }

  // Extraer opciones de jefes del archivo cargado
  const jefeOptions = ejecutadoSheetName
    ? [ejecutadoSheetName.replace(/[^a-zA-Z\s]/g, '').trim()]
    : []

  return (
    <div className="app">
      <header className="header">
        <h1>🔍 Verificador de Consumos por Frente</h1>
        <p>Compara frentes ejecutados vs certificado vs consumos en Supabase</p>
      </header>

      <main className="main">
        <section className="upload-section">
          <div className="upload-box">
            <h2>1️⃣ Cargar EJECUTADO.xlsx</h2>
            <p className="instruction">Archivo con frentes ejecutados (hoja: FRENTES)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleEjecutadoUpload}
            />
            {ejecutadoData && <p className="success">✓ Cargado ({ejecutadoData.length} frentes)</p>}
          </div>

          <div className="upload-box">
            <h2>2️⃣ Cargar Reporte de Certificado.xlsx</h2>
            <p className="instruction">Especificaciones de cada frente (hoja: cert)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleCertificadoUpload}
            />
            {certificadoData && <p className="success">✓ Cargado ({certificadoData.length} líneas)</p>}
          </div>
        </section>

        <section className="query-section">
          <h2>3️⃣ Seleccionar Jefe de Obra</h2>
          <select
            value={selectedJefe || ''}
            onChange={(e) => setSelectedJefe(e.target.value)}
          >
            <option value="">-- Selecciona un jefe --</option>
            {jefeOptions.length > 0 && jefeOptions.map((jefe, i) => (
              <option key={i} value={jefe}>{jefe}</option>
            ))}
          </select>
          <small>Nota: Ingresa el nombre del jefe manualmente si no aparece en la lista</small>
          <input
            type="text"
            placeholder="O ingresa aquí el nombre del jefe..."
            value={selectedJefe || ''}
            onChange={(e) => setSelectedJefe(e.target.value)}
            style={{ marginTop: '10px', width: '100%', padding: '8px' }}
          />

          <button
            onClick={fetchSupabaseData}
            disabled={loading || !selectedJefe}
            className="btn-primary"
          >
            {loading ? 'Consultando...' : '4️⃣ Consultar Supabase & Comparar'}
          </button>
        </section>

        {error && (
          <section className="error-section">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </section>
        )}

        {results && (
          <section className="results-section">
            <h2>📊 Resultados de Comparación</h2>

            <div className="summary">
              <h3>Resumen</h3>
              <div className="summary-stats">
                <div className="stat">
                  <span className="label">Frentes Analizados</span>
                  <span className="value">{results.summary.total_frentes}</span>
                </div>
                <div className="stat">
                  <span className="label">Con Datos Supabase</span>
                  <span className="value">{results.summary.frentes_con_datos_supabase}</span>
                </div>
                <div className="stat">
                  <span className="label">Discrepancias</span>
                  <span className="value alert">{results.summary.discrepancias_encontradas}</span>
                </div>
              </div>
            </div>

            <div className="frentes-detail">
              <h3>Detalle por Frente</h3>
              {results.frentes.map((frente, idx) => (
                <div key={idx} className="frente-card">
                  <div className="frente-header">
                    <h4>{frente.frente}</h4>
                    <span className="m2">M2: {frente.m2.toFixed(2)}</span>
                  </div>

                  {frente.validaciones.length > 0 && (
                    <div className="validaciones-ok">
                      <h5>✓ Validaciones Correctas ({frente.validaciones.length})</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Certificado</th>
                            <th>Consumido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {frente.validaciones.map((val, i) => (
                            <tr key={i} className="ok">
                              <td>{val.item}</td>
                              <td>{val.certificado.toFixed(2)}</td>
                              <td>{val.consumido.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {frente.discrepancias.length > 0 && (
                    <div className="discrepancias">
                      <h5>⚠️ Discrepancias ({frente.discrepancias.length})</h5>
                      <table>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Certificado</th>
                            <th>Consumido</th>
                            <th>Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {frente.discrepancias.map((disc, i) => (
                            <tr key={i} className="error">
                              <td>{disc.item}</td>
                              <td>{disc.certificado.toFixed(2)}</td>
                              <td>{disc.consumido.toFixed(2)}</td>
                              <td>{disc.diferencia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {Object.keys(frente.consumido_supabase).length === 0 && (
                    <p className="no-data">No hay datos de consumo en Supabase para esta ubicación</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
