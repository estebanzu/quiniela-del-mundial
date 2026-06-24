import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

const email = 'mylord@quiniela.local'
const password = 'Julian.0901'

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { is_admin: true }
})

if (error) {
  if (error.message.includes('already registered')) {
    console.log('Usuario ya existe, actualizando metadata...')
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find(u => u.email === email)
    if (user) {
      const { error: updErr } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, is_admin: true }
      })
      if (updErr) { console.error('Error al actualizar:', updErr.message); process.exit(1) }
      console.log('✅ Admin actualizado:', user.id, email)
    }
  } else {
    console.error('Error:', error.message)
    process.exit(1)
  }
} else {
  console.log('✅ Admin creado:', data.user.id, data.user.email)
}
