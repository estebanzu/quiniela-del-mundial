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
    .select('*')
    .or('home_team.ilike.%germany%,away_team.ilike.%germany%,home_team.ilike.%sweden%,away_team.ilike.%sweden%,home_team.ilike.%alemania%,away_team.ilike.%suecia%')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Matches involving Germany or Sweden in DB:');
  console.log(JSON.stringify(matches, null, 2));
}

run();
