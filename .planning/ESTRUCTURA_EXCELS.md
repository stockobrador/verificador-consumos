# Estructura esperada de los 3 Excel

La web carga **3 archivos** y los cruza contra **Supabase** (StockObrador). Todo el matcheo entre
fuentes se hace por **jefe de obra**, **frente (calle + altura)** y **rango de fechas**.

---

## Fuentes de datos y qué aporta cada una

| Fuente | Qué aporta | Materiales |
|--------|-----------|------------|
| **1. EJECUTADO.xlsx** | Frentes que ejecutó cada JO | (define los frentes a analizar) |
| **2. CONTROL...xlsx** | Consumos diarios | Hormigón, Volquetes, Asfalto |
| **3. Certificado.xlsx** | Lo que *debería* llevar cada frente | Todos (especificación) |
| **Supabase** (auto) | Consumos reales de pañol | Baldosas, Hierro, Malla, Cemento, etc. |

---

## 1. EJECUTADO.xlsx — Frentes por jefe de obra

**Hoja:** cualquiera cuyo nombre contenga `FRENTES` (ej: `P.F FRENTES`).

| Columna | Obligatoria | Ejemplo | Nota |
|---------|-------------|---------|------|
| **Jefe de Obra** | ⚠️ **SÍ (agregar)** | `Pablo Franciscono` | **Debe ser el nombre COMPLETO, igual que en Supabase.** Hoy falta esta columna. |
| **Calle** | Sí | `ALVAREZ JONTE AV.` | |
| **Altura** | Sí | `2621` | |
| **M2 EJECUTADOS** | Sí | `123.45` | |
| Estado | No | `COMPLETO` | |
| Intervención | No | `Veredas` | |
| MATERIALIDAD | No | `Baldosa + Hormigón` | |

> **🔴 Punto crítico:** sin la columna **"Jefe de Obra"** con el nombre completo, la web infiere el JO
> del nombre de la hoja (`"P.F"`) y **no matchea** con los consumos ni con Supabase, que usan
> `"Pablo Franciscono"`. Es el motivo por el que hoy da 0 frentes.

---

## 2. CONTROL DE HORMIGON, VOLQUETES Y ASFALTO.xlsx — Consumos diarios

**Hoja:** `REGISTRO DE CONSUMO` (la de detalle, no el resumen `REGISTRO DE CONSUMOS`).

| Columna | Obligatoria | Ejemplo |
|---------|-------------|---------|
| **FECHA** | Sí | `45659` (serial Excel) o `20/07/2026` |
| **JEFE DE OBRA** | Sí | `Pablo Franciscono` |
| **CONSUMO** | Sí | `HORMIGON H17`, `VOLQUETE`, `ASFALTO C-30` |
| **CANTIDAD** | Sí | `6` |
| **DIRECCION** | Sí (para matchear frente) | `CAMPANA 3751` |
| OBRA / PROVEEDOR / N° REMITO | No | |

> La **DIRECCION** se usa para asignar cada consumo a su frente (calle + altura, con proximidad).

---

## 3. Reporte de Certificado.xlsx — Especificaciones por frente

**Hoja:** `cert` (o la primera).

| Columna | Obligatoria | Ejemplo |
|---------|-------------|---------|
| **Texto Breve de Orden** | Sí | `ALVAREZ JONTE AV. 2621` |
| **Descripcion Operación** | Sí | `Contrapisos H° H17 de 8 cm.espesor` |
| **Cantidad Realizada** | Sí | `38.2` |
| N° de Orden / Status | No | |

> El **"Texto Breve de Orden"** debe contener **calle + altura** para matchear con el frente.

---

## Supabase (automático) — Consumos de pañol

Se consulta solo, filtrado por **jefe de obra + rango de fechas**. No subís nada.

- Tabla `remitos`: `jefe_obra`, `tipo` (RETIRO/DEVOLUCION), `obs` (calle+altura), `fecha`.
- Tabla `remito_items`: `item_nombre`, `item_unidad`, `cantidad`.
- **Consumo neto = RETIRO − DEVOLUCION** por item.

---

## Cómo se comparan (motor de verificación)

Para el **JO + período** elegidos, por cada **frente**:

1. **Certificado** → agrupa los ítems por *grupo canónico* (Hormigón H17, Baldosa, Hierro Ø8…).
2. **Consumo real** → junta hormigón/volquetes/asfalto (Excel 2) + pañol (Supabase), matcheados
   al frente por calle+altura.
3. **Compara** cada grupo: `Certificado` vs `Consumido`, con **±15% de tolerancia**.
   - `OK` · `Exceso` · `Falta` · `Sin consumo` · `No en certificado`.
4. Los consumos que no caen en ningún frente se listan en **"sin frente asignado"**.

El diccionario de grupos canónicos vive en [`src/lib/itemMapping.js`](../src/lib/itemMapping.js) — es el
archivo a tocar cuando aparezca un material con nombre nuevo que no matchea.

---

## Nombres de jefe de obra (deben coincidir exactamente)

El nombre en **EJECUTADO** (columna JO) y en **CONTROL** (JEFE DE OBRA) debe ser el mismo que en
Supabase (`remitos.jefe_obra`). Ejemplos reales: `Pablo Franciscono`, `Sergio Arena`, `Samoel`,
`FABIAN ALVAREZ`, `Walter Hermann`.

---

*Última actualización: 2026-07-20 — tras reorganización del proyecto.*
