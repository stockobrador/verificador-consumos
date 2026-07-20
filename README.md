# 🔍 Verificador de Consumos por Frente

Web para validar que los frentes ejecutados por jefes de obra coincidan con:
1. Las especificaciones del certificado de obra
2. Los consumos reales registrados en Supabase

---

## 🚀 Instalación y Uso

### Instalar dependencias
```bash
npm install
```

### Ejecutar en desarrollo
```bash
npm run dev
```

Luego abre [http://localhost:5173](http://localhost:5173) en tu navegador.

### Build para producción
```bash
npm run build
```

---

## 📋 Estructura Esperada de los 3 Excel

### 1️⃣ EJECUTADO.xlsx — Frentes Ejecutados

**Hoja requerida:** Cualquiera que contenga "FRENTES" en el nombre  
Ejemplo: `P.F FRENTES`, `S.A FRENTES`, `S.C FRENTES`

**Columnas requeridas:**
| Columna | Tipo | Ejemplo |
|---------|------|---------|
| **Calle** | Texto | `ALVAREZ JONTE AV.` |
| **Altura** | Número | `2621` |
| **M2 EJECUTADOS** | Número decimal | `123.45` |
| **Estado** | Texto | `Completado` |
| **Intervención** | Texto | `Veredas` |
| **MATERIALIDAD** | Texto | `Baldosa + Hormigón` |

**Nota:** **Calle + Altura** es la clave para matchear con certificado y Supabase.

---

### 2️⃣ Reporte de Certificado.xlsx — Especificaciones

**Hoja requerida:** Cualquiera con "cert" en el nombre (ej: `cert`), o primera hoja si no existe

**Columnas requeridas:**
| Columna | Tipo | Ejemplo |
|---------|------|---------|
| **Texto Breve de Orden** | Texto | `ALVAREZ JONTE AV. 2621` |
| **Descripcion Operación** | Texto | `Hormigón H17 de 8cm espesor` |
| **Cantidad Realizada** | Número decimal | `38.2` |
| **N° de Orden** | Número | `5519672` |

**Importante:** El **"Texto Breve de Orden"** DEBE contener **Calle + Altura** para poder matchear con EJECUTADO.xlsx.

---

### 3️⃣ CONTROL DE HORMIGON, VOLQUETES... (Opcional)

**Nota:** Este archivo es auxiliar para tu referencia.  
**La web NO lo carga** — los consumos se obtienen directamente de Supabase.

---

## 🔄 Flujo de Uso

```
1️⃣ Carga EJECUTADO.xlsx
        ↓
2️⃣ Carga Certificado.xlsx
        ↓
3️⃣ Ingresa Jefe de Obra
        ↓
4️⃣ [Consultar Supabase & Comparar]
        ↓
5️⃣ Ver Resultados
   - Frentes validados ✓
   - Discrepancias ⚠️
   - Consumos por item
```

### Paso a Paso

1. **Sube EJECUTADO.xlsx**
   - La web detecta automáticamente la hoja con "FRENTES"
   - Muestra cantidad de frentes cargados

2. **Sube Reporte de Certificado.xlsx**
   - Busca hoja "cert" (o usa la primera disponible)
   - Muestra cantidad de líneas/ítems cargados

3. **Selecciona Jefe de Obra**
   - Ingresa el nombre exacto como está en Supabase
   - Ejemplo: `Pablo Franciscono`, `Sergio Arena`, etc.
   - ⚠️ **Importante:** El nombre debe coincidir exactamente con `remitos.jefe_obra`

4. **Consulta Supabase & Compara**
   - Web obtiene remitos de ese jefe (tabla `remitos`)
   - Obtiene ítems consumidos (tabla `remito_items`)
   - **Matchea frentes** por Calle + Altura
   - **Compara cantidades** con ±15% de tolerancia

5. **Visualiza Resultados**
   - **Resumen:** Total de frentes, discrepancias encontradas
   - **Detalle por frente:** 
     - ✓ Validaciones correctas (items que coinciden)
     - ⚠️ Discrepancias (cantidades que no coinciden)
   - **Tablas:** Certificado vs Consumido (Supabase)

---

## ✅ Validaciones Implementadas

### Matcheo de Ubicaciones
- **Exacto:** Calle + Altura idénticos
- **Por proximidad:** Calle + Altura ±50m

### Comparación de Cantidades
- **Tolerancia:** ±15% (configurable)
- **Mostrar:** Diferencia porcentual

### Reportes
- ✓ Items que coinciden (validaciones correctas)
- ⚠️ Items con discrepancia (diferencia >15%)
- ❌ Items faltantes en Supabase

---

## 🗄️ Tablas Supabase Utilizadas

### `remitos`
Cabecera de remitos. Campos importantes:
- `id` — ID único
- `jefe_obra` — Nombre del jefe (DEBE coincidir exactamente)
- `tipo` — RETIRO, INGRESO, etc. (filtramos RETIRO)
- `obs` — Observaciones (contiene calle/altura del frente)
- `fecha` — Fecha del movimiento

### `remito_items`
Items/líneas de cada remito. Campos:
- `remito_id` — Referencia al remito
- `item_nombre` — Nombre del material
- `item_unidad` — Unidad (m³, unid, m², kg, etc.)
- `cantidad` — Cantidad consumida

---

## 🛠️ Stack Técnico

- **Frontend:** React 18 + Vite 5
- **Backend:** Supabase (PostgreSQL)
- **Parsing:** XLSX (lectura de Excel)
- **Estilos:** CSS vanilla (responsive)

---

## 📝 Notas Importantes

### 1. Clave de Matching: Calle + Altura
```
EJECUTADO.xlsx:
  Calle: "ALVAREZ JONTE AV." + Altura: 2621

Certificado.xlsx:
  "Texto Breve de Orden": "ALVAREZ JONTE AV. 2621"

Supabase (remitos.obs):
  "ALVAREZ JONTE AV. 2621"  ← extraído de observación
```

### 2. Tolerancia en Comparaciones
- Certificado: 100 M³
- Consumido: 85-115 M³ ✓ (dentro de ±15%)
- Consumido: 70 M³ ❌ (fuera de rango)

Configurable en código: `compareWithTolerance(..., 0.15)`

### 3. Nombres de Jefes
- ⚠️ **Sensible a mayúsculas/minúsculas**
- `Pablo Franciscono` ≠ `pablo franciscono`
- Verifica el nombre exacto en Supabase antes

### 4. Formato de Calle + Altura
Espera formato: `CALLE NOMBRE [NUMERO]`
- ✓ `ALVAREZ JONTE AV. 2621`
- ✓ `CAMPANA 3751`
- ✓ `CESAR DIAZ 3176`

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "No se encontró hoja FRENTES" | Verifica que tu Excel tenga una hoja con "FRENTES" en el nombre |
| "No hay remitos registrados para..." | El jefe no existe en Supabase o no tiene remitos RETIRO |
| "No hay datos de consumo en Supabase" | El frente no se encontró. Verifica que Calle+Altura coincidan |
| Cantidades no coinciden | Revisa tolerancia (15%) o verifica datos en Supabase |
| Items muestran como consumo 0 | Ese item no está registrado en Supabase para ese jefe |

---

## 📦 Producción

Para desplegar en producción (Cloudflare Pages, Vercel, Netlify, etc.):

```bash
npm run build
# Archivos listos en ./dist/
```

### Cloudflare Pages
```bash
# Conecta tu repo a Cloudflare Pages
# Build command: npm run build
# Build output directory: dist
```

---

## 🔐 Seguridad

**Nota:** Las credenciales de Supabase están hardcodeadas en el código (lado cliente).  
Esto es aceptable para lectura únicamente si:
- La clave es ANON_KEY (solo lectura)
- Las políticas RLS de Supabase restringen acceso

Para mayor seguridad en producción: usar un backend proxy.

---

**Última actualización:** 2026-07-20  
**Versión:** 1.0.0
