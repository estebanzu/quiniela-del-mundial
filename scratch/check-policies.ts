import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkPolicies() {
  console.log('Fetching policies from pg_policies...')
  const { data, error } = await supabase.from('matches').select('*').limit(1)
  if (error) {
    console.error('Error selecting from matches:', error.message)
  } else {
    console.log('Matches selection worked (empty or returned rows).')
  }

  // We can try to run a custom query using postgres RPC or check what metadata is available.
  // Wait, let's see if we can query pg_policies using supabase.rpc or direct fetch
  // (if there's no custom RPC, querying pg_catalog won't be allowed through PostgREST).
}

checkPolicies()
