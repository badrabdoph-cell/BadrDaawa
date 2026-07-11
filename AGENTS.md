# Retry Policy
عند فشل أي طلب (انتهاء اتصال، Free usage exceeded، أو أي خطأ شبيه):
- أقصى محاولتين فقط (محاولة أصلية + محاولة إعادة واحدة)
- لا تزيد مهلة الانتظار بين المحاولات عن 30 ثانية
- لا تقم بمحاولات متكررة أو عشوائية بعد ذلك

# Session Summary — تثبيت مهارات الذكاء الاصطناعي وتفعيل Auto-Pilot

## Goal
تثبيت 68 مهارة (Agent Skills) من skills.sh وتفعيل نمط Auto-Pilot كسلوك افتراضي.

## Progress

### Done
- `findLatestBackupOnGitHub()` in `lib/github-sync.ts` — discovers latest backup via GitHub recursive tree API, returns `{ fileName, commitSha, repoPath, createdAt }` with no DB dependency
- `downloadAndRestoreFromGitHub()` refactored in `lib/backups.ts` — accepts optional `{ githubSha, createdAt }` parameter; falls back to `backupJob` table when not provided
- `instrumentation.ts` rewritten — uses `findLatestBackupOnGitHub()` with fully dynamic `import()` calls inside `register()`; passes commitSha/createdAt directly to `downloadAndRestoreFromGitHub()`
- `lib/auto-restore.ts` updated — same GitHub API discovery approach as `instrumentation.ts`
- `railway-cron.json` changed from `0 */3 * * *` to `0 * * * *` (every 1 hour)
- Rollback system already exists at `lib/publish-rollback.ts` + API route `/api/admin/publish/rollback` — no creation needed
- Build passes (`npm run build` exit 0)
- **Edge runtime crash fixed**: Changed `instrumentation.ts` static top-level imports to dynamic `import()` calls inside `register()`. Next.js 15 produces both Node.js (`instrumentation.js`) and Edge (`edge-instrumentation.js`) variants. Static imports caused the Edge variant to bundle Node builtins (`fs`, `crypto`, `path`, `zlib`), crashing with `ReferenceError: fs is not defined`. Dynamic imports create separate code-split chunks that the Edge runtime never loads (since `register()` never executes in Edge). Verified: `edge-instrumentation.js` has zero Node builtin references; `instrumentation.js` (Node.js) has them as expected.

### Key Decisions
- Auto Restore discovers latest backup via GitHub API (`GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1`) instead of `backupJob` table, solving chicken-and-egg dependency on DB
- `instrumentation.ts` uses only dynamic imports so the Edge runtime bundle never traces Node.js builtins — no `webpackIgnore: true` needed (Next.js code-splitting handles it)
- Backup cron frequency: `0 */3 * * *` → `0 * * * *`

### Next Steps
1. Deploy to production to verify admin no longer crashes with edge-instrumentation error
2. Test end-to-end: new empty Project → deploy → auto-restore restores from latest GitHub backup
3. Remove `ALLOW_DESTRUCTIVE_RESTORE` and `AUTO_RESTORE_ONLY_IF_DB_EMPTY` after verifying

### Critical Context
- **Chicken-and-egg solved**: `findLatestBackupOnGitHub()` uses GitHub recursive tree API to find the latest backup file by timestamp in filename, getting commit SHA from HEAD — no DB query needed
- **Prod crash root cause**: In commit `c9ef609e2 8`, dynamic `await import(/* webpackIgnore: true */ "./lib/backups")` was reverted to static `import { ... } from "./lib/backups"`. This caused Next.js 15's Edge runtime variant of `instrumentation.ts` (`edge-instrumentation.js`) to trace into `backups.ts` and bundle Node builtins. Fix: all imports back to dynamic inside `register()`. The earlier `webpackIgnore: true` comment wasn't needed — plain dynamic imports produce correct code-split chunks that the Edge runtime never evaluates.
- **Env vars**: `GITHUB_SYNC_TOKEN`, `GITHUB_SYNC_REPO`, `ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL`, `AUTO_RESTORE_ONLY_IF_DB_EMPTY=true`
- **Local build**: `npm run build` passes. Crash only manifests in production Edge Runtime, not during build.

### Relevant Files
- `lib/github-sync.ts`: Added `findLatestBackupOnGitHub()` (exported) and `GitHubBackupDiscoveryResult` type
- `lib/backups.ts`: `downloadAndRestoreFromGitHub()` now accepts optional `{ githubSha, createdAt }` parameter
- `instrumentation.ts`: Rewritten — uses `findLatestBackupOnGitHub()` with fully dynamic imports, no top-level imports
- `lib/auto-restore.ts`: Updated to use `findLatestBackupOnGitHub()` via dynamic import
- `railway-cron.json`: Cron schedule changed to every 1 hour
- `lib/publish-rollback.ts` + `app/api/admin/publish/rollback/route.ts`: Rollback system already exists
- `.railway/railway.ts`: Railway Infrastructure as Code — defines PostgreSQL, web service, env vars, healthcheck
- `app/api/health/route.ts`: Healthcheck endpoint for Railway (`/api/health`)
- `scripts/prepare-production.mjs`: Auto-generates missing secrets (AUTH_SECRET, BACKUP_CRON_SECRET, etc.) on first deploy, persisted to `data/.secrets.env`
