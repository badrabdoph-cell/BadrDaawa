import pg from 'pg';

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

// Enums
console.log("=== ENUMS ===");
const { rows: enums } = await client.query(`
  SELECT t.typname as enum_name, e.enumlabel as enum_value
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  ORDER BY t.typname, e.enumsortorder
`);
let currentEnum = '';
for (const r of enums) {
  if (r.enum_name !== currentEnum) {
    currentEnum = r.enum_name;
    console.log(`\n  ${currentEnum}:`);
  }
  console.log(`    - ${r.enum_value}`);
}

// ContentVersion count and details
console.log("\n========================================");
const { rows: cvCount } = await client.query('SELECT COUNT(*)::int as count FROM "ContentVersion"');
console.log(`\n1. ContentVersion count: ${cvCount[0].count}`);

const { rows: lastVersions } = await client.query('SELECT * FROM "ContentVersion" ORDER BY version DESC LIMIT 5');
console.log("   Last 5 versions:");
for (const r of lastVersions) {
  console.log(`   - v${r.version} | by ${r.publishedBy} | ${r.publishedAt} | keys:${JSON.stringify(r.changedKeys)} | sha:${(r.commitSha||'').substring(0,12)}`);
}

// 2+3: All keys
const { rows: allKeys } = await client.query("SELECT key FROM \"AppSetting\" ORDER BY key");
const keys = allKeys.map(r => r.key);
console.log(`\n2+3. All AppSetting keys (${keys.length}):`);
for (const k of keys) console.log(`   - ${k}`);

// Categorize
const draftKeys = keys.filter(k => k.includes(':draft:'));
const publishedKeys = keys.filter(k => k.includes(':published:') || (!k.includes(':draft:') && !k.includes(':meta:') && !k.startsWith('project-content:')));
const metaKeys = keys.filter(k => k.includes(':meta:') || k.startsWith('admin-') || k.startsWith('error-'));
console.log(`\n  Keys with :draft:: ${draftKeys.length}`);
console.log(`  Keys with :published:: ${publishedKeys.length}`);
console.log(`  Meta keys: ${metaKeys.length}`);

// 5- Latest backup
console.log(`\n5. Latest successful BackupJob:`);
const { rows: lastSuccess } = await client.query("SELECT * FROM \"BackupJob\" WHERE status = 'SUCCESS' ORDER BY \"createdAt\" DESC LIMIT 1");
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
  console.log(`   Error: ${s.error || 'none'}`);
} else {
  console.log("   (none found)");
}

const { rows: lastAny } = await client.query("SELECT id, status, type, \"createdAt\", error FROM \"BackupJob\" ORDER BY \"createdAt\" DESC LIMIT 5");
console.log(`   Last backup jobs:`);
for (const r of lastAny) {
  console.log(`   - ${r.id} | ${r.status} | ${r.type || 'N/A'} | ${r.createdAt}${r.error ? ' | ERR: ' + r.error.substring(0, 80) : ''}`);
}

// Show current AppSetting values for key content types
console.log(`\n=== Current AppSetting values (sample) ===`);
const { rows: homeContent } = await client.query("SELECT key, LEFT(value::text, 120) as val FROM \"AppSetting\" WHERE key IN ('home-content', 'project-content:draft:home-content', 'project-content:published:home-content')");
for (const r of homeContent) {
  console.log(`  ${r.key}: ${r.val}...`);
}

// Check pendingChanges meta
const { rows: pending } = await client.query("SELECT key, value FROM \"AppSetting\" WHERE key LIKE '%:meta:%'");
console.log(`\n  Meta settings:`);
for (const r of pending) console.log(`  ${r.key}: ${JSON.stringify(r.value)}`);

await client.end();
