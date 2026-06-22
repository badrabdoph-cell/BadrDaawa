import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  // 1- How many ContentVersion?
  const cvCount = await prisma.contentVersion.count();
  console.log(`1. ContentVersion count: ${cvCount}`);

  const lastVersions = await prisma.contentVersion.findMany({
    orderBy: { version: 'desc' },
    take: 5,
    select: { id: true, version: true, publishedAt: true, publishedBy: true, commitSha: true, changedKeys: true }
  });
  console.log("   Last 5 versions:");
  for (const r of lastVersions) {
    console.log(`   - v${r.version} | by ${r.publishedBy} | ${r.publishedAt} | keys:${(r.changedKeys||[]).join(',')} | sha:${(r.commitSha||'').substring(0,12)}`);
  }

  // 2- Published keys
  const pubSettings = await prisma.appSetting.findMany({
    where: { isDraft: false, isActive: true },
    distinct: ['key'],
    select: { key: true }
  });
  console.log(`\n2. Published keys (${pubSettings.length}):`);
  const pubKeysSet = new Set(pubSettings.map(s => s.key));

  // 3- Draft keys
  const draftSettings = await prisma.appSetting.findMany({
    where: { isDraft: true },
    distinct: ['key'],
    select: { key: true }
  });
  console.log(`\n3. Draft keys (${draftSettings.length}):`);
  const draftKeysSet = new Set(draftSettings.map(s => s.key));

  // Print them all
  const allKeys = new Set([...pubKeysSet, ...draftKeysSet]);
  for (const key of [...allKeys].sort()) {
    const inPub = pubKeysSet.has(key) ? 'PUB' : '   ';
    const inDraft = draftKeysSet.has(key) ? 'DRF' : '    ';
    console.log(`   [${inPub}][${inDraft}] ${key}`);
  }

  // 4- pendingChanges?
  const draftActiveCount = await prisma.appSetting.count({
    where: { isDraft: true, isActive: true }
  });
  console.log(`\n4. Pending changes (draft active rows): ${draftActiveCount}`);

  // Keys unique to draft
  const draftOnlyKeys = [...draftKeysSet].filter(k => !pubKeysSet.has(k));
  console.log(`   Keys unique to draft: ${draftOnlyKeys.length}`);
  
  // Keys only in published
  const pubOnlyKeys = [...pubKeysSet].filter(k => !draftKeysSet.has(k));
  console.log(`   Keys only in published: ${pubOnlyKeys.length}`);

  if (draftOnlyKeys.length > 0) {
    console.log("   Draft-only keys:", draftOnlyKeys.join(", "));
  }

  // Check if content differs between draft and published for same keys
  const commonKeys = [...pubKeysSet].filter(k => draftKeysSet.has(k));
  let diffCount = 0;
  for (const key of commonKeys.slice(0, 5)) {
    const draft = await prisma.appSetting.findFirst({ where: { key, isDraft: true }, orderBy: { updatedAt: 'desc' } });
    const pub = await prisma.appSetting.findFirst({ where: { key, isDraft: false, isActive: true }, orderBy: { updatedAt: 'desc' } });
    if (draft && pub && draft.value !== pub.value) {
      diffCount++;
      console.log(`   ${key}: DIFFERS (draft updated ${draft.updatedAt}, pub updated ${pub.updatedAt})`);
    }
  }
  console.log(`   Keys with differing content: ${diffCount}`);

  // 5- Latest successful BackupJob
  const lastSuccess = await prisma.backupJob.findFirst({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\n5. Latest successful BackupJob:`);
  if (lastSuccess) {
    console.log(`   ID: ${lastSuccess.id}`);
    console.log(`   Created: ${lastSuccess.createdAt}`);
    console.log(`   Status: ${lastSuccess.status}`);
    console.log(`   Type: ${lastSuccess.type}`);
    console.log(`   Started: ${lastSuccess.startedAt}`);
    console.log(`   Finished: ${lastSuccess.finishedAt}`);
    console.log(`   File name: ${lastSuccess.fileName}`);
    console.log(`   Size bytes: ${lastSuccess.sizeBytes}`);
    console.log(`   GitHub SHA: ${lastSuccess.githubSha ? lastSuccess.githubSha.substring(0, 12) : 'N/A'}`);
    console.log(`   Error: ${lastSuccess.error || 'none'}`);
  } else {
    console.log("   (none found)");
  }

  const lastAny = await prisma.backupJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, status: true, type: true, createdAt: true, error: true }
  });
  console.log(`   Last 3 backup jobs:`);
  for (const r of lastAny) {
    console.log(`   - ${r.id} | ${r.status} | ${r.type || 'N/A'} | ${r.createdAt}${r.error ? ' | ERR: ' + r.error.substring(0, 80) : ''}`);
  }
} finally {
  await prisma.$disconnect();
}
