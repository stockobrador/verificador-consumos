# 🚀 Guía de Deploy a GitHub + Cloudflare Pages

Este documento te guía paso a paso para subir el proyecto a GitHub y desplegarlo en Cloudflare Pages.

---

## 📋 Pre-requisitos

- ✅ Git instalado (verificar: `git --version`)
- ✅ Cuenta en GitHub (https://github.com)
- ✅ Cuenta en Cloudflare (https://www.cloudflare.com)
- ✅ Proyecto Git ya inicializado (✓ hecho)

---

## 🔧 Paso 1: Crear Repositorio en GitHub

### Opción A: Usando GitHub Web (Recomendado)

1. Ve a https://github.com/new
2. Llena el formulario:
   - **Repository name:** `verificador-consumos`
   - **Description:** `Web para verificar consumos de frentes vs certificado vs Supabase`
   - **Visibility:** Public (para que Cloudflare lo vea)
   - **Initialize with:** NO marques nada (ya tenemos commits)
3. Click en **"Create repository"**

### Opción B: Usando GitHub CLI (si lo tienes instalado)

```bash
gh repo create verificador-consumos --public --source=. --remote=origin
```

---

## 📤 Paso 2: Pushear Código a GitHub

```bash
cd Workspace/Proyectos/VerificadorConsumos

# Agregar remote (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/verificador-consumos.git

# Cambiar rama principal a 'main' (GitHub usa main por defecto)
git branch -M main

# Pushear
git push -u origin main
```

**Nota:** La primera vez te pedirá autenticación. Usa tu token de GitHub (https://github.com/settings/tokens).

---

## ☁️ Paso 3: Configurar Cloudflare Pages

### Opción A: Deploy Automático desde GitHub (Recomendado)

1. **Ve a Cloudflare Dashboard:** https://dash.cloudflare.com
2. **Lado izquierdo:** Click en **"Pages"**
3. **Click:** "Connect to Git"
4. **Selecciona GitHub** → Autoriza Cloudflare
5. **Selecciona tu repositorio:** `verificador-consumos`
6. **Configuración de Build:**
   - **Project name:** `verificador-consumos`
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node version:** Deja en blanco (usa default)
7. **Environment variables:** (opcional, pero recomendado)
   - Click "Add environment variable"
   - Agregar:
     ```
     VITE_SUPABASE_URL = https://nmwaylkgzvaneqaftbrf.supabase.co
     VITE_SUPABASE_ANON_KEY = [tu anon key]
     ```
8. **Click:** "Save and Deploy"

✅ **¡En 2-5 minutos estará online!**

### Opción B: Deploy Manual (sin GitHub)

Si prefieres no conectar GitHub:

1. En Cloudflare Pages, click "Upload assets"
2. Sube la carpeta `dist/` (después de hacer `npm run build`)
3. Done

---

## 🔗 Tu URL en Cloudflare

Después de desplegar, tu web estará en:

```
https://verificador-consumos.pages.dev
```

(O tu dominio si lo conectas)

---

## 🔄 Actualizar en Producción

Si usas Deploy Automático (Opción A):

```bash
cd Workspace/Proyectos/VerificadorConsumos

# Haz cambios en el código

# Commit
git add .
git commit -m "feat: mejorar validación de frentes"

# Push a GitHub
git push origin main

# ✅ Cloudflare se actualiza automáticamente en 2-5 minutos
```

---

## 🌍 Conectar Dominio Propio (Opcional)

1. En Cloudflare Dashboard → Pages → Tu proyecto
2. Click en **"Custom domains"**
3. Agrega tu dominio (ej: `verificador.tudominio.com`)

---

## 🐛 Troubleshooting Deploy

| Problema | Solución |
|----------|----------|
| Build fails | Verifica `npm run build` localmente: `npm run build` |
| "Cannot find module" | Falta instalar dependencias. Verifica que `npm install` se ejecutó |
| Página en blanco | Revisa la consola del navegador (F12 → Console) |
| CORS error con Supabase | Configura RLS en Supabase o usa un backend proxy |

---

## 📝 Configuración Adicional (Opcional)

### .toml para Cloudflare Wrangler (si usas eso)

Cloudflare Pages maneja todo automáticamente, así que NO necesitas `wrangler.toml`.

---

## ✅ Checklist Final

- [ ] Repositorio creado en GitHub
- [ ] Código pusheado (`git push`)
- [ ] Cloudflare Pages conectado a GitHub
- [ ] Build configuration correcta:
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] Variables de entorno configuradas (opcional)
- [ ] Primera build completada ✅
- [ ] Web accesible en `verificador-consumos.pages.dev`

---

## 🎉 ¡Listo!

Tu web ya está online y se actualiza automáticamente cada vez que haces `git push` a `main`.

**URL de producción:** https://verificador-consumos.pages.dev

---

## 📚 Referencias

- [GitHub Docs: Create a repo](https://docs.github.com/en/get-started/quickstart/create-a-repo)
- [Cloudflare Pages: Deploy with Git](https://developers.cloudflare.com/pages/platform/git-integration/)
- [Vite: Static Site Generation](https://vitejs.dev/guide/ssr.html)

---

**Última actualización:** 2026-07-20
