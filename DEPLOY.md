# Deploy — GitHub + Cloudflare Pages

## 1. Subir cambios a GitHub

```bash
git add -A
git commit -m "tu mensaje"
git push origin main
```

Repo: https://github.com/stockobrador/verificador-consumos

## 2. Conectar Cloudflare Pages (una sola vez)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Elegí el repo `verificador-consumos`.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** (⚠️ imprescindible para que cargue Supabase):
   - `VITE_SUPABASE_URL` = `https://nmwaylkgzvaneqaftbrf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<anon key>`
5. **Save and Deploy**.

Cada `git push` a `main` redeploya solo. URL: `https://verificador-consumos.pages.dev`.

## Nota de seguridad

La `anon key` es pública por diseño (protegida por las políticas RLS de Supabase), así que puede ir
en las variables del cliente. Aun así, revisá que RLS esté activo en las tablas `remitos` y
`remito_items` para permitir **solo lectura** con esa clave.
