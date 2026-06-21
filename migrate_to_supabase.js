import fs from 'fs';
import path from 'path';
import { db } from './database.js';

const LOCAL_DATA_FILE = path.join(process.cwd(), 'data.json');

async function runMigration() {
  console.log('--- Database Migration to Supabase ---');
  
  if (!fs.existsSync(LOCAL_DATA_FILE)) {
    console.error(`Error: Local database file not found at ${LOCAL_DATA_FILE}`);
    process.exit(1);
  }

  let localData = { yarn: [], thread: [] };
  try {
    const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf-8');
    localData = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading/parsing data.json:', err.message);
    process.exit(1);
  }

  const yarnCount = localData.yarn ? localData.yarn.length : 0;
  const threadCount = localData.thread ? localData.thread.length : 0;

  console.log(`Loaded from data.json: ${yarnCount} yarn records, ${threadCount} sewing thread records.`);
  console.log('Uploading data to Supabase (this may take a moment)...');

  const success = await db.write(localData);

  if (success) {
    console.log('--- Migration Completed Successfully! ---');
    console.log(`Successfully migrated ${yarnCount} yarn records and ${threadCount} thread records to your cloud database.`);
  } else {
    console.error('--- Migration Failed! ---');
    console.error('Check your console log/errors above for database connection errors.');
    process.exit(1);
  }
}

runMigration();
