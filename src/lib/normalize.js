// Utilidades de normalización, direcciones y fechas.
// Todo el matcheo entre archivos y Supabase pasa por acá.

// Limpia mojibake típico de Excel mal codificado (Latin-1 leído como UTF-8).
// "Contrapisos HÂº H17" -> "Contrapisos H° H17" ; "caÃ±os" -> "caños".
const MOJIBAKE = [
  [/HÂ[º°]/g, 'H°'], [/Â°/g, '°'], [/Âº/g, 'º'],
  [/Ã±/g, 'ñ'], [/Ã‘/g, 'Ñ'], [/Ã˜/g, 'Ø'], [/Ã˜/g, 'Ø'],
  [/Ã©/g, 'é'], [/Ã³/g, 'ó'], [/Ã¡/g, 'á'], [/Ã­/g, 'í'], [/Ãº/g, 'ú'], [/Ã¼/g, 'ü'],
  [/Â/g, ''], // Â sobrante
]
export function limpiarTexto(str) {
  let s = String(str ?? '')
  for (const [re, rep] of MOJIBAKE) s = s.replace(re, rep)
  return s.replace(/\s+/g, ' ').trim()
}

// Normaliza texto: minúsculas, sin acentos, espacios colapsados.
export function norm(str) {
  if (str == null) return ''
  return String(str)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrae { calle, altura } de un texto tipo "ALVAREZ JONTE AV. 2621".
// Toma la ÚLTIMA secuencia de dígitos como altura (evita agarrar "40x40" u otros números).
export function parseDireccion(texto) {
  const limpio = norm(texto)
  if (!limpio) return { calle: '', altura: null }

  // Buscar todos los números; usar el primero que parezca altura de calle (>= 1 dígito)
  const matches = [...limpio.matchAll(/(\d{1,6})/g)].map((m) => ({
    valor: parseInt(m[1], 10),
    idx: m.index,
  }))

  if (matches.length === 0) return { calle: limpio, altura: null }

  // La altura suele ser el primer número que aparece luego del nombre de calle.
  const alturaMatch = matches[0]
  const calle = limpio.slice(0, alturaMatch.idx).trim()
  return {
    calle: calle || limpio,
    altura: alturaMatch.valor,
  }
}

// Palabras significativas de un nombre de calle (sin puntuación, sin palabras cortas).
// "CABEZON, JOSE LEON" -> ["cabezon","jose","leon"] ; "SEGUROLA AV." -> ["segurola"]
const STOPWORDS = new Set(['av', 'ave', 'avda', 'avenida', 'de', 'del', 'la', 'las', 'los', 'el'])
function calleTokens(calle) {
  return norm(calle)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

// ¿Los nombres de calle coinciden? Compara por palabras (tolera comas, nombres
// invertidos y palabras de más): matchea si ≥60% de las palabras de la más corta
// están en la otra.
function callesCoinciden(a, b) {
  const ta = calleTokens(a)
  const tb = calleTokens(b)
  if (!ta.length || !tb.length) return false
  const setB = new Set(tb)
  const comunes = ta.filter((w) => setB.has(w)).length
  return comunes / Math.min(ta.length, tb.length) >= 0.6
}

// ¿Dos direcciones son el mismo frente? Calle por palabras + altura por proximidad.
// Tolera rangos de altura ("3540/42") porque parseDireccion toma el primer número.
export function mismasDirecciones(a, b, toleranciaAltura = 50) {
  const da = parseDireccion(a)
  const db = parseDireccion(b)

  if (!da.calle || !db.calle) return false
  if (!callesCoinciden(da.calle, db.calle)) return false

  // Altura: si alguna no tiene, aceptar solo por calle. Si ambas tienen, proximidad.
  if (da.altura == null || db.altura == null) return true
  return Math.abs(da.altura - db.altura) <= toleranciaAltura
}

// Clave canónica de un frente para agrupar: "calle|altura"
export function claveFrente(texto) {
  const { calle, altura } = parseDireccion(texto)
  return `${calle}|${altura ?? '?'}`
}

// Convierte una celda de fecha de Excel a Date de JS.
// Soporta serial de Excel (número), Date nativa y strings ISO / dd/mm/yyyy.
export function excelDateToJS(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return value

  // Serial de Excel (días desde 1899-12-30)
  if (typeof value === 'number') {
    const ms = Math.round((value - 25569) * 86400 * 1000)
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }

  const s = String(value).trim()

  // dd/mm/yyyy o dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (m) {
    const [, dd, mm, yy] = m
    const year = yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10)
    const d = new Date(year, parseInt(mm, 10) - 1, parseInt(dd, 10))
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// ¿Una fecha cae dentro del rango [desde, hasta] (inclusive)? Rango abierto si falta un extremo.
export function fechaEnRango(fecha, desde, hasta) {
  if (!fecha) return false
  if (desde && fecha < desde) return false
  if (hasta && fecha > hasta) return false
  return true
}

// Parsea un <input type="date"> (yyyy-mm-dd) a Date local, o null.
export function inputDateToJS(value, finDelDia = false) {
  if (!value) return null
  const [y, m, d] = value.split('-').map((n) => parseInt(n, 10))
  if (!y || !m || !d) return null
  return finDelDia
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0)
}
