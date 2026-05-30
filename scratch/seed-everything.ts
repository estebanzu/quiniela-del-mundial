import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const DUMMY_USERS = [
  { username: 'dummy', email: 'dummy@quiniela.local', password: 'password123' },
  { username: 'dummy_juan', email: 'dummy_juan@quiniela.local', password: 'password123' },
  { username: 'dummy_sofia', email: 'dummy_sofia@quiniela.local', password: 'password123' },
  { username: 'dummy_diego', email: 'dummy_diego@quiniela.local', password: 'password123' },
  { username: 'dummy_lucia', email: 'dummy_lucia@quiniela.local', password: 'password123' },
  { username: 'dummy_carlos', email: 'dummy_carlos@quiniela.local', password: 'password123' }
]

// Hardcoded predictions for the first 5 matches to test points trigger calculations
// Mexico vs South Africa (1) -> 1 - 1
// Korea Republic vs Czechia (2) -> 2 - 0
// Canada vs Bosnia (3) -> 0 - 3
// USA vs Paraguay (4) -> 2 - 1
// Haiti vs Scotland (5) -> 1 - 2
const HARDCODED_PREDICTIONS: Record<string, Record<number, { home: number, away: number }>> = {
  dummy_juan: {
    1: { home: 1, away: 1 }, // Exact -> 5
    2: { home: 2, away: 0 }, // Exact -> 5
    3: { home: 0, away: 3 }, // Exact -> 5
    4: { home: 2, away: 1 }, // Exact -> 5
    5: { home: 0, away: 2 }  // Winner -> 3 (Total: 23)
  },
  dummy_sofia: {
    1: { home: 2, away: 2 }, // Draw -> 1
    2: { home: 1, away: 0 }, // Winner -> 3
    3: { home: 1, away: 2 }, // Wrong -> 0
    4: { home: 3, away: 1 }, // Winner -> 3
    5: { home: 1, away: 2 }  // Exact -> 5 (Total: 12)
  },
  dummy_diego: {
    1: { home: 2, away: 1 }, // Wrong -> 0
    2: { home: 3, away: 0 }, // Winner -> 3
    3: { home: 0, away: 1 }, // Winner -> 3
    4: { home: 2, away: 1 }, // Exact -> 5
    5: { home: 1, away: 2 }  // Exact -> 5 (Total: 16)
  },
  dummy_lucia: {
    1: { home: 0, away: 0 }, // Draw -> 1
    2: { home: 1, away: 1 }, // Wrong -> 0
    3: { home: 1, away: 1 }, // Wrong -> 0
    4: { home: 2, away: 1 }, // Exact -> 5
    5: { home: 0, away: 0 }  // Wrong -> 0 (Total: 6)
  },
  dummy_carlos: {
    1: { home: 3, away: 0 }, // Wrong -> 0
    2: { home: 0, away: 2 }, // Wrong -> 0
    3: { home: 0, away: 3 }, // Exact -> 5
    4: { home: 1, away: 1 }, // Wrong -> 0
    5: { home: 3, away: 1 }  // Wrong -> 0 (Total: 5)
  }
}

// First 5 matches will be completed
const FINISHED_SCORES: Record<number, { home: number, away: number }> = {
  1: { home: 1, away: 1 },
  2: { home: 2, away: 0 },
  3: { home: 0, away: 3 },
  4: { home: 2, away: 1 },
  5: { home: 1, away: 2 }
}

async function seed() {
  console.log('Starting Seeding Process...')

  // Load parsed matches JSON
  const jsonPath = path.resolve(__dirname, 'matches_all_phases.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: Run "npx tsx scratch/parse-all-phases.ts" first to generate matches_all_phases.json`)
    process.exit(1)
  }
  const matches = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`Loaded ${matches.length} matches from JSON.`)

  // Step 1: Sign up / Log in each user to clear their predictions (RLS check bypass)
  console.log('\n--- Step 1: Cleaning predictions by logging in as each user ---')
  const adminEmail = 'admin@quiniela.local'
  const adminPassword = 'password123'
  
  // Register admin just in case
  await supabase.auth.signUp({
    email: adminEmail,
    password: adminPassword
  })

  const { data: adminAuth } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  })

  if (adminAuth?.session) {
    const adminClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${adminAuth.session.access_token}` } }
    })
    console.log('Admin logged in. Deleting admin predictions...')
    await adminClient.from('predictions').delete().eq('user_id', adminAuth.user.id)
  }

  // Deleting predictions for each dummy user
  for (const user of DUMMY_USERS) {
    // Register just in case
    const { error: signUpError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password
    })
    if (signUpError) {
      console.log(`Note on signing up ${user.username}:`, signUpError.message)
    }

    const { data: userAuth, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    })

    if (signInError) {
      console.error(`Failed to log in as ${user.username}:`, signInError.message)
    }

    if (userAuth?.session) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${userAuth.session.access_token}` } }
      })
      console.log(`Deleting predictions for ${user.username}...`)
      const { error: delPredErr } = await userClient.from('predictions').delete().eq('user_id', userAuth.user.id)
      if (delPredErr) {
        console.error(`Error deleting predictions for ${user.username}:`, delPredErr.message)
      }
    }
  }

  // Step 2: Now that predictions are cleared, admin deletes all matches and inserts the new ones
  console.log('\n--- Step 2: Clearing existing matches and inserting new ones ---')
  if (!adminAuth?.session) {
    console.error('Admin session missing. Cannot manage matches.')
    process.exit(1)
  }

  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${adminAuth.session.access_token}` } }
  })

  console.log('Clearing all matches (should succeed now since predictions are deleted)...')
  const { error: deleteError } = await authenticatedClient.from('matches').delete().neq('id', 0)
  if (deleteError) {
    console.error('Error deleting matches:', deleteError.message)
    process.exit(1)
  }
  console.log('Matches table successfully cleared!')

  // Create temporary matches array where date is 2 hours in the future
  const now = new Date()
  const tempFutureDate = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString()
  
  const tempMatches = matches.map((m: any) => ({
    id: m.id,
    home_team: m.home_team,
    away_team: m.away_team,
    match_date: tempFutureDate, // temporary future date
    status: 'pending',
    home_score: null,
    away_score: null
  }))

  console.log(`Inserting ${tempMatches.length} matches into database...`)
  const chunkSize = 25
  for (let i = 0; i < tempMatches.length; i += chunkSize) {
    const chunk = tempMatches.slice(i, i + chunkSize)
    const { error: insertError } = await authenticatedClient.from('matches').upsert(chunk, { onConflict: 'id' })
    if (insertError) {
      console.error('Error inserting matches chunk:', insertError.message)
      process.exit(1)
    }
  }
  console.log('Matches inserted successfully!')

  // Step 3: Insert predictions for all dummy users
  console.log('\n--- Step 3: Re-creating Predictions for Dummy Users ---')
  for (const user of DUMMY_USERS) {
    const { data: userAuth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    })

    if (!userAuth?.session) {
      console.error(`Failed to log in as ${user.username}`)
      continue
    }

    const dummyClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${userAuth.session.access_token}` } }
    })

    // Generate predictions
    const predictionsToInsert = matches.map((m: any) => {
      let predHome = Math.floor(Math.random() * 5)
      let predAway = Math.floor(Math.random() * 5)

      // Use hardcoded predictions for first 5 matches to test trigger points logic
      const hardcoded = HARDCODED_PREDICTIONS[user.username]?.[m.id]
      if (hardcoded) {
        predHome = hardcoded.home
        predAway = hardcoded.away
      }

      return {
        user_id: userAuth.user.id,
        match_id: m.id,
        predicted_home: predHome,
        predicted_away: predAway,
        points: 0 // Will be recalculated by database trigger when matches finish
      }
    })

    console.log(`Inserting ${predictionsToInsert.length} predictions for ${user.username}...`)
    for (let i = 0; i < predictionsToInsert.length; i += chunkSize) {
      const chunk = predictionsToInsert.slice(i, i + chunkSize)
      const { error: predError } = await dummyClient.from('predictions').insert(chunk)
      if (predError) {
        console.error(`Error inserting predictions chunk for ${user.username}:`, predError.message)
        process.exit(1)
      }
    }
    console.log(`Created predictions for ${user.username}!`)
  }

  // Step 4: Update match dates back to their original dates, and mark the first 5 matches as 'finished'
  // This triggers the public.update_prediction_points trigger which calculates scores for everyone!
  console.log('\n--- Step 4: Restoring Original Dates and Finishing First 5 Matches ---')
  
  const finalMatchesToUpdate = matches.map((m: any) => {
    const finished = FINISHED_SCORES[m.id]
    const base = {
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      match_date: m.match_date,
      status: 'pending',
      home_score: null,
      away_score: null
    }
    if (finished) {
      // Put date in the past relative to now, e.g., 2 days ago
      const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      return {
        ...base,
        match_date: pastDate,
        status: 'finished',
        home_score: finished.home,
        away_score: finished.away
      }
    } else {
      return base
    }
  })

  console.log('Restoring dates and finalizing test matches...')
  for (let i = 0; i < finalMatchesToUpdate.length; i += chunkSize) {
    const chunk = finalMatchesToUpdate.slice(i, i + chunkSize)
    const { error: updateError } = await authenticatedClient.from('matches').upsert(chunk, { onConflict: 'id' })
    if (updateError) {
      console.error('Error updating matches to final state:', updateError.message)
      process.exit(1)
    }
  }

  console.log('\n=============================================')
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!')
  console.log('1. Loaded and inserted 104 official matches (all phases).')
  console.log('2. Created 5 dummy users (juan, sofia, diego, lucia, carlos) with password "password123".')
  console.log('3. Inserted predictions for all 104 matches for each user.')
  console.log('4. Completed the first 5 matches (Mexico 1-1 RSA, Korea 2-0 Czechia, Canada 0-3 Bosnia, USA 2-1 Paraguay, Haiti 1-2 Scotland).')
  console.log('5. Triggered database calculations. Leaderboard points should be:')
  console.log('   - dummy_juan: 23 PTS (3 exact matches, 1 winner outcome)')
  console.log('   - dummy_diego: 16 PTS (2 exact matches, 2 winner outcomes)')
  console.log('   - dummy_sofia: 12 PTS (1 exact match, 2 winner outcomes, 1 draw outcome)')
  console.log('   - dummy_lucia: 6 PTS (1 exact match, 1 draw outcome)')
  console.log('   - dummy_carlos: 5 PTS (1 exact match)')
  console.log('=============================================')
}

// Log in as main test user again at the end of the script is not needed. Just run seed.
seed().catch(err => {
  console.error('Seeding script failed with uncaught error:', err)
})
