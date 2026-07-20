// Resumen agregado: certificado por tipo de operación vs consumo del jefe de obra.

const ESTADO = {
  ok: { txt: 'OK', cls: 'ok' },
  exceso: { txt: 'Exceso', cls: 'warn' },
  falta: { txt: 'Falta', cls: 'warn' },
  falta_total: { txt: 'Sin consumo', cls: 'bad' },
  solo_consumo: { txt: 'No certificado', cls: 'info' },
  sin_datos: { txt: '—', cls: 'muted' },
}

function Badge({ estado }) {
  const e = ESTADO[estado] || ESTADO.sin_datos
  return <span className={`badge ${e.cls}`}>{e.txt}</span>
}

const n = (v, d = 1) =>
  (v ?? 0).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })

export default function ResultsView({ resultado }) {
  if (!resultado) return null
  const { resumen, operaciones, hormigon, solados, extras, panolTotales, frentes, periodo } = resultado

  const periodoTxt =
    (periodo.desde ? periodo.desde.toLocaleDateString('es-AR') : 'inicio') +
    ' → ' +
    (periodo.hasta ? periodo.hasta.toLocaleDateString('es-AR') : 'hoy')

  return (
    <section className="results">
      <div className="results-head">
        <h2>Resumen — {resultado.jo}</h2>
        <span className="periodo">{periodoTxt}</span>
      </div>

      <div className="cards">
        <div className="card"><span className="card-label">Frentes del JO</span><span className="card-value">{resumen.frentesTotal}</span></div>
        <div className="card"><span className="card-label">Certificados (matcheados)</span><span className="card-value">{resumen.frentesCertificados}</span></div>
        <div className="card"><span className="card-label">Registros consumo</span><span className="card-value">{resumen.registrosConsumo}</span></div>
      </div>

      {/* ── Certificado por tipo de operación ── */}
      <h3 className="sec-title">Certificado — items de los frentes (sumados por tipo)</h3>
      <table className="grupos">
        <thead>
          <tr><th>Operación</th><th>m²</th><th>m³ teórico</th></tr>
        </thead>
        <tbody>
          {operaciones.map((o, i) => (
            <tr key={i}>
              <td>{o.label}</td>
              <td>{n(o.m2)}</td>
              <td>{o.m3 != null ? n(o.m3) : '—'}</td>
            </tr>
          ))}
          {operaciones.length === 0 && (
            <tr><td colSpan={3} className="muted">Ningún frente del JO matcheó con el certificado (revisá direcciones / columna Jefe de Obra).</td></tr>
          )}
        </tbody>
      </table>

      {/* ── Comparación de hormigón ── */}
      <h3 className="sec-title">Hormigón — teórico (certificado) vs consumido (JO)</h3>
      <table className="grupos">
        <thead>
          <tr><th>Tipo</th><th>Teórico m³</th><th>Consumido m³</th><th>Δ</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {hormigon.map((h) => (
            <tr key={h.material} className={`row-${(ESTADO[h.estado] || {}).cls || ''}`}>
              <td>{h.material}</td>
              <td>{h.teorico ? n(h.teorico) : '—'}</td>
              <td>{h.consumido ? n(h.consumido) : '—'}</td>
              <td>{h.deltaPct == null ? '—' : `${h.deltaPct > 0 ? '+' : ''}${h.deltaPct.toFixed(0)}%`}</td>
              <td><Badge estado={h.estado} /></td>
            </tr>
          ))}
          {hormigon.length === 0 && (
            <tr><td colSpan={5} className="muted">Sin datos de hormigón.</td></tr>
          )}
        </tbody>
      </table>
      <p className="nota">
        m³ teórico = m² del certificado × espesor. La diferencia (Δ) es el sobreconsumo/faltante real.
        El consumo se cuenta solo dentro del período elegido.
      </p>

      {/* ── Solados / baldosas ── */}
      {(solados.certificadoM2 > 0 || solados.consumidoM2 > 0) && (
        <>
          <h3 className="sec-title">Solados / baldosas — certificado vs consumido (Supabase)</h3>
          <table className="grupos">
            <thead><tr><th>Certificado m²</th><th>Consumido m²</th><th>Δ</th><th>Estado</th></tr></thead>
            <tbody>
              <tr className={`row-${(ESTADO[solados.estado] || {}).cls || ''}`}>
                <td>{n(solados.certificadoM2)}</td>
                <td>{n(solados.consumidoM2)}</td>
                <td>{solados.deltaPct == null ? '—' : `${solados.deltaPct > 0 ? '+' : ''}${solados.deltaPct.toFixed(0)}%`}</td>
                <td><Badge estado={solados.estado} /></td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* ── Extras ── */}
      {(extras.volquetes > 0 || extras.asfalto > 0) && (
        <div className="totales">
          <h3>Otros consumos del período</h3>
          <div className="totales-grid">
            {extras.volquetes > 0 && <div className="total-item"><span className="total-label">Volquetes</span><span className="total-value">{n(extras.volquetes, 0)}</span></div>}
            {extras.asfalto > 0 && <div className="total-item"><span className="total-label">Asfalto</span><span className="total-value">{n(extras.asfalto)}</span></div>}
          </div>
        </div>
      )}

      {/* ── Pañol detalle ── */}
      {panolTotales.length > 0 && (
        <details className="panol-detalle">
          <summary>Consumo de pañol (Supabase) — {panolTotales.length} items</summary>
          <table className="grupos">
            <thead><tr><th>Item</th><th>Unidad</th><th>Neto</th></tr></thead>
            <tbody>
              {panolTotales.map((x, i) => (
                <tr key={i}><td>{x.nombre}</td><td>{x.unidad}</td><td>{n(x.neto)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {/* ── Frentes ── */}
      <details className="panol-detalle">
        <summary>Frentes del JO ({frentes.length}) — matcheo con certificado</summary>
        <ul className="sin-list">
          {frentes.map((f, i) => (
            <li key={i}>{f.certificado ? '✓' : '✗'} {f.texto} · M² {n(f.m2)}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
