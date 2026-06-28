const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Read DATABASE_URL from .env.local
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
    const dbUrlLine = envFile.split('\n').find(line => line.startsWith('DATABASE_URL='));
    if (dbUrlLine) {
      dbUrl = dbUrlLine.replace('DATABASE_URL=', '').trim();
    }
  } catch (e) {
    // Ignore error reading file
  }
}

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not set in environment or .env.local");
  process.exit(1);
}

async function run() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("❌ Please specify a SQL file path.");
    process.exit(1);
  }
  const absolutePath = path.resolve(filePath);
  console.log(`🔄 Executing ${filePath}...`);
  const sql = fs.readFileSync(absolutePath, 'utf8');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log(`✅ Successfully executed ${filePath}`);
  } catch (err) {
    console.error(`❌ Error executing ${filePath}:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
run();
