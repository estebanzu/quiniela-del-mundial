const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const dbUrl = process.argv[2];
  const filePath = process.argv[3];

  if (!dbUrl || !filePath) {
    console.error('Usage: node db-sync.js <db_url> <file_path>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🔄 Reading ${filePath}...`);
  const sql = fs.readFileSync(absolutePath, 'utf8');

  console.log(`🔌 Connecting to database...`);
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`🚀 Executing queries...`);
    await client.query(sql);
    console.log(`✅ ${filePath} synced successfully.`);
  } catch (err) {
    console.error(`❌ Error executing SQL:`, err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
