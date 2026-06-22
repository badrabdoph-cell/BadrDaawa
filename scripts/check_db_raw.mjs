import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

// First, let's discover the actual schema
console.log("=== TABLES ===");
const { rows: tables } = await client.query(`
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`);
for (const r of tables) console.log(`  ${r.table_name}`);

// AppSetting columns
console.log("\n=== AppSetting COLUMNS ===");
const { rows: appCols } = await client.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'AppSetting' 
  ORDER BY ordinal_position
`);
for (const r of appCols) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`);

// ContentVersion columns
console.log("\n=== ContentVersion COLUMNS ===");
const { rows: cvCols } = await client.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'ContentVersion' 
  ORDER BY ordinal_position
`);
for (const r of cvCols) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`);

// BackupJob columns
console.log("\n=== BackupJob COLUMNS ===");
const { rows: bjCols } = await client.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'BackupJob' 
  ORDER BY ordinal_position
`);
for (const r of bjCols) console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`);

// 1- How many ContentVersion?
console.log("\n========================================");
const { rows: cvCount } = await client.query('SELECT COUNT(*)::int as count FROM "ContentVersion"');
console.log(`\n1. ContentVersion count: ${cvCount[0].count}`);

const { rows: lastVersions } = await client.query('SELECT * FROM "ContentVersion" ORDER BY version DESC LIMIT 5');
console.log("   Last 5 versions:");
for (const r of lastVersions) {
  console.log(`   - v${r.version} | by ${r.publishedBy} | ${r.publishedAt} | keys:${JSON.stringify(r.changedKeys)} | sha:${(r.commitSha||'').substring(0,12)}`);
}

// 2- Published keys - check actual column names
console.log(`\n2. Published keys:`);
// Check if isDraft exists
const { rows: isDraftCol } = await client.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'AppSetting' AND column_name = 'isDraft'
`);
if (isDraftCol.length > 0) {
  const { rows: pubKeys } = await client.query("SELECT DISTINCT key FROM \"AppSetting\" WHERE \"isDraft\" = false AND \"isActive\" = true ORDER BY key");
  console.log(`   Found ${pubKeys.length} published keys (isDraft=false):`);
  for (const r of pubKeys) console.log(`   - ${r.key}`);

  const { rows: draftKeys } = await client.query("SELECT DISTINCT key FROM \"AppSetting\" WHERE \"isDraft\" = true ORDER BY key");
  console.log(`\n3. Draft keys (isDraft=true): ${draftKeys.length}`);
  for (const r of draftKeys) console.log(`   - ${r.key}`);

  // pendingChanges
  const { rows: pending } = await client.query("SELECT COUNT(*)::int as count FROM \"AppSetting\" WHERE \"isDraft\" = true AND \"isActive\" = true");
  console.log(`\n4. Pending changes (draft active rows): ${pending[0].count}`);
} else {
  // No isDraft - this is the old schema
  console.log("   (No isDraft column - old schema, no draft support yet)");
  
  // Just show all keys
  const { rows: allKeys } = await client.query("SELECT DISTINCT key FROM \"AppSetting\" ORDER BY key");
  console.log(`   All keys in AppSetting (${allKeys.length}):`);
  for (const r of allKeys) console.log(`   - ${r.key}`);
  
  console.log(`\n3. Draft keys: (not applicable - no draft system deployed yet)`);
  console.log(`\n4. Pending changes: (not applicable - no draft system deployed yet)`);
}

// 5- Latest successful BackupJob
console.log(`\n5. Latest successful BackupJob:`);
const { rows: lastSuccess } = await client.query("SELECT * FROM \"BackupJob\" WHERE status = 'completed' ORDER BY \"createdAt\" DESC LIMIT 1");
if (lastSuccess.length > 0) {
  const s = lastSuccess[0];
  console.log(`   ID: ${s.id}`);
  console.log(`   Type: ${s.type}`);
  console.log(`   Status: ${s.status}`);
  console.log(`   Created: ${s.createdAt}`);
  console.log(`   Started: ${s.startedAt}`);
  console.log(`   Finished: ${s.finishedAt}`);
  console.log(`   File: ${s.fileName}`);
  console.log(`   Size: ${s.sizeBytes}`);
  console.log(`   GitHub SHA: ${s.githubSha ? s.githubSha.substring(0,12) : 'N/A'}`);
  console.log(`   GitHub URL: ${s.githubUrl || 'N/A'}`);
  console.log(`   Error: ${s.error || 'none'}`);
} else {
  console.log("   (none found)");
}

const { rows: lastAny } = await client.query("SELECT id, status, type, \"createdAt\", error FROM \"BackupJob\" ORDER BY \"createdAt\" DESC LIMIT 5");
console.log(`   Last backup jobs:`);
for (const r of lastAny) {
  console.log(`   - ${r.id} | ${r.status} | ${r.type || 'N/A'} | ${r.createdAt}${r.error ? ' | ERR: ' + r.error.substring(0, 80) : ''}`);
}

// Show most recent ContentVersion for published content check
const { rows: latestCv } = await client.query('SELECT * FROM "ContentVersion" ORDER BY version DESC LIMIT 1');
if (latestCv.length > 0) {
  console.log(`\n=== Current published content (v${latestCv[0].version}) ===`);
  // Show a sample of what the AppSetting values look like
  const { rows: sampleSettings } = await client.query('SELECT key, LEFT(value::text, 80) as val_preview FROM "AppSetting" LIMIT 15');
  console.log("  AppSetting samples:");
  for (const r of sampleSettings) console.log(`  ${r.key}: ${r.val_preview}`);
}

await client.end();
