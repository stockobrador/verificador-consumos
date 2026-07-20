import { canonical, labelDe } from './itemMapping.js'
import { mismasDirecciones, fechaEnRango, parseDireccion } from './normalize.js'

const TOLERANCIA = 0.15 // ±15% para considerar "OK" una cantidad

// Suma en un acumulador { [key]: number }
function acumular(acc, key, cant) {
  acc[key] = (acc[key] || 0) + cant
}

// Determina estado comparando consumido vs certificado.
function estadoDe(cert, cons) {
  if (cert > 0 && cons > 0) {
    const delta = (cons - cert) / cert
    if (Math.abs(delta) <= TOLERANCIA) return { estado: 'ok', deltaPct: delta * 100 }
    return { estado: cons > cert ? 'exceso' : 'falta', deltaPct: delta * 100 }
  }
  if (cert > 0 && cons === 0) return { estado: 'falta_total', deltaPct: -100 }
  if (cert === 0 && cons > 0) return { estado: 'solo_consumo', deltaPct: null }
  return { estado: 'sin_datos', deltaPct: null }
}

// Construye el modelo de verificación completo para un JO + período.
//
// Params:
//   frentes         — frentes del EJECUTADO ya filtrados por JO
//   consumosHormigon— filas del CONTROL (todas; acá filtramos por JO + fecha)
//   certificado     — items del certificado (todos)
//   panol           — resultado de fetchConsumosPanol (porRemito)
//   jo, desde, hasta
export function buildVerificacion({ frentes, consumosHormigon, certificado, panol, jo, desde, hasta }) {
  // 1. Consumos de hormigón/volquetes/asfalto del JO en el período
  const hormigonJO = (consumosHormigon || []).filter(
    (c) => c.jo === jo && fechaEnRango(c.fecha, desde, hasta)
  )

  // 2. Consumos de pañol por remito (ya vienen filtrados por JO + fechas de Supabase)
  const remitosPanol = Object.values(panol?.porRemito || {})

  // Marcadores de asignación para detectar consumos "sin frente"
  const hormigonAsignado = new Array(hormigonJO.length).fill(false)
  const panolAsignado = new Array(remitosPanol.length).fill(false)

  const frentesResultado = frentes.map((f) => {
    const texto = `${f.calle} ${f.altura ?? ''}`.trim()

    // ── Certificado del frente ──────────────────────────────────────────
    const cert = {} // key -> cantidad
    const certDetalle = []
    for (const item of certificado) {
      if (!mismasDirecciones(item.ubicacion, texto)) continue
      const c = canonical(item.descripcion)
      certDetalle.push({ ...item, grupo: c?.key || null })
      if (c) acumular(cert, c.key, item.cantidad)
    }

    // ── Consumo hormigón/volquetes/asfalto del frente ───────────────────
    const cons = {} // key -> cantidad
    const hormigonDetalle = []
    hormigonJO.forEach((c, i) => {
      if (!mismasDirecciones(c.direccion, texto)) return
      hormigonAsignado[i] = true
      const g = canonical(c.tipo)
      hormigonDetalle.push({ ...c, grupo: g?.key || null })
      if (g) acumular(cons, g.key, c.cantidad)
    })

    // ── Consumo de pañol del frente (Supabase) ──────────────────────────
    const panolDetalle = []
    remitosPanol.forEach((r, i) => {
      if (!mismasDirecciones(r.obs, texto)) return
      panolAsignado[i] = true
      for (const it of r.items) {
        const g = canonical(it.nombre)
        panolDetalle.push({ ...it, grupo: g?.key || null, obs: r.obs })
        if (g) acumular(cons, g.key, it.cantidad)
      }
    })

    // ── Merge de grupos ────────────────────────────────────────────────
    const keys = [...new Set([...Object.keys(cert), ...Object.keys(cons)])]
    const grupos = keys
      .map((key) => {
        const certVal = cert[key] || 0
        const consVal = cons[key] || 0
        const { estado, deltaPct } = estadoDe(certVal, consVal)
        return { key, label: labelDe(key), certificado: certVal, consumido: consVal, estado, deltaPct }
      })
      .sort((a, b) => a.label.localeCompare(b.label))

    return {
      calle: f.calle,
      altura: f.altura,
      m2: f.m2,
      intervencion: f.intervencion,
      grupos,
      certDetalle,
      hormigonDetalle,
      panolDetalle,
      tieneConsumo: hormigonDetalle.length > 0 || panolDetalle.length > 0,
      tieneCert: certDetalle.length > 0,
    }
  })

  // ── Consumos que no cayeron en ningún frente ──────────────────────────
  const sinFrente = {
    hormigon: hormigonJO.filter((_, i) => !hormigonAsignado[i]),
    panol: remitosPanol.filter((_, i) => !panolAsignado[i]),
  }

  // ── Totales del período ───────────────────────────────────────────────
  const totales = {}
  hormigonJO.forEach((c) => {
    const g = canonical(c.tipo)
    if (g) acumular(totales, g.key, c.cantidad)
  })

  return {
    jo,
    periodo: { desde, hasta },
    frentes: frentesResultado,
    sinFrente,
    totales: Object.entries(totales)
      .map(([key, val]) => ({ key, label: labelDe(key), total: val }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    resumen: {
      frentesTotal: frentesResultado.length,
      frentesConConsumo: frentesResultado.filter((f) => f.tieneConsumo).length,
      discrepancias: frentesResultado.reduce(
        (n, f) => n + f.grupos.filter((g) => ['exceso', 'falta', 'falta_total'].includes(g.estado)).length,
        0
      ),
    },
  }
}
