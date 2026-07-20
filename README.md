# 🔍 Verificador de Consumos por Frente

Web para cruzar, por **jefe de obra** y **período**, lo que cada JO **ejecutó** y lo que el
**certificado** especifica contra los **consumos reales** (Excel de hormigón/volquetes/asfalto +
pañol en Supabase).

---

## 🚀 Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completá las credenciales de Supabase
npm run dev                  # http://localhost:5173
npm run build                # build de producción en dist/
```

### Credenciales (Supabase)
Las claves NO van en el código. Copiá `.env.example` a `.env.local`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

En Cloudflare Pages, cargá esas dos variables en *Settings → Environment variables*.

---

## 📥 Qué se carga

| # | Archivo | Aporta |
|---|---------|--------|
| 1 | **EJECUTADO.xlsx** | Frentes por jefe de obra *(requiere columna "Jefe de Obra")* |
| 2 | **CONTROL DE HORMIGON...xlsx** | Consumos de hormigón / volquetes / asfalto |
| 3 | **Reporte de Certificado.xlsx** | Especificación de cada frente |
| — | **Supabase** (automático) | Consumos de pañol: baldosas, hierro, cemento, etc. |

👉 Estructura detallada de columnas: [`.planning/ESTRUCTURA_EXCELS.md`](.planning/ESTRUCTURA_EXCELS.md)

---

## 🔄 Flujo

1. Cargás los 3 Excel.
2. Elegís **jefe de obra** + **rango de fechas**.
3. *Verificar consumos* → trae pañol de Supabase (filtrado por JO + fechas) y cruza todo por frente.
4. Ves, por frente: **Certificado vs Consumido** por material, con estado (OK / Exceso / Falta / etc.),
   totales del período y los consumos que no cayeron en ningún frente.

---

## 🧱 Arquitectura del código

```
src/
├── config/supabase.js        Cliente Supabase (lee credenciales de .env)
├── lib/
│   ├── normalize.js          Normalización, direcciones, fechas, matcheo por proximidad
│   ├── parseExcel.js         Parsers de los 3 Excel
│   ├── itemMapping.js        Diccionario de grupos canónicos de material  ← AJUSTAR ACÁ
│   ├── supabaseData.js       Consulta de consumos de pañol (RETIRO − DEVOLUCION)
│   └── verify.js             Motor de verificación (cruce por frente)
├── components/
│   ├── UploadPanel.jsx       Carga de los 3 archivos
│   ├── FilterBar.jsx         JO + rango de fechas
│   └── ResultsView.jsx       Resultado por frente
└── App.jsx                   Orquestador
```

---

## ⚙️ Ajustes frecuentes

- **Material que no matchea:** agregá una regla en [`src/lib/itemMapping.js`](src/lib/itemMapping.js).
- **Tolerancia de comparación:** `TOLERANCIA` en [`src/lib/verify.js`](src/lib/verify.js) (default 15%).
- **Proximidad de altura:** `toleranciaAltura` en [`src/lib/normalize.js`](src/lib/normalize.js) (default 50).

---

## ☁️ Deploy

Ver [`DEPLOY.md`](DEPLOY.md). Resumen: push a GitHub → conectar en Cloudflare Pages con
build `npm run build`, output `dist`, y las 2 variables de entorno de Supabase.

---

*Stack: React 18 · Vite 5 · Supabase · SheetJS (xlsx). Última actualización: 2026-07-20.*
