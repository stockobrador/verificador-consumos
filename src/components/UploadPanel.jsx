// Panel de carga de los 3 Excel. Cada tarjeta muestra estado y conteo.
function UploadCard({ n, titulo, detalle, hoja, onFile, cargado, count, unidad }) {
  return (
    <div className={`upload-card ${cargado ? 'cargado' : ''}`}>
      <div className="upload-num">{n}</div>
      <div className="upload-body">
        <h3>{titulo}</h3>
        <p className="upload-detalle">{detalle}</p>
        {hoja && <p className="upload-hoja">Hoja: <code>{hoja}</code></p>}
        <input type="file" accept=".xlsx,.xls" onChange={(e) => onFile(e.target.files[0])} />
        {cargado && (
          <p className="upload-ok">✓ {count} {unidad}</p>
        )}
      </div>
    </div>
  )
}

export default function UploadPanel({ estado, onEjecutado, onControl, onCertificado }) {
  return (
    <section className="upload-panel">
      <UploadCard
        n="1"
        titulo="Frentes ejecutados"
        detalle="EJECUTADO.xlsx — frentes por jefe de obra"
        hoja="* FRENTES"
        onFile={onEjecutado}
        cargado={estado.frentes != null}
        count={estado.frentes?.length ?? 0}
        unidad="frentes"
      />
      <UploadCard
        n="2"
        titulo="Consumos hormigón / volquetes / asfalto"
        detalle="CONTROL DE HORMIGON...xlsx — consumos diarios"
        hoja="REGISTRO DE CONSUMO"
        onFile={onControl}
        cargado={estado.consumos != null}
        count={estado.consumos?.length ?? 0}
        unidad="registros"
      />
      <UploadCard
        n="3"
        titulo="Certificado"
        detalle="Reporte de certificado.xlsx — especificaciones por frente"
        hoja="cert"
        onFile={onCertificado}
        cargado={estado.certificado != null}
        count={estado.certificado?.length ?? 0}
        unidad="líneas"
      />
    </section>
  )
}
