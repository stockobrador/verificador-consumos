// Muestra el resultado de la verificación: resumen, totales y detalle por frente.

const ESTADO_LABEL = {
  ok: { txt: 'OK', cls: 'ok' },
  exceso: { txt: 'Exceso', cls: 'warn' },
  falta: { txt: 'Falta', cls: 'warn' },
  falta_total: { txt: 'Sin consumo', cls: 'bad' },
  solo_consumo: { txt: 'No en certificado', cls: 'info' },
  sin_datos: { txt: '—', cls: 'muted' },
}

function Badge({ estado }) {
  const e = ESTADO_LABEL[estado] || ESTADO_LABEL.sin_datos
  return <span className={`badge ${e.cls}`}>{e.txt}</span>
}

function num(v) {
  return (v ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function FrenteCard({ frente }) {
  const titulo = `${frente.calle}${frente.altura ? ' ' + frente.altura : ''}`.toUpperCase()
  return (
    <div className="frente-card">
      <div className="frente-head">
        <h4>{titulo}</h4>
        <div className="frente-tags">
          {frente.intervencion && <span className="tag">{frente.intervencion}</span>}
          <span className="tag m2">M² {num(frente.m2)}</span>
        </div>
      </div>

      {frente.grupos.length > 0 ? (
        <table className="grupos">
          <thead>
            <tr>
              <th>Material</th>
              <th>Certificado</th>
              <th>Consumido</th>
              <th>Δ</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {frente.grupos.map((g) => (
              <tr key={g.key} className={`row-${(ESTADO_LABEL[g.estado] || {}).cls || ''}`}>
                <td>{g.label}</td>
                <td>{g.certificado ? num(g.certificado) : '—'}</td>
                <td>{g.consumido ? num(g.consumido) : '—'}</td>
                <td>{g.deltaPct == null ? '—' : `${g.deltaPct > 0 ? '+' : ''}${g.deltaPct.toFixed(0)}%`}</td>
                <td><Badge estado={g.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Sin certificado ni consumo asociado a este frente.</p>
      )}
    </div>
  )
}

export default function ResultsView({ resultado }) {
  if (!resultado) return null
  const { resumen, totales, frentes, sinFrente, periodo } = resultado

  const periodoTxt =
    (periodo.desde ? periodo.desde.toLocaleDateString('es-AR') : '—') +
    ' → ' +
    (periodo.hasta ? periodo.hasta.toLocaleDateString('es-AR') : '—')

  return (
    <section className="results">
      <div className="results-head">
        <h2>Resultado — {resultado.jo}</h2>
        <span className="periodo">{periodoTxt}</span>
      </div>

      <div className="cards">
        <div className="card"><span className="card-label">Frentes</span><span className="card-value">{resumen.frentesTotal}</span></div>
        <div className="card"><span className="card-label">Con consumo</span><span className="card-value">{resumen.frentesConConsumo}</span></div>
        <div className="card"><span className="card-label">Discrepancias</span><span className={`card-value ${resumen.discrepancias ? 'alert' : ''}`}>{resumen.discrepancias}</span></div>
      </div>

      {totales.length > 0 && (
        <div className="totales">
          <h3>Totales del período (hormigón / volquetes / asfalto)</h3>
          <div className="totales-grid">
            {totales.map((t) => (
              <div key={t.key} className="total-item">
                <span className="total-label">{t.label}</span>
                <span className="total-value">{num(t.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="sec-title">Detalle por frente</h3>
      {frentes.map((f, i) => <FrenteCard key={i} frente={f} />)}

      {(sinFrente.hormigon.length > 0 || sinFrente.panol.length > 0) && (
        <div className="sin-frente">
          <h3>⚠️ Consumos sin frente asignado</h3>
          <p className="muted">
            Estos consumos son del jefe/período pero su dirección no matcheó con ningún frente del EJECUTADO.
            Revisá la dirección/observación o agregá el frente.
          </p>
          {sinFrente.hormigon.length > 0 && (
            <>
              <h4>Hormigón / volquetes / asfalto ({sinFrente.hormigon.length})</h4>
              <ul className="sin-list">
                {sinFrente.hormigon.slice(0, 50).map((c, i) => (
                  <li key={i}>{c.tipo} · {num(c.cantidad)} · <em>{c.direccion || 'sin dirección'}</em></li>
                ))}
              </ul>
            </>
          )}
          {sinFrente.panol.length > 0 && (
            <>
              <h4>Pañol / Supabase ({sinFrente.panol.length} remitos)</h4>
              <ul className="sin-list">
                {sinFrente.panol.slice(0, 50).map((r, i) => (
                  <li key={i}><em>{r.obs || 'sin observación'}</em> · {r.items.length} items</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  )
}
