import { mismasDirecciones, fechaEnRango } from './normalize.js'
import { parseOperacion, m3Teorico, baldosaTipo } from './certOps.js'

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

function materialHormigon(texto) {
  return parseOperacion(texto).material
}

function acum(obj, key, val, extra) {
  if (!obj[key]) obj[key] = { total: 0, ...extra }
  obj[key].total += val
}

// Resumen agregado para un JO + período.
//   frentes          — frentes del EJECUTADO ya filtrados por JO
//   consumosHormigon — filas del CONTROL (se filtran por JO + fecha acá)
//   certificado      — items del certificado (todos)
//   panol            — fetchConsumosPanol (porRemito con obs)
export function buildResumen({ frentes, consumosHormigon, certificado, panol, jo, desde, hasta }) {
  const textosFrentes = frentes.map((f) => `${f.calle} ${f.altura ?? ''}`.trim())
  const matcheaFrente = (dir) => textosFrentes.some((t) => mismasDirecciones(dir, t))

  // ── 1. Certificado agregado sobre los frentes del JO ──────────────────
  // Se agrupa por la DESCRIPCIÓN REAL de la operación (no por buckets), para
  // que cada tipo del certificado se vea tal cual y sumado.
  const opsMap = {}
  const baldCert = {} // subtipo -> { total m² }
  const frentesCertificados = new Set()

  for (const row of certificado) {
    if (!matcheaFrente(row.ubicacion)) continue
    frentesCertificados.add(row.ubicacion)

    const desc = row.descripcion
    if (!opsMap[desc]) {
      const op = parseOperacion(desc)
      opsMap[desc] = {
        label: desc,
        trabajo: op.trabajo,
        material: op.material,
        espesor: op.espesor,
        esConcreto: op.esConcreto,
        m2: 0,
      }
    }
    opsMap[desc].m2 += row.cantidad

    // Baldosas del certificado por subtipo
    if (opsMap[desc].trabajo === 'solado') {
      const b = baldosaTipo(desc)
      if (b) acum(baldCert, b.key, row.cantidad, { label: b.label })
    }
  }

  const operaciones = Object.values(opsMap)
    .map((o) => ({ ...o, m3: m3Teorico(o, o.m2) }))
    .sort((a, b) => b.m2 - a.m2)

  // ── 2. Hormigón teórico (rollup por material) ─────────────────────────
  const teoricoPorMat = {}
  for (const o of operaciones) {
    if (o.material && o.m3) teoricoPorMat[o.material] = (teoricoPorMat[o.material] || 0) + o.m3
  }

  // ── 3. Hormigón consumido (CONTROL, JO + período) ─────────────────────
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

  const materiales = [...new Set([...Object.keys(teoricoPorMat), ...Object.keys(consumidoPorMat)])].sort()
  const hormigon = materiales.map((mat) => {
    const teorico = teoricoPorMat[mat] || 0
    const consumido = consumidoPorMat[mat] || 0
    return { material: mat, teorico, consumido, ...estadoDe(teorico, consumido) }
  })

  // ── 4. Pañol de Supabase — SOLO remitos que matchean un frente del JO ─
  const remitos = Object.values(panol?.porRemito || {})
  const baldCons = {} // subtipo -> { total m² }
  const panolPorItem = {} // item_nombre -> neto (solo frentes matcheados)
  let remitosMatcheados = 0

  for (const r of remitos) {
    if (!matcheaFrente(r.obs)) continue
    remitosMatcheados++
    for (const it of r.items) {
      panolPorItem[it.nombre] = (panolPorItem[it.nombre] || 0) + it.cantidad
      const b = baldosaTipo(it.nombre)
      if (b) acum(baldCons, b.key, it.cantidad, { label: b.label })
    }
  }

  // ── 5. Comparación de baldosas por subtipo ────────────────────────────
  const baldKeys = [...new Set([...Object.keys(baldCert), ...Object.keys(baldCons)])]
  const baldosas = baldKeys
    .map((key) => {
      const label = baldCert[key]?.label || baldCons[key]?.label || key
      const certM2 = baldCert[key]?.total || 0
      const consM2 = baldCons[key]?.total || 0
      return { key, label, certificadoM2: certM2, consumidoM2: consM2, ...estadoDe(certM2, consM2) }
    })
    .sort((a, b) => b.certificadoM2 - a.certificadoM2)

  const panolTotales = Object.entries(panolPorItem)
    .map(([nombre, neto]) => ({ nombre, neto }))
    .filter((x) => Math.abs(x.neto) > 0.001)
    .sort((a, b) => b.neto - a.neto)

  // ── Total retirado en el período (TODO el JO, sin filtrar por frente) ──
  const totalRetirado = Object.entries(panol?.porItem || {})
    .map(([nombre, v]) => ({
      nombre,
      unidad: v.unidad,
      retiro: v.retiro || 0,
      devuelto: v.devol || 0,
      neto: v.neto || 0,
    }))
    .filter((x) => Math.abs(x.retiro) > 0.001 || Math.abs(x.devuelto) > 0.001)
    .sort((a, b) => b.neto - a.neto)

  return {
    jo,
    periodo: { desde, hasta },
    resumen: {
      frentesTotal: frentes.length,
      frentesCertificados: frentesCertificados.size,
      registrosConsumo: hormigonJO.length,
      remitosMatcheados,
    },
    operaciones,
    hormigon,
    baldosas,
    extras: { volquetes, asfalto },
    panolTotales,
    totalRetirado,
    frentes: frentes.map((f) => {
      const texto = `${f.calle} ${f.altura ?? ''}`.trim()
      return {
        texto: texto.toUpperCase(),
        m2: f.m2,
        certificado: [...frentesCertificados].some((u) => mismasDirecciones(u, texto)),
      }
    }),
  }
}
