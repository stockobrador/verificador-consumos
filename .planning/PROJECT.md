# Verificador de Consumos por Frente

## What This Is

Web para validar que los frentes ejecutados por jefes de obra coincidan con:
1. Las especificaciones del certificado de obra (qué debe tener cada frente)
2. Los consumos reales registrados en Supabase

## Core Value

**Detectar discrepancias entre lo ejecutado, lo certificado y lo consumido** — garantizar que cada jefe usa los materiales correctamente según especificaciones.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Upload EJECUTADO.xlsx (frentes ejecutados por jefe)
- [ ] Upload Reporte de Certificado.xlsx (especificaciones de cada frente)
- [ ] Seleccionar jefe de obra
- [ ] Query Supabase (remitos + remito_items) para obtener consumos reales
- [ ] Comparar: ejecutado vs certificado vs supabase
- [ ] Visualizar resultado (coincidencias/discrepancias)
- [ ] Validar hormigón (cantidad por tipo: 8cm, 12cm, peinado)
- [ ] Validar baldosas (consumo vs retiro)
- [ ] Validar hierro (cantidad/tipo)
- [ ] Validar otros materiales según certificado

### Out of Scope

- Modulo de edición de certificados
- Histórico de comparaciones pasadas
- Reportes PDF

## Tech Stack

- Frontend: React 18 + Vite 5
- Backend: Supabase (remitos, remito_items)
- Parsing: XLSX (lectura de Excel)
- UI: CSS vanilla (sin framework)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Vite | Moderno, rápido, como otros proyectos del equipo | — Pending |
| Supabase | Ya existe, con datos de consumos | — Pending |
| Matching por calle+altura | Datos en observación; comparación por proximidad si no exacto | — Pending |

---
*Last updated: 2026-07-20 after initialization*
