// Mapeo de nombres a "grupos canónicos" de material.
//
// El certificado, el Excel de hormigón y Supabase nombran los materiales
// distinto (ej: "Contrapisos H° H17 de 8 cm" vs "HORMIGON H17"). Acá
// llevamos cualquier descripción a una clave común para poder compararlos.
//
// 👉 Este es el archivo a AJUSTAR cuando aparezcan materiales nuevos o
//    nombres que no matchean. Es la única fuente de verdad del matcheo.

// Cada regla: { key, label, test(textoNormalizado) => bool }.
// El orden importa: gana la primera que matchea.
const REGLAS = [
  // ── Hormigón por tipo ────────────────────────────────────────────────
  { key: 'HORMIGON_H8', label: 'Hormigón H8', re: /h\s*-?\s*8\b/ },
  { key: 'HORMIGON_H15', label: 'Hormigón H15', re: /h\s*-?\s*15\b/ },
  { key: 'HORMIGON_H17', label: 'Hormigón H17', re: /h\s*-?\s*17\b/ },
  { key: 'HORMIGON_H21', label: 'Hormigón H21', re: /h\s*-?\s*21\b/ },
  { key: 'HORMIGON_H30', label: 'Hormigón H30', re: /h\s*-?\s*30\b/ },

  // ── Volquetes ────────────────────────────────────────────────────────
  { key: 'VOLQUETE', label: 'Volquete', re: /volquete/ },

  // ── Asfalto ──────────────────────────────────────────────────────────
  { key: 'EMULSION', label: 'Emulsión asfáltica', re: /emulsion/ },
  { key: 'ASFALTO', label: 'Asfalto', re: /asfalto|c\s*-?\s*30|fresado/ },

  // ── Baldosas / solados ───────────────────────────────────────────────
  { key: 'BALDOSA_TACTIL', label: 'Baldosa táctil', re: /tactil/ },
  { key: 'BALDOSA', label: 'Baldosa / solado', re: /baldosa|solado|mosaico|panes/ },

  // ── Hierro / malla ───────────────────────────────────────────────────
  { key: 'MALLA', label: 'Malla / SIMA', re: /malla|sima/ },
  { key: 'HIERRO_6', label: 'Hierro Ø6', re: /hierro.*6|ø\s*6|o\s*6\b/ },
  { key: 'HIERRO_8', label: 'Hierro Ø8', re: /hierro.*8|ø\s*8|o\s*8\b/ },
  { key: 'HIERRO_10', label: 'Hierro Ø10', re: /hierro.*10|ø\s*10|o\s*10\b/ },
  { key: 'HIERRO', label: 'Hierro (otro)', re: /hierro|estribo/ },

  // ── Cordones / planteras ─────────────────────────────────────────────
  { key: 'CORDON', label: 'Cordón', re: /cordon/ },
  { key: 'PLANTERA', label: 'Plantera / viga', re: /plantera|viga/ },

  // ── Cemento / cal / arena ────────────────────────────────────────────
  { key: 'CEMENTO', label: 'Cemento', re: /cemento/ },
  { key: 'CAL', label: 'Cal', re: /\bcal\b/ },
  { key: 'ARENA', label: 'Arena', re: /arena/ },
]

import { norm } from './normalize.js'

// Devuelve { key, label } canónico para una descripción, o null si no matchea.
export function canonical(descripcion) {
  const t = norm(descripcion)
  if (!t) return null
  for (const regla of REGLAS) {
    if (regla.re.test(t)) return { key: regla.key, label: regla.label }
  }
  return null
}

// Etiqueta legible de una clave canónica.
export function labelDe(key) {
  const r = REGLAS.find((x) => x.key === key)
  return r ? r.label : key
}
