// Reglas de rendimiento (consumo teórico esperado según lo ejecutado).
// 👉 Ajustá estos coeficientes acá si cambian los rendimientos de obra.

export const REGLAS = {
  // Cada X m² de baldosas se usan estos insumos:
  BALDOSA_UNIDAD_M2: 25,
  ARENA_BOLSON_POR_UNIDAD: 1, // 1 bolsón de arena cada 25 m²
  CEMENTO_BOLSAS_POR_UNIDAD: 6, // 6 bolsas de cemento cada 25 m²
  CAL_BOLSAS_POR_UNIDAD: 6, // 6 bolsas de cal cada 25 m²

  // Cada X m² de solado o acera ejecutada => 1 volquete
  VOLQUETE_CADA_M2: 25,

  // Estimado de hormigón H21 por metro lineal de cordón (sección ~0,15×0,40).
  // Ajustable según el cordón real.
  H21_M3_POR_ML_CORDON: 0.06,
}

// Suma neto de los items de pañol (por nombre) que matchean un patrón.
export function sumaPorNombre(panolPorItem, regex) {
  let total = 0
  for (const [nombre, neto] of Object.entries(panolPorItem)) {
    if (regex.test(nombre.toLowerCase())) total += neto
  }
  return total
}
