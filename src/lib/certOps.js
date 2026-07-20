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

  // Material de hormigón: detecta CUALQUIER "H<número>" (H8, H17, H21, H25, H30…)
  // de forma dinámica, para no depender de una lista fija. Requiere la "h"
  // pegada al número (con ° o guion opcional) para no confundir con el espesor.
  const matMat = t.match(/\bh\s*°?\s*-?\s*(\d{1,3})\b/)
  const material = matMat ? 'H' + matMat[1] : null

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

// Clasifica una baldosa/solado en un subtipo común, usable tanto para las
// descripciones del certificado ("Solados Mosaico 40x40 gris en panes") como
// para los items de Supabase ("BALDOSA 40X40 64 PANES GRISES (H-15)").
// 👉 Ajustá las reglas acá si un subtipo no matchea bien.
export function baldosaTipo(texto) {
  const t = norm(texto)
  if (!/baldosa|mosaico|solado|baldoson|panes/.test(t)) return null

  if (t.includes('tactil')) return { key: 'BALD_TACTIL', label: 'Baldosa táctil' }
  if (t.includes('60x40') || t.includes('60 x 40'))
    return { key: 'BALD_60', label: 'Baldosa 60x40' }
  if (t.includes('20x20')) return { key: 'BALD_20', label: 'Baldosa 20x20' }
  if (t.includes('30x30')) return { key: 'BALD_30', label: 'Baldosa 30x30' }

  // 40x40 / mosaico en panes: separar gris de color
  if (/gris/.test(t)) return { key: 'BALD_40_GRIS', label: 'Baldosa 40x40 gris (panes)' }
  if (/color|roja|rojo|amarill|negra|negro|granitic|calcarea/.test(t))
    return { key: 'BALD_40_COLOR', label: 'Baldosa 40x40 color (panes)' }

  return { key: 'BALD_OTRO', label: 'Baldosa (otra)' }
}
