import { supabase } from '../config/supabase.js'

// Formatea Date -> 'yyyy-mm-dd' para comparar contra la columna fecha (date) de Supabase.
function ymd(date) {
  if (!date) return null
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Trae los consumos de pañol (baldosas, hierro, cemento, etc.) de un jefe de obra
// en un rango de fechas. Consumo neto = RETIRO - DEVOLUCION por item.
//
// Devuelve:
//   {
//     remitos: [...],                     // remitos crudos del período
//     porItem: { itemNombre: {unidad, retiro, devol, neto} },
//     porRemito: { remito_id: {obs, tipo, fecha, items:[{nombre,unidad,cantidad}]} }
//   }
export async function fetchConsumosPanol(jo, desde, hasta) {
  if (!supabase) throw new Error('Supabase no está configurado (faltan variables de entorno)')
  if (!jo) throw new Error('Falta el jefe de obra')

  // 1. Remitos del jefe en el rango (RETIRO y DEVOLUCION)
  let query = supabase
    .from('remitos')
    .select('id, jefe_obra, tipo, obs, fecha, obra_madre, nro_remito')
    .eq('jefe_obra', jo)
    .in('tipo', ['RETIRO', 'DEVOLUCION'])

  const desdeStr = ymd(desde)
  const hastaStr = ymd(hasta)
  if (desdeStr) query = query.gte('fecha', desdeStr)
  if (hastaStr) query = query.lte('fecha', hastaStr)

  const { data: remitos, error: errRemitos } = await query
  if (errRemitos) throw errRemitos

  if (!remitos || remitos.length === 0) {
    return { remitos: [], porItem: {}, porRemito: {} }
  }

  // 2. Items de esos remitos (en lotes para no exceder límites de URL)
  const ids = remitos.map((r) => r.id)
  const items = []
  const lote = 100
  for (let i = 0; i < ids.length; i += lote) {
    const chunk = ids.slice(i, i + lote)
    const { data, error } = await supabase
      .from('remito_items')
      .select('remito_id, item_nombre, item_unidad, cantidad')
      .in('remito_id', chunk)
    if (error) throw error
    if (data) items.push(...data)
  }

  // 3. Consolidar
  const remitoById = Object.fromEntries(remitos.map((r) => [r.id, r]))
  const porItem = {}
  const porRemito = {}

  for (const it of items) {
    const remito = remitoById[it.remito_id]
    if (!remito) continue
    const signo = remito.tipo === 'DEVOLUCION' ? -1 : 1
    const cant = (parseFloat(it.cantidad) || 0)

    // Por item (global del período)
    if (!porItem[it.item_nombre]) {
      porItem[it.item_nombre] = { unidad: it.item_unidad, retiro: 0, devol: 0, neto: 0 }
    }
    if (signo > 0) porItem[it.item_nombre].retiro += cant
    else porItem[it.item_nombre].devol += cant
    porItem[it.item_nombre].neto += signo * cant

    // Por remito (para agrupar por frente vía obs)
    if (!porRemito[it.remito_id]) {
      porRemito[it.remito_id] = {
        obs: remito.obs || '',
        tipo: remito.tipo,
        fecha: remito.fecha,
        nro_remito: remito.nro_remito,
        items: [],
      }
    }
    porRemito[it.remito_id].items.push({
      nombre: it.item_nombre,
      unidad: it.item_unidad,
      cantidad: signo * cant,
    })
  }

  return { remitos, porItem, porRemito }
}
