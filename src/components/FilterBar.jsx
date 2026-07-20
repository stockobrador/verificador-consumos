// Filtros: jefe de obra + rango de fechas. Dispara la verificación.
export default function FilterBar({
  jefes,
  jo,
  setJo,
  desde,
  setDesde,
  hasta,
  setHasta,
  onVerificar,
  loading,
  puedeVerificar,
}) {
  return (
    <section className="filter-bar">
      <div className="filter-field">
        <label>Jefe de obra</label>
        <select value={jo} onChange={(e) => setJo(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {jefes.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label>Desde</label>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </div>

      <div className="filter-field">
        <label>Hasta</label>
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      <button className="btn-verificar" onClick={onVerificar} disabled={loading || !puedeVerificar}>
        {loading ? 'Verificando…' : 'Verificar consumos'}
      </button>
    </section>
  )
}
