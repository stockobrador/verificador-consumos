import * as XLSX from 'xlsx'

const r1 = (v) => Math.round((v ?? 0) * 100) / 100
const fecha = (d) => (d ? d.toLocaleDateString('es-AR') : '')

const ESTADO_TXT = {
  ok: 'OK',
  exceso: 'Exceso',
  falta: 'Falta',
  falta_total: 'Sin consumo',
  solo_consumo: 'No certificado',
  sin_datos: '-',
}

// Exporta el resumen completo a un .xlsx con varias hojas.
export function exportarResumen(res) {
  const wb = XLSX.utils.book_new()
  const periodo = `${fecha(res.periodo.desde) || 'inicio'} a ${fecha(res.periodo.hasta) || 'hoy'}`

  // Hoja 1 — Resumen general
  const resumen = [
    { Campo: 'Jefe de obra', Valor: res.jo },
    { Campo: 'Período', Valor: periodo },
    { Campo: 'Frentes del JO', Valor: res.resumen.frentesTotal },
    { Campo: 'Frentes certificados (matcheados)', Valor: res.resumen.frentesCertificados },
    { Campo: 'Registros de consumo (hormigón)', Valor: res.resumen.registrosConsumo },
    { Campo: 'Remitos de pañol matcheados', Valor: res.resumen.remitosMatcheados },
    { Campo: 'Volquetes', Valor: r1(res.extras.volquetes) },
    { Campo: 'Asfalto', Valor: r1(res.extras.asfalto) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumen), 'Resumen')

  // Hoja 2 — Certificado por operación
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      res.operaciones.map((o) => ({
        Operación: o.label,
        'm²': r1(o.m2),
        'm³ teórico': o.m3 != null ? r1(o.m3) : '',
      }))
    ),
    'Certificado'
  )

  // Hoja 3 — Hormigón teórico vs consumido
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      res.hormigon.map((h) => ({
        Tipo: h.material,
        'Teórico m³': r1(h.teorico),
        'Consumido m³': r1(h.consumido),
        'Δ %': h.deltaPct == null ? '' : Math.round(h.deltaPct),
        Estado: ESTADO_TXT[h.estado] || h.estado,
      }))
    ),
    'Hormigón'
  )

  // Hoja 3b — Reglas de rendimiento
  if (res.reglas) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        res.reglas.map((r) => ({
          Insumo: r.insumo,
          Teórico: r1(r.teorico),
          Consumido: r1(r.consumido),
          'Δ %': r.deltaPct == null ? '' : Math.round(r.deltaPct),
          Estado: ESTADO_TXT[r.estado] || r.estado,
          Base: r.base,
        }))
      ),
      'Reglas rendimiento'
    )
  }

  // Hoja 4 — Baldosas por subtipo
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      res.baldosas.map((b) => ({
        'Tipo de baldosa': b.label,
        'Certificado m²': r1(b.certificadoM2),
        'Consumido m²': r1(b.consumidoM2),
        'Δ %': b.deltaPct == null ? '' : Math.round(b.deltaPct),
        Estado: ESTADO_TXT[b.estado] || b.estado,
      }))
    ),
    'Baldosas'
  )

  // Hoja 5 — Total retirado en el período (todo el JO)
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      res.totalRetirado.map((x) => ({
        Item: x.nombre,
        Unidad: x.unidad,
        Retirado: r1(x.retiro),
        Devuelto: r1(x.devuelto),
        Neto: r1(x.neto),
      }))
    ),
    'Total retirado'
  )

  // Hoja 6 — Frentes
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      res.frentes.map((f) => ({
        Frente: f.texto,
        'M²': r1(f.m2),
        'En certificado': f.certificado ? 'Sí' : 'No',
      }))
    ),
    'Frentes'
  )

  const jo = (res.jo || 'JO').replace(/[^a-zA-Z0-9]/g, '_')
  const hoy = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `verificacion_${jo}_${hoy}.xlsx`)
}
