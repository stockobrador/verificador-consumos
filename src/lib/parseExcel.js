import * as XLSX from 'xlsx'
import { excelDateToJS, norm } from './normalize.js'

// Lee un File del navegador y devuelve el workbook de XLSX.
export function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = (e) => {
      try {
        resolve(XLSX.read(e.target.result, { type: 'array' }))
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// Busca una clave en una fila ignorando mayúsculas/acentos/espacios.
function pick(row, ...candidatos) {
  const keys = Object.keys(row)
  for (const cand of candidatos) {
    const objetivo = norm(cand)
    const k = keys.find((key) => norm(key) === objetivo)
    if (k != null && row[k] !== '') return row[k]
  }
  return undefined
}

// ── 1. EJECUTADO.xlsx — frentes por jefe de obra ───────────────────────────
// Cada hoja cuyo nombre contenga "FRENTES". El JO sale de la columna
// "Jefe de Obra" si existe; si no, del nombre de la hoja (fallback).
export function parseEjecutado(workbook) {
  const frentes = []

  for (const sheetName of workbook.SheetNames) {
    if (!norm(sheetName).includes('frentes')) continue

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
    const joDesdeHoja = sheetName.replace(/frentes/i, '').replace(/[._]/g, ' ').trim()

    for (const row of rows) {
      const calle = pick(row, 'Calle')
      const altura = pick(row, 'Altura')
      if (!calle && !altura) continue

      const jo = pick(row, 'Jefe de Obra', 'JO', 'Jefe') || joDesdeHoja

      frentes.push({
        jo: String(jo || '').trim(),
        calle: String(calle || '').trim(),
        altura: altura === '' || altura == null ? null : parseInt(altura, 10),
        m2: parseFloat(pick(row, 'M2 EJECUTADOS', 'M2', 'M2 EJECUTADO')) || 0,
        estado: String(pick(row, 'Estado') || '').trim(),
        intervencion: String(pick(row, 'Intervención', 'Intervencion') || '').trim(),
        materialidad: String(pick(row, 'MATERIALIDAD', 'Materialidad') || '').trim(),
        hoja: sheetName,
      })
    }
  }

  return frentes
}

// ── 2. CONTROL DE HORMIGON, VOLQUETES Y ASFALTO.xlsx ───────────────────────
// Hoja "REGISTRO DE CONSUMO": consumos diarios de hormigón / volquetes / asfalto.
export function parseControlConsumos(workbook) {
  // Elegir la hoja de detalle diario (evita el resumen "REGISTRO DE CONSUMOS")
  const sheetName =
    workbook.SheetNames.find((n) => norm(n) === 'registro de consumo') ||
    workbook.SheetNames.find((n) => norm(n).includes('registro de consumo')) ||
    workbook.SheetNames[0]

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  const consumos = []

  for (const row of rows) {
    const jefe = pick(row, 'Jefe de Obra', 'JEFE DE OBRA')
    const consumo = pick(row, 'Consumo', 'CONSUMO')
    if (!jefe || !consumo) continue

    consumos.push({
      fecha: excelDateToJS(pick(row, 'Fecha', 'FECHA')),
      obra: String(pick(row, 'Obra', 'OBRA') || '').trim(),
      jo: String(jefe).trim(),
      revisado: String(pick(row, 'Revisado', 'REVISADO') || '').trim(),
      proveedor: String(pick(row, 'Provedor', 'Proveedor', 'PROVEEDOR') || '').trim(),
      tipo: String(consumo).trim(), // "HORMIGON H17", "VOLQUETE", "ASFALTO C-30", ...
      cantidad: parseFloat(pick(row, 'Cantidad', 'CANTIDAD')) || 0,
      remito: String(pick(row, 'N° Remito', 'N° REMITO', 'Nro Remito') || '').trim(),
      direccion: String(pick(row, 'Direccion', 'DIRECCION', 'Dirección') || '').trim(),
    })
  }

  return consumos
}

// ── 3. Reporte de Certificado.xlsx — especificaciones por frente ───────────
export function parseCertificado(workbook) {
  const sheetName =
    workbook.SheetNames.find((n) => norm(n).includes('cert')) || workbook.SheetNames[0]

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  const items = []

  for (const row of rows) {
    const ubicacion =
      pick(row, 'Texto Breve de Orden') ||
      pick(row, 'Denominación de la ubicación técnica', 'Denominacion de la ubicacion tecnica')
    const descripcion = pick(row, 'Descripcion Operación', 'Descripcion Operacion', 'Descripción')
    if (!ubicacion || !descripcion) continue

    items.push({
      orden: String(pick(row, 'N° de Orden', 'Nro de Orden') || '').trim(),
      ubicacion: String(ubicacion).trim(), // contiene calle + altura
      descripcion: String(descripcion).trim(),
      cantidad: parseFloat(pick(row, 'Cantidad Realizada', 'Cantidad')) || 0,
      status: String(pick(row, 'Status Usuario Orden', 'Status') || '').trim(),
    })
  }

  return items
}

// Lista única de jefes de obra encontrados en los datos cargados.
export function jefesDeObra(frentes = [], consumos = []) {
  const set = new Set()
  frentes.forEach((f) => f.jo && set.add(f.jo))
  consumos.forEach((c) => c.jo && set.add(c.jo))
  return [...set].sort((a, b) => a.localeCompare(b))
}
