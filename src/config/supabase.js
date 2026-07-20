import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Aviso temprano en consola si faltan las credenciales
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Copiá .env.example a .env.local y completá los valores.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')
export const supabaseConfigured = Boolean(url && anonKey)
