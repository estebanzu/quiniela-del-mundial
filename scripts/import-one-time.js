const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  let dbUrl = process.env.DATABASE_URL;
  if (!dbUrl && fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/DATABASE_URL=(.+)/);
    if (match) dbUrl = match[1].replace(/["']/g, '').trim();
  }

  if (!dbUrl) {
    console.error('DATABASE_URL not found.');
    process.exit(1);
  }

  const jsonPath = path.resolve('supabase/one-time.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('one-time.json not found in supabase/');
    process.exit(1);
  }

  const { leaderboard } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Fetch all users
    const usersRes = await client.query('SELECT id, email FROM auth.users');
    const users = usersRes.rows;

    console.log('🔄 Matching JSON users to database emails...');
    const updates = [];

    for (const item of leaderboard) {
      const jsonUserClean = item.usuario.replace(/\.\.\./g, '').toLowerCase();
      
      // Find a matching email prefix
      const matchedUser = users.find(u => {
        const emailPrefix = u.email.split('@')[0].toLowerCase();
        // Match if prefix starts with JSON name, or vice versa, or if they share first 5 characters
        return emailPrefix.startsWith(jsonUserClean) || 
               jsonUserClean.startsWith(emailPrefix) ||
               (emailPrefix.substring(0, 5) === jsonUserClean.substring(0, 5));
      });

      if (matchedUser) {
        console.log(`✅ Matched: "${item.usuario}" ➔ Email: ${matchedUser.email}`);
        updates.push({
          userId: matchedUser.id,
          email: matchedUser.email,
          f1: item.f1,
          f2: item.f2
        });
      } else {
        console.warn(`⚠️  Could not match user: "${item.usuario}"`);
      }
    }

    console.log(`\n🚀 Inserting dummy predictions to restore points for ${updates.length} users...`);
    
    await client.query('BEGIN');
    await client.query("SET LOCAL my.seeding_mode = 'on';");
    
    for (const update of updates) {
      // Restore Phase 1 (f1) points on Match 1
      if (update.f1 > 0) {
        await client.query(`
          INSERT INTO public.predictions (user_id, match_id, predicted_home, predicted_away, points)
          VALUES ($1, 1, 0, 0, $2)
          ON CONFLICT (user_id, match_id) 
          DO UPDATE SET points = EXCLUDED.points
        `, [update.userId, update.f1]);
      }

      // Restore Phase 2 (f2) points on Match 73
      if (update.f2 > 0) {
        await client.query(`
          INSERT INTO public.predictions (user_id, match_id, predicted_home, predicted_away, points)
          VALUES ($1, 73, 0, 0, $2)
          ON CONFLICT (user_id, match_id) 
          DO UPDATE SET points = EXCLUDED.points
        `, [update.userId, update.f2]);
      }
    }

    await client.query('COMMIT');
    console.log('\n🎉 Point restoration complete successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during restoration:', err.message);
  } finally {
    await client.end();
  }
}

main();
