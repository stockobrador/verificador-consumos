# Estructura Esperada de los 3 Excel

La web espera 3 archivos Excel con estructura específica. Aquí se detallan las columnas y formatos requeridos.

---

## 1. EJECUTADO.xlsx — Frentes Ejecutados por Jefe

**Descripción:** Documento con los frentes que cada jefe de obra ejecutó. Debe tener una hoja por jefe o consolidado.

**Ubicación esperada:** Hojas nombradas con patrón `[INICIAL] FRENTES` 
- Ejemplo: `P.F FRENTES`, `S.A FRENTES`, `S.C FRENTES`

**Columnas requeridas:**

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| **Calle** | Texto | Nombre de la calle/avenida | `ALVAREZ JONTE AV.` |
| **Altura** | Número | Número de altura | `2621` |
| **M2 EJECUTADOS** | Número decimal | Metros cuadrados ejecutados | `123.45` |
| **Estado** | Texto | Estado del frente | `Completado`, `En progreso` |
| **Intervención** | Texto | Tipo de intervención | `Veredas`, `Cordón`, `Desagüe` |
| **MATERIALIDAD** | Texto | Materiales usados (opcional) | `Baldosa + Hormigón` |

**Nota:** La combinación **Calle + Altura** es la clave para matchear con Certificado y Supabase.

---

## 2. CONTROL DE HORMIGON, VOLQUETES Y ASFALTO.xlsx — Consumos de Materiales

**Descripción:** Registro diario de consumos de cada jefe de obra durante la ejecución.

**Ubicación esperada:** Hoja `REGISTRO DE CONSUMO`

**Columnas requeridas:**

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| **FECHA** | Fecha/Número serial | Fecha del consumo | `45659` (Excel serial) o `2026-07-20` |
| **OBRA** | Texto | Obra a la que pertenece | `VEREDAS`, `PREVIAL` |
| **JEFE DE OBRA** | Texto | Nombre del jefe que consumió | `Sergio Arena`, `Pablo Franciscono` |
| **REVISADO** | Texto | Estado de revisión | `OK`, `REVISAR`, `PENDIENTE` |
| **PROVEEDOR** | Texto | Proveedor del material | `POLIMIX`, `FERRIMIX`, `VOLQUETES VOLCALE` |
| **CONSUMO** | Texto | Tipo/Descripción de consumo | `HORMIGON H17`, `VOLQUETE`, `ASFALTO C-30` |
| **CANTIDAD** | Número decimal | Cantidad consumida | `6.0`, `2.5` |
| **N° REMITO** | Texto | Número de remito (opcional) | `75211`, `39799` |
| **N° DE FACTURA** | Texto | Número de factura (opcional) | _(puede estar vacío)_ |
| **DIRECCION** | Texto | Dirección exacta (opcional) | `DONATO ALVAREZ 1899` |

**Nota:** Esta hoja es auxiliar; los datos reales se traen de Supabase (tabla `remitos` + `remito_items`).

---

## 3. Reporte de Certificado.XLSX — Especificaciones de Frentes

**Descripción:** Certificado oficial de obra con especificaciones de qué debe tener cada frente.

**Ubicación esperada:** Hoja `cert` (primera hoja)

**Columnas requeridas:**

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| **Clase de Orden** | Texto | Clasificación (ej: ACME) | `ACME` |
| **N° de Orden** | Número | Número único de orden | `5519672` |
| **Texto Breve de Orden** | Texto | Descripción corta (CLAVE para matcheo) | `ALVAREZ JONTE AV. 2621` |
| **Pto.tbjo.responsable** | Texto | Centro de costo/responsable | `ERYM3GVA` |
| **Denominación de la ubicación técnica** | Texto | Ubicación técnica | `ALVAREZ JONTE AV. 2621` |
| **Clave de Modelo** | Texto | Código de ítem | `A160103`, `A050102` |
| **Descripcion Operación** | Texto | Descripción del trabajo/material | `Hormigón H17 de 8cm espesor`, `Baldosa 40x40 granitica` |
| **Cantidad Realizada** | Número decimal | Cantidad que debe ejecutarse | `38.2` |
| **Precio Unitario** | Número decimal | Precio unitario (opcional) | `0` o valor |
| **Valor Neto** | Número decimal | Valor total (opcional) | `0` o valor |
| **Status Usuario Orden** | Texto | Estado de orden | `VERI`, `INSP`, `APROBADO` |

**Nota:** El **"Texto Breve de Orden"** debe contener **Calle + Altura** para poder matchear con EJECUTADO.xlsx.

---

## Mapeo de Datos — Flujo de Comparación

```
EJECUTADO.xlsx (Frente A)
  ↓ Calle: ALVAREZ JONTE AV.
  ↓ Altura: 2621
  ↓ M2: 123.45
  │
  ├─→ Reporte Certificado.xlsx
  │   └─ "ALVAREZ JONTE AV. 2621"
  │      └─ Items que debe tener:
  │         • Hormigón H17: 38.2 m³
  │         • Baldosa 40x40: 149.76 m²
  │         • Hierro Ø8MM: 30 unid
  │         • etc.
  │
  └─→ Supabase (consumos reales del jefe)
      └─ Remitos de ese jefe en esa dirección
         └─ Items que consumió:
            • Hormigón H17: 40.0 m³ ⚠️ (certificado 38.2)
            • Baldosa 40x40: 145.0 m² ⚠️ (certificado 149.76)
            • Hierro Ø8MM: 30 unid ✓ (coincide)
```

---

## Formato de Fechas

- **EJECUTADO.xlsx:** No usa fechas
- **CONTROL DE HORMIGON:** 
  - Formato Excel serial (números): `45659`, `45660`
  - O texto: `2026-07-20`, `20/07/2026`
- **Reporte Certificado:** No usa fechas

---

## Validaciones en la Web

La web validará:
1. ✓ Que los Excel tengan las hojas esperadas
2. ✓ Que las columnas clave estén presentes
3. ✓ Que haya datos en las filas
4. ✓ Que se puedan hacer matcheos (Calle+Altura existe en ambos)
5. ✗ Errores → mostrar mensaje claro al usuario

---

## Ejemplo: Flujo Completo

**Usuario sube:**
1. EJECUTADO.xlsx → Hoja `P.F FRENTES` con Pablo Franciscono
2. CONTROL DE HORMIGON.xlsx → Registros de Pablo con consumos diarios
3. Reporte Certificado.xlsx → Especificaciones de cada frente

**Usuario selecciona:** Pablo Franciscono

**Web hace:**
1. Lee EJECUTADO.xlsx → obtiene frentes: `ALVAREZ JONTE 2621`, `CESAR DIAZ 3176`, etc.
2. Lee Certificado.xlsx → obtiene especificaciones de esos frentes
3. Query Supabase → obtiene consumos reales de Pablo
4. Compara:
   - ¿Los items que consumió en Supabase están en el Certificado?
   - ¿Las cantidades son razonables (tolerance ±10%)?
   - ¿Hay items en el Certificado que NO consumió?
5. Genera reporte visual

---

## Notas Importantes

- **Calle + Altura = Clave única** para matcheo entre los 3 archivos
- Supabase almacena calle/altura en el campo `obs` (observación) del remito
- Validar **por proximidad**: si Altura en Excel es 2621 y en Supabase es 2620, considerar como mismo frente
- Los consumos en Supabase pueden tener decimales; usar tolerancia razonable en comparaciones
