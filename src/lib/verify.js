import { canonical } from './itemMapping.js'
import { mismasDirecciones, fechaEnRango } from './normalize.js'
import { parseOperacion, etiquetaOperacion, claveOperacion, m3Teorico } from './certOps.js'

const TOLERANCIA = 0.15 // ±15%

function estadoDe(teorico, real) {
  if (teorico > 0 && real > 0) {
    const delta = (real - teorico) / teorico
    if (Math.abs(delta) <= TOLERANCIA) return { estado: 'ok', deltaPct: delta * 100 }
    return { estado: real > teorico ? 'exceso' : 'falta', deltaPct: delta * 100 }
  }
  if (teorico > 0 && real === 0) return { estado: 'falta_total', deltaPct: -100 }
  if (teorico === 0 && real > 0) return { estado: 'solo_consumo', deltaPct: null }
  return { estado: 'sin_datos', deltaPct: null }
}

// Extrae el tipo de hormigón (H8/H15/H17/H21/H30) de un texto libre de consumo.
function materialHormigon(texto) {
  return parseOperacion(texto).material
}

// Construye el resumen agregado para un JO + período.
//
//   frentes          — frentes del EJECUTADO ya filtrados por JO
//   consumosHormigon — filas del CONTROL (se filtran por JO + fecha acá)
//   certificado      — items del certificado (todos)
//   panol            — fetchConsumosPanol (porItem)
//   jo, desde, hasta
export function buildResumen({ frentes, consumosHormigon, certificado, panol, jo, desde, hasta }) {
  const textosFrentes = frentes.map((f) => `${f.calle} ${f.altura ?? ''}`.trim())

  // ── 1. Certificado agregado sobre los frentes del JO ──────────────────
  const opsMap = {} // claveOperacion -> { label, trabajo, material, espesor, m2, m3 }
  const frentesCertificados = new Set()

  for (const row of certificado) {
    const ubic = row.ubicacion
    if (!textosFrentes.some((t) => mismasDirecciones(ubic, t))) continue
    frentesCertificados.add(ubic)

    const op = parseOperacion(row.descripcion)
    const clave = claveOperacion(op)
    if (!opsMap[clave]) {
      opsMap[clave] = {
        label: etiquetaOperacion(op),
        trabajo: op.trabajo,
        material: op.material,
        espesor: op.espesor,
        esConcreto: op.esConcreto,
        m2: 0,
      }
    }
    opsMap[clave].m2 += row.cantidad
  }

  const operaciones = Object.values(opsMap)
    .map((o) => ({ ...o, m3: m3Teorico(o, o.m2) }))
    .sort((a, b) => b.m2 - a.m2)

  // ── 2. Hormigón teórico necesario (rollup por material) ───────────────
  const teoricoPorMat = {}
  for (const o of operaciones) {
    if (o.material && o.m3) teoricoPorMat[o.material] = (teoricoPorMat[o.material] || 0) + o.m3
  }

  // ── 3. Hormigón consumido real (CONTROL, JO + período) ────────────────
  const hormigonJO = (consumosHormigon || []).filter(
    (c) => c.jo === jo && fechaEnRango(c.fecha, desde, hasta)
  )
  const consumidoPorMat = {}
  let volquetes = 0
  let asfalto = 0
  for (const c of hormigonJO) {
    const mat = materialHormigon(c.tipo)
    if (mat) consumidoPorMat[mat] = (consumidoPorMat[mat] || 0) + c.cantidad
    else if (/volquete/i.test(c.tipo)) volquetes += c.cantidad
    else if (/asfalto|emulsion|c-?30/i.test(c.tipo)) asfalto += c.cantidad
  }

  // ── 4. Comparación de hormigón por material ───────────────────────────
  const materiales = [...new Set([...Object.keys(teoricoPorMat), ...Object.keys(consumidoPorMat)])]
    .sort()
  const hormigon = materiales.map((mat) => {
    const teorico = teoricoPorMat[mat] || 0
    const consumido = consumidoPorMat[mat] || 0
    const { estado, deltaPct } = estadoDe(teorico, consumido)
    return { material: mat, teorico, consumido, estado, deltaPct }
  })

  // ── 5. Pañol (Supabase): totales por item + solados/baldosas ──────────
  const porItem = panol?.porItem || {}
  const panolTotales = Object.entries(porItem)
    .map(([nombre, v]) => ({ nombre, unidad: v.unidad, neto: v.neto, retiro: v.retiro, devol: v.devol }))
    .filter((x) => Math.abs(x.neto) > 0.001)
    .sort((a, b) => b.neto - a.neto)

  // Solados: certificado m² vs baldosa consumida m² (Supabase)
  const soladoCertM2 = operaciones
    .filter((o) => o.trabajo === 'solado')
    .reduce((s, o) => s + o.m2, 0)
  const baldosaConsumidaM2 = panolTotales
    .filter((x) => {
      const c = canonical(x.nombre)
      return c && c.key.startsWith('BALDOSA')
    })
    .reduce((s, x) => s + x.neto, 0)
  const soladoEstado = estadoDe(soladoCertM2, baldosaConsumidaM2)

  return {
    jo,
    periodo: { desde, hasta },
    resumen: {
      frentesTotal: frentes.length,
      frentesCertificados: frentesCertificados.size,
      registrosConsumo: hormigonJO.length,
      remitosPanol: (panol?.remitos || []).length,
    },
    operaciones,
    hormigon,
    solados: {
      certificadoM2: soladoCertM2,
      consumidoM2: baldosaConsumidaM2,
      ...soladoEstado,
    },
    extras: { volquetes, asfalto },
    panolTotales,
    frentes: frentes.map((f) => ({
      texto: `${f.calle} ${f.altura ?? ''}`.trim().toUpperCase(),
      m2: f.m2,
      certificado: [...frentesCertificados].some((u) => mismasDirecciones(u, `${f.calle} ${f.altura ?? ''}`)),
    })),
  }
}
