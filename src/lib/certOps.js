import { norm } from './normalize.js'

// Clasifica una "Descripcion Operación" del certificado en:
//   - trabajo:  contrapiso | acera | vado | cordon | plantera | solado | otro
//   - material: H8 | H15 | H17 | H21 | H30 | null  (tipo de hormigón)
//   - espesor:  cm (número) | null
//   - esConcreto: si tiene material de hormigón
//
// Con material + espesor se calcula el m³ teórico = m² × (espesor/100).

export function parseOperacion(desc) {
  const t = norm(desc)

  // Material de hormigón (requiere "h" seguido del número; evita agarrar "15cm")
  let material = null
  if (/h\s*-?\s*8\b/.test(t)) material = 'H8'
  else if (/h\s*-?\s*15\b/.test(t)) material = 'H15'
  else if (/h\s*-?\s*17\b/.test(t)) material = 'H17'
  else if (/h\s*-?\s*21\b/.test(t)) material = 'H21'
  else if (/h\s*-?\s*30\b/.test(t)) material = 'H30'

  // Espesor: "de 8 cm", "de 12cm", "de 13cm"
  const esp = t.match(/de\s*(\d{1,2})\s*cm/)
  const espesor = esp ? parseInt(esp[1], 10) : null

  // Tipo de trabajo
  let trabajo = 'otro'
  if (t.includes('contrapiso')) trabajo = 'contrapiso'
  else if (t.includes('acera')) trabajo = 'acera'
  else if (t.includes('vado')) trabajo = 'vado'
  else if (t.includes('cordon')) trabajo = 'cordon'
  else if (t.includes('plantera')) trabajo = 'plantera'
  else if (t.includes('solado') || t.includes('mosaico') || t.includes('baldos')) trabajo = 'solado'

  return {
    trabajo,
    material,
    espesor,
    esConcreto: Boolean(material),
    descripcion: String(desc || '').trim(),
  }
}

// Etiqueta legible del tipo de operación (para agrupar en el resumen).
// Ej: "Contrapiso H17 8cm", "Acera H21 13cm", "Solado".
export function etiquetaOperacion({ trabajo, material, espesor }) {
  const cap = trabajo.charAt(0).toUpperCase() + trabajo.slice(1)
  const partes = [cap]
  if (material) partes.push(material)
  if (espesor) partes.push(`${espesor}cm`)
  return partes.join(' ')
}

// Clave estable para agrupar operaciones iguales.
export function claveOperacion({ trabajo, material, espesor }) {
  return `${trabajo}|${material || '-'}|${espesor || '-'}`
}

// m³ teórico de hormigón de una operación: m² × espesor/100 (solo si es concreto y tiene espesor).
export function m3Teorico({ esConcreto, espesor }, m2) {
  if (!esConcreto || !espesor) return null
  return m2 * (espesor / 100)
}
