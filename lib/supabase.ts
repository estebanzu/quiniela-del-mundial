import { createClient } from '@supabase/supabase-js'

// Supabase client configured for browser and client-side pages.
// Ensure these environment variables are set in your Next.js app.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
