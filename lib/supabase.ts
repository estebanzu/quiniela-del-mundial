import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '⚠️ Configuración pendiente: Para usar esta app, crea un archivo .env.local en la raíz del proyecto con las siguientes variables:\n\n' +
    'NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-de-supabase\n\n' +
    'Copia .env.example como referencia o revisa el README.md para instrucciones detalladas.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
