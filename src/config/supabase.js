import { createClient } from '@supabase/supabase-js'

// Fallback público. La ANON KEY de Supabase está pensada para exponerse en el
// navegador: viaja en el bundle igual que cualquier variable VITE_*, y su acceso
// está limitado por las políticas RLS de las tablas (solo lectura de remitos).
// Por eso es seguro tenerla acá y evita depender de la config de Cloudflare.
// Si se definen las variables de entorno, tienen prioridad.
const URL_FALLBACK = 'https://nmwaylkgzvaneqaftbrf.supabase.co'
const KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5td2F5bGtnenZhbmVxYWZ0YnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDE3NDUsImV4cCI6MjA4OTE3Nzc0NX0.Meei4OyVR6VHIGK90lC2yEuVu2xKkGVuSnpZcsxgodI'

const url = import.meta.env.VITE_SUPABASE_URL || URL_FALLBACK
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || KEY_FALLBACK

export const supabaseConfigured = Boolean(url && anonKey)

// createClient() tira excepción con url vacía, lo que rompía toda la app
// (pantalla en blanco). Con el fallback siempre hay credenciales, pero
// mantenemos el guard por las dudas.
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null
