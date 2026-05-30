import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure to run with --env-file=.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('Testing connection to Supabase...')
  console.log('URL:', supabaseUrl)
  
  // 1. Fetch leaderboard
  const { data: leaderboard, error: lbError } = await supabase
    .rpc('get_leaderboard')
  
  if (lbError) {
    console.error('Error fetching leaderboard:', lbError.message)
  } else if (leaderboard) {
    console.log('Leaderboard:', leaderboard)
  } else {
    console.log('No leaderboard records found.')
  }

}

testConnection()
