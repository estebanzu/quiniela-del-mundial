const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  });

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, home_team, away_team, status, home_score, away_score')
    .lte('id', 72);

  if (error) {
    console.error('Error fetching group matches:', error);
    return;
  }

  const pending = matches.filter(m => m.status === 'pending');
  const live = matches.filter(m => m.status === 'live');
  const finished = matches.filter(m => m.status === 'finished');

  console.log(`Group Stage Summary:`);
  console.log(`Total: ${matches.length}`);
  console.log(`Finished: ${finished.length}`);
  console.log(`Pending: ${pending.length}`);
  console.log(`Live: ${live.length}`);

  if (pending.length > 0) {
    console.log('\nPending Matches:');
    console.log(pending.slice(0, 10));
  }
}

run();
