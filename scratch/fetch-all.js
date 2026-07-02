const fs = require('fs');

async function run() {
  try {
    const res = await fetch('https://wcup2026.org/api/data.php?action=all');
    const data = await res.json();
    fs.writeFileSync('scratch/all-matches.json', JSON.stringify(data, null, 2));
    console.log('Successfully fetched and saved all matches!');
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

run();
