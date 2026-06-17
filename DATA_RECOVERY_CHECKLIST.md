# BadrDaawa — Disaster Recovery Checklist (Code-Evidenced)
## Scenario: Railway Account Completely Deleted

---

## EVIDENCE INDEX

| ID | File | Lines | Evidence |
|----|------|-------|----------|
| E1 | `lib/backups.ts` | 244-267 | Runtime data snapshot includes 16 tables |
| E2 | `lib/backups.ts` | 228-242 | Project Content (11 keys) explicitly EXCLUDED from backup |
| E3 | `lib/backups.ts` | 274-292 | Upload files (images/music) backed up as base64 |
| E4 | `lib/backups.ts` | 387-406 | Backup payload metadata confirms: "Project Content, code, templates, base site assets, and project music" excluded |
| E5 | `lib/backups.ts` | 413 | Backup written locally to `data/backups/` |
| E6 | `lib/backups.ts` | 415-424 | GitHub upload required for backup SUCCESS — if GitHub fails, backup FAILS entirely |
| E7 | `lib/backups.ts` | 941-1038 | `restoreFromBackup()` restores runtime data + uploads from local JSON |
| E8 | `app/api/admin/backups/[fileName]/restore/route.ts` | 24-28 | ALLOW_DESTRUCTIVE_RESTORE guard required |
| E9 | `lib/backups.ts` | 955-957 | "Backup file not found on disk. It may only exist on GitHub — download it first." |
| E10 | `scripts/restore-postgres-backup.mjs` | 66-68 | THIS SCRIPT REJECTS runtime backup files |
| E11 | `lib/github-sync.ts` | 405-408 | GitHub backup path: `backups/{YYYY}/{MM}/{filename}.json` |
| E12 | `lib/github-sync.ts` | 322-360 | GitHub sync exports 11 project content + DynamicPage + WeddingTemplate files |
| E13 | `lib/github-sync.ts` | 771-820 | `syncAdminStateToGitHub()` — manual trigger needed after restore |
| E14 | `lib/project-content-store.ts` | 71-94 | `readProjectContentSetting()` reads from PostgreSQL ONLY in production |
| E15 | `lib/project-content-store.ts` | 97-116 | `writeProjectContentSetting()` writes to PostgreSQL ONLY in production |
| E16 | `lib/app-settings.ts` | 7-8 | "PostgreSQL is the only live source of truth." |
| E17 | `lib/db.ts` | 10-17 | Prisma initialized from DATABASE_URL; NULL if no URL |
| E18 | `lib/github-sync.ts` | 412 | GitHub blob URL builder |
| E19 | `scripts/prepare-production.mjs` | 86-88 | Creates runtime directories at startup |
| E20 | `lib/runtime-paths.ts` | 4-8 | `data/backups/` at `process.cwd()/data/backups/`; uploads may be on Railway Volume |
| E21 | `lib/backups.ts` | 856-875 | Restore order: adminUsers → customers → invitations → ... → syncLogs |
| E22 | `lib/backups.ts` | 877-896 | Delete order (reverse FK-safe) |
| E23 | `lib/github-sync.ts` | 464-534 | `uploadRuntimeBackupToGitHub()` uses GitHub Contents API |
| E24 | `app/api/admin/sync-status/route.ts` | 38 | Manual GitHub sync trigger endpoint |

---

## 1. ASSET RECOVERY VERIFICATION

### 1.1 PostgreSQL Data (Runtime Tables)

| Property | Detail |
|----------|--------|
| **Current storage** | Railway PostgreSQL (16 tables: adminUsers, customers, invitations, guestRsvps, orderRequests, analyticsEvents, appSettings[key!=project-content], guestBookMessages, coupleMessagesSettings, clientMessages, invitationCheckIns, weddingLiveModes, internalNotes, auditLogs, backupJobs, syncLogs) |
| **Backup location** | `data/backups/{type}-{timestamp}.json` (local ephemeral) AND `backups/{YYYY}/{MM}/{filename}.json` on GitHub |
| **Recovery method** | API route `/api/admin/backups/{fileName}/restore` (requires env var `ALLOW_DESTRUCTIVE_RESTORE`) |
| **Risk level** | **MEDIUM** — backup every 6h if GitHub upload succeeds. If GitHub fails, backup FAILS (E6). |
| **Code evidence** | E1, E5, E6, E7, E8 |

### 1.2 Runtime Backups (self)

| Property | Detail |
|----------|--------|
| **Current storage** | `data/backups/` — ephemeral filesystem (LOST when Railway account deleted) |
| **Backup location** | GitHub: `backups/{YYYY}/{MM}/{filename}.json` (E11) — keeps last 30 |
| **Recovery method** | Download from GitHub → place in `data/backups/` → restore via admin UI (E9) |
| **Risk level** | **HIGH** — the backup is the ONLY recovery path for runtime data. 6-hour gap. 30-file retention. |

### 1.3 GitHub Runtime Backups

| Property | Detail |
|----------|--------|
| **Current storage** | GitHub repo: `backups/{YYYY}/{MM}/{filename}.json` |
| **Backup location** | Same location (GitHub is primary remote backup) |
| **Recovery method** | Download raw file from GitHub → copy to `data/backups/` → use restore API |
| **Risk level** | **MEDIUM** — depends on GitHub token still being valid; rate limits (5000/hr); 30-file pruning |

### 1.4 Project Content

| Property | Detail |
|----------|--------|
| **Current storage** | PostgreSQL `AppSetting` table — keys: `project-content:site-settings`, `project-content:home-content`, `project-content:home-preview-settings`, `project-content:template-settings`, `project-content:template-preview-info`, `project-content:templates-preview-music`, `project-content:music-library`, `project-content:legal-pages`, `project-content:message-templates`, `project-content:content-presets`, `project-content:custom-templates` |
| **Backup location** | NOT in runtime backup (E2, E4). Only in GitHub repo as `data/{key}.json` via GitHub Sync (E12). |
| **Recovery method** | Via manual GitHub Sync trigger: `POST /api/admin/sync-status` with admin session (E24). Sync reads from PostgreSQL and writes to GitHub. BUT: if PostgreSQL is empty (new database), manual re-import from GitHub files is needed. |
| **Risk level** | **HIGH** — NOT in runtime backup. If GitHub Sync was not running, Project Content is LOST. |

### 1.5 Dynamic Pages

| Property | Detail |
|----------|--------|
| **Current storage** | PostgreSQL `DynamicPage` table |
| **Backup location** | NOT in runtime backup (E2 — excluded). Only in GitHub as `data/dynamic-pages.json` (E12) |
| **Recovery method** | |
| **Risk level** | **HIGH** — same as Project Content |

### 1.6 Wedding Templates

| Property | Detail |
|----------|--------|
| **Current storage** | PostgreSQL `WeddingTemplate` table |
| **Backup location** | NOT in runtime backup. Only in GitHub as `data/wedding-templates.json` (E12) |
| **Recovery method** | Same as Dynamic Pages |
| **Risk level** | **HIGH** — same as above |

### 1.7 Uploaded Images

| Property | Detail |
|----------|--------|
| **Current storage** | Railway Volume — `uploads/client-invitations/`, `uploads/order-requests/`, `uploads/order-previews/` |
| **Backup location** | INSIDE runtime backup as base64 (E3) |
| **Recovery method** | Restored automatically by `restoreFromBackup()` — reads base64 → writes via `writeUploadFile()` (E7:1000-1014) |
| **Risk level** | **HIGH** — base64 storage makes backup files VERY large. If backup is truncated or fails to upload to GitHub due to size, images are lost. |

### 1.8 Uploaded Music

| Property | Detail |
|----------|--------|
| **Current storage** | Railway Volume — `uploads/music/` |
| **Backup location** | Inside runtime backup as base64 (E3) |
| **Recovery method** | Same as images — restored automatically |
| **Risk level** | **HIGH** — same as images. Music files can be ~35MB max. |

### 1.9 Admin Assets

| Property | Detail |
|----------|--------|
| **Current storage** | Railway Volume — `uploads/assets/admin/` (E19 only creates `public/assets/admin/`) |
| **Backup location** | GitHub only — synced as part of `collectProjectSyncFiles()` via `walkFiles()` (E12) |
| **Recovery method** | Must be re-synced from GitHub after restore |
| **Risk level** | **MEDIUM** — synced to GitHub during normal operation |

### 1.10 Environment Variables

| Property | Detail |
|----------|--------|
| **Current storage** | Railway Dashboard (Environment Variables) |
| **Backup location** | `.env.example` in repo — but actual values are NOT in repo |
| **Recovery method** | Manual re-entry in new Railway dashboard |
| **Risk level** | **HIGH** — if not saved before deletion, values are lost |

---

## 2. IDENTIFYING THE DATA GAP

### What is in runtime backup (survives deletion IF GitHub backup exists):

```
✅ adminUsers
✅ customers (including all client data)
✅ invitations (code, groomName, brideName, gallery[], musicUrl, status, etc.)
✅ guestRsvps (who is coming, phone numbers)
✅ orderRequests (orderNumber, groomName, brideName, phone, status, imageUrls)
✅ analyticsEvents (page visits, clicks)
✅ appSettings (non-project keys ONLY — operational settings)
✅ guestBookMessages (what guests wrote)
✅ coupleMessagesSettings (moderation mode)
✅ clientMessages (admin-to-couple messages)
✅ invitationCheckIns (visitor check-in records)
✅ weddingLiveModes (live stream state)
✅ internalNotes (admin notes)
✅ auditLogs (full audit trail)
✅ backupJobs (history of backups)
✅ syncLogs (history of GitHub syncs)
✅ uploads (images + music — as base64)
```

### What is NOT in runtime backup (LOST unless GitHub Sync had them):

```
❌ Project Content: site-settings
❌ Project Content: home-content
❌ Project Content: home-preview-settings
❌ Project Content: template-settings
❌ Project Content: template-preview-info
❌ Project Content: templates-preview-music
❌ Project Content: music-library
❌ Project Content: legal-pages
❌ Project Content: message-templates
❌ Project Content: content-presets
❌ Project Content: custom-templates
❌ DynamicPage records
❌ WeddingTemplate records
❌ Admin assets (public/assets/admin/*)
```

These are only recoverable if GitHub Sync was operational and last sync was recent (E12).

---

## 3. WHAT CANNOT CURRENTLY BE RESTORED

Based on code analysis:

| Asset | Why it cannot be restored |
|-------|--------------------------|
| **Data created in the last 6 hours** | No WAL, no CDC, no real-time backup. Only snapshot every 6 hours. |
| **Backup itself if GitHub was down** | E6: If GitHub upload fails, the entire `createBackupSnapshot()` throws — even the local file is NOT preserved (it's written at line 413, but the throw at 422-424 causes the caller to see an error; however — the file does exist on disk at that point. But if the account is deleted, the ephemeral disk is gone anyway. The GitHub upload is the survival path, and it failed.) |
| **Project Content if GitHub Sync was not configured** | E14: In production, `readProjectContentSetting()` reads ONLY from PostgreSQL. No file fallback. |
| **Dynamic Pages if GitHub Sync was not configured** | E12: Only backed up to GitHub during sync. |
| **Wedding Templates if GitHub Sync was not configured** | Same as above. |
| **Last 30+ backup files** | E6 (pruneOldRuntimeBackups line 513): GitHub keeps only last 30 |
| **Last 20+ local backup files** | E5 (cleanupOldBackups line 358): only 20 kept locally |

---

## 4. MANUAL INTERVENTION REQUIREMENTS

| Step | Why manual | Code evidence |
|------|-----------|---------------|
| 1. Create new Railway account + project | No automation exists | Deployment is manual |
| 2. Set ALL environment variables | Values are not in repo | `.env.example` exists, actual values don't |
| 3. Download backup file from GitHub | `restoreFromBackup()` requires file on local disk (E9) | E7:955-957 |
| 4. Copy backup file to `data/backups/` | Only path `restoreFromBackup()` checks (E7:950) | E20 |
| 5. Set `ALLOW_DESTRUCTIVE_RESTORE` env var | Hard safety guard (E8) | E8:24-28 |
| 6. Trigger restore via admin UI | `restoreFromBackup()` is only callable via POST to `/api/admin/backups/{fileName}/restore` (E8) | E7, E8 |
| 7. Trigger GitHub Sync after restore | Project Content not restored from backup; must be synced from GitHub (E12) | E24:38, E13 |
| 8. Verify Dynamic Pages + Wedding Templates | These are synced TO GitHub, not FROM GitHub. After restore, sync reads from PostgreSQL + writes to GitHub (E12:337-360). If PostgreSQL was empty (new DB), sync will write EMPTY arrays to GitHub, overwriting the good data. | E12:341-343: `prisma.dynamicPage.findMany()` — reads from current DB state |
| **THIS IS CRITICAL**: After restore, the PostgreSQL database will have the old DynamicPage and WeddingTemplate data from the backup (wait — no it won't. These tables are NOT in the backup (E2). So after restore, DynamicPage and WeddingTemplate tables will be EMPTY. Then GitHub Sync will read from PostgreSQL (empty) and write empty files to GitHub, OVERWRITING the good data. | E12:337-360 |

---

## 5. PRE-MIGRATION CHECKLIST
### Download/export BEFORE deleting Railway account

```
□ [PRE-1] SAVE ALL ENVIRONMENT VARIABLES
     Action: Copy every variable from Railway Dashboard → local text file
     Required: DATABASE_URL, AUTH_SECRET, ADMIN_USERNAME/PASSWORD, ADMIN_SESSION_SECRET,
               CLIENT_ADMIN_USERNAME/PASSWORD, CLIENT_SESSION_SECRET, BACKUP_CRON_SECRET,
               GITHUB_SYNC_TOKEN, GITHUB_SYNC_REPO, GITHUB_SYNC_BRANCH, NEXT_PUBLIC_SITE_URL,
               VAPID keys, WHATSAPP_ORDER_PHONE, GOOGLE_MAPS_API_KEY, etc.
     Why: .env.example has keys but not values

□ [PRE-2] CREATE MANUAL BACKUP (NOW)
     Action: Go to /admin/backups → click "Create Manual Backup"
     Why: Ensures a fresh backup exists just before migration

□ [PRE-3] VERIFY MANUAL BACKUP IN GITHUB
     Action: Go to GitHub repo → `backups/{current-year}/{current-month}/` → confirm new file exists
     Why: E6: If GitHub upload failed, the backup is useless. Download it now if needed.
     Command: gh api repos/{owner}/{repo}/contents/backups/{year}/{month}/ --jq '.[].name'

□ [PRE-4] TRIGGER GITHUB SYNC MANUALLY
     Action: Go to /admin/sync → click "Sync Now"
     Why: Ensures latest Project Content, Dynamic Pages, Wedding Templates, Admin Assets are on GitHub
     Command: POST /api/admin/sync-status (with admin session cookie)

□ [PRE-5] VERIFY GITHUB SYNC SUCCEEDED
     Action: Check GitHub repo → confirm files exist:
       - data/site-settings.json
       - data/home-content.json
       - data/template-settings.json
       - data/music-library.json
       - data/legal-pages.json
       - data/message-templates.json
       - data/content-presets.json
       - data/custom-templates.json
       - data/dynamic-pages.json
       - data/wedding-templates.json
       - public/assets/admin/*
     Why: E12: These files are the ONLY recovery path for Project Content

□ [PRE-6] DOWNLOAD ALL BACKUP FILES FROM GITHUB
     Action: Download ALL .json files from `backups/{year}/{month}/` to your local machine
     Why: E7:956-957: Restore needs file on local disk. If GitHub is unreachable after migration,
          you lose the backup.
     Command: gh api repos/{owner}/{repo}/contents/backups/{year}/{month}/ --jq '.[].download_url' | xargs wget

□ [PRE-7] DOWNLOAD CRITICAL GITHUB DATA FILES
     Action: Download these files to your local machine:
       - data/site-settings.json
       - data/dynamic-pages.json
       - data/wedding-templates.json
       - data/music-library.json
       - data/legal-pages.json
     Why: Backup files for assets NOT in runtime backup

□ [PRE-8] EXPORT POSTGRESQL DIRECTLY (pg_dump — optional but recommended)
     Action: Run pg_dump on your local machine:
     Command: pg_dump --clean --if-exists --no-owner --no-privileges \
              -F c -f badrdaawa-before-migration.dump "$DATABASE_URL"
     Why: Redundancy. The runtime backup is the primary recovery path, but a raw
          pg_dump is the most reliable format. Also captures DynamicPage and WeddingTemplate
          tables that runtime backup excludes.

□ [PRE-9] COUNT ALL ENTITIES (for post-migration verification)
     Action: Record these counts:
       SELECT count(*) FROM "Customer";
       SELECT count(*) FROM "Invitation";
       SELECT count(*) FROM "OrderRequest";
       SELECT count(*) FROM "GuestRsvp";
       SELECT count(*) FROM "GuestBookMessage";
       SELECT count(*) FROM "AppSetting";
       SELECT count(*) FROM "DynamicPage";
       SELECT count(*) FROM "WeddingTemplate";
       SELECT count(*) FROM "BackupJob";
     Why: Required for POST-9 verification

□ [PRE-10] COUNT UPLOAD FILES
     Action: Count files in upload directories:
       ls public/uploads/client-invitations/ | wc -l
       ls public/uploads/music/ | wc -l
       ls public/uploads/order-requests/ | wc -l
       find public/uploads/ -type f | wc -l
     Why: Required for POST-10 verification
```

---

## 6. POST-MIGRATION CHECKLIST
### Verification after new Railway is deployed

```
□ [POST-1] DEPLOY FROM GITHUB
     Action: Connect new Railway project to GitHub repo → deploy
     Verify: Build succeeds, app starts without errors
     Code: E19: `scripts/prepare-production.mjs` runs prisma generate + prisma migrate deploy

□ [POST-2] SET ENVIRONMENT VARIABLES
     Action: Enter ALL variables from PRE-1 into new Railway dashboard
     Verify: DATABASE_URL points to new PostgreSQL
     Code: E17: `lib/db.ts:10-17` — if DATABASE_URL missing, prisma = null

□ [POST-3] VERIFY DATABASE CONNECTION
     Action: Check app logs for: "[DB] DATABASE_URL source: ..."
     Verify: No "No DATABASE_URL found" warning
     Code: `lib/database-url.ts:67-71`

□ [POST-4] CHECK IF POSTGRESQL IS EMPTY
     Action: Navigate to /admin/customers
     Verify: Page shows "0 customers" (empty new DB is expected before restore)
     Action: ssh into Railway or use psql:
       SELECT count(*) FROM "Customer";
     Expected: 0 (or whatever you pre-seeded)

□ [POST-5] COPY BACKUP FILE TO SERVER
     Action: Upload the downloaded backup file (from PRE-6) to `data/backups/`
     Method: Railway Volume mount OR use Railway's file upload
     Alternative: If Railway has no direct file access, you can create a temporary
                  API endpoint to receive the file, OR upload it as a GitHub raw URL
                  and write a one-time script to download it.
     Verify: File exists at `data/backups/{filename}.json`

□ [POST-6] SET ALLOW_DESTRUCTIVE_RESTore
     Action: Add to Railway env:
       ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL
     Verify: Deploy or restart the app
     Code: E8:24-28

□ [POST-7] TRIGGER RESTORE VIA ADMIN UI
     Action: Navigate to /admin/backups → find the backup file → click "Restore"
     Verify: Restore succeeds — you should see itemsRestored > 0
     Code: E7:941-1038 — restores 16 tables + upload files

  ⚠️ CRITICAL: After restore succeeds, the PostgreSQL database now has:
    - All runtime data (customers, invitations, orders, etc.)
    - All upload files restored (images, music as files on disk)
    - BUT: DynamicPage and WeddingTemplate tables are EMPTY
    - BUT: AppSetting rows for project-content: keys are MISSING
    - Reason: E2:228-242 excludes these from backup

□ [POST-8] RE-IMPORT PROJECT CONTENT FROM GITHUB FILES
     ⚠️ CRITICAL: DO NOT trigger GitHub Sync yet!
     Reason: E12:337-360 — syncAdminStateToGitHub() reads DynamicPage and WeddingTemplate
             FROM PostgreSQL. If those tables are empty (they are — not in backup),
             sync will write EMPTY arrays to GitHub, OVERWRITING good data.

     Instead, manually re-import:
     Action 1: Read data/dynamic-pages.json from the downloaded GitHub files
               → INSERT each record into PostgreSQL DynamicPage table
     Action 2: Read data/wedding-templates.json
               → INSERT each record into PostgreSQL WeddingTemplate table
     Action 3: Read each data/{key}.json for project content
               → INSERT or UPSERT into AppSetting table as project-content:{key}
     
     OR: Write a one-time script that reads these JSON files and inserts into PostgreSQL.

□ [POST-9] TRIGGER GITHUB SYNC (NOW SAFE)
     Action: Navigate to /admin/sync → click "Sync Now"
     Verify: Status = "completed", files > 0
     Code: E24:38, E13:771-820
     Why: Now that PostgreSQL has the correct data, sync will re-upload to GitHub

□ [POST-10] VERIFY ALL ENTITIES
     Action: Run the same queries from PRE-9:
       SELECT count(*) FROM "Customer";
       SELECT count(*) FROM "Invitation";
       SELECT count(*) FROM "OrderRequest";
       SELECT count(*) FROM "GuestRsvp";
       SELECT count(*) FROM "GuestBookMessage";
       SELECT count(*) FROM "AppSetting";
       SELECT count(*) FROM "DynamicPage";
       SELECT count(*) FROM "WeddingTemplate";
     Verify: Counts match PRE-9 exactly

□ [POST-11] VERIFY UPLOAD FILES
     Action: Check upload directories:
       find /path/to/uploads/ -type f | wc -l
     Verify: Count matches PRE-10
     Action: Open any invitation in browser → confirm images load
     Action: Open any invitation → confirm music plays

□ [POST-12] VERIFY ADMIN ACCESS
     Action: Log in to /admin/login
     Verify: Admin credentials from environment variables work
     Action: Navigate through:
       - /admin/customers
       - /admin/invitations → open a specific invitation
       - /admin/orders
       - /admin/guest-book
       - /admin/settings
       - /admin/templates
       - /admin/backups
       - /admin/sync
     Verify: All data present and matches pre-migration state

□ [POST-13] VERIFY PUBLIC PAGES
     Action: Open a specific invitation URL (e.g., /{invitation-code})
     Verify: groomName, brideName, weddingDate, gallery images, music all correct
     Action: Submit a test RSVP
     Verify: RSVP is accepted
     Action: Submit a test Guest Book message
     Verify: Message is saved

□ [POST-14] VERIFY ORDER SYSTEM
     Action: Go to /order → fill and submit a test order
     Verify: Order appears in /admin/orders
     Action: Publish the order → confirm invitation is created

□ [POST-15] ENABLE BACKUP CRON
     Action: Set in Railway:
       BACKUP_CRON_SECRET={same as before}
       BACKUP_CRON_URL=https://{new-domain}.railway.app/api/cron/backup
     Verify: Wait for cron schedule or manually test:
       curl -X POST https://{new-domain}.railway.app/api/cron/backup \
         -H "Authorization: Bearer {BACKUP_CRON_SECRET}"
     Verify: Returns {"ok": true}
     Code: `railway-cron.json`, `app/api/cron/backup/route.ts`

□ [POST-16] CREATE FIRST MANUAL BACKUP
     Action: Go to /admin/backups → click "Create Manual Backup"
     Verify: Backup shows "SUCCESS" with GitHub commit SHA
     Code: E6:415-424

□ [POST-17] VERIFY BACKUP ON GITHUB
     Action: Go to GitHub repo → `backups/{current-year}/{current-month}/`
     Verify: New backup file exists with correct size
     Code: E11:405-408

□ [POST-18] REMOVE ALLOW_DESTRUCTIVE_RESTORE
     Action: Delete the env var (or set to empty)
     Why: Safety — prevents accidental destructive operations
     Code: E8:24-28
```

---

## RECOVERY FLOW DIAGRAM

```
START: Railway account deleted
  │
  ├── [PRE-1..PRE-10] Done? → NO → GO BACK AND DO IT
  │
  ├── 1. Create new Railway account
  ├── 2. Provision PostgreSQL
  ├── 3. Deploy app from GitHub     [POST-1]
  ├── 4. Set env vars                [POST-2]
  ├── 5. Verify empty DB             [POST-3, POST-4]
  ├── 6. Upload backup file          [POST-5]
  ├── 7. Enable destructive flag     [POST-6]
  ├── 8. EXECUTE RESTORE             [POST-7]
  │        │
  │        ├── Runtime Data:   ✅ Restored (16 tables)
  │        ├── Uploads:        ✅ Restored (images, music)
  │        ├── Dynamic Pages:  ❌ EMPTY — must re-import      [POST-8]
  │        ├── Wedding Templates: ❌ EMPTY — must re-import    [POST-8]
  │        └── Project Content: ❌ MISSING — must re-import    [POST-8]
  │
  ├── 9. Re-import missing data      [POST-8]
  ├── 10. Trigger GitHub Sync        [POST-9]
  ├── 11. Verify all entities        [POST-10..POST-14]
  ├── 12. Enable Cron + Backup       [POST-15, POST-16]
  ├── 13. Verify on GitHub           [POST-17]
  └── 14. Remove destructive flag    [POST-18]
        │
        END: All invitations, customers, images, music,
             templates, settings and admin panel fully restored.
```

---

## SUMMARY OF CRITICAL FINDINGS

### Backup covers: 16 runtime tables + upload files (images, music)
### Backup does NOT cover: Project Content (11 keys), Dynamic Pages, Wedding Templates

### The restore process has one architectural gap:
`lib/backups.ts:228-242` explicitly excludes project-content keys.
`lib/backups.ts:244-267` does not query DynamicPage or WeddingTemplate.
`scripts/restore-postgres-backup.mjs:66-68` rejects runtime backup files (so pg_restore path is blocked).
`lib/backups.ts:955-957` requires file on local disk.

### The critical manual step (POST-8):
After restore, you MUST manually re-import `data/dynamic-pages.json`, `data/wedding-templates.json`, and `data/*.json` (project content) into PostgreSQL. Triggering GitHub Sync before this step will OVERWRITE the GitHub data with empty arrays.
