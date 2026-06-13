# BadrDaawa Backup, Restore, And GitHub Sync

## Architecture

- PostgreSQL is the only source of truth for Runtime Data.
- GitHub is version control for code and Project Content exports only.
- Runtime backups are never uploaded to GitHub.
- Backups are written to `data/backups` and contain Runtime Data plus customer uploads.
- Project Content is excluded from Runtime backups because it is stored in PostgreSQL and exported to GitHub as project version history.
- Restore is manual-only. There is no GitHub-to-PostgreSQL restore and no automatic backup restore.

## Data Classes

Project Content includes site settings, homepage content, legal/static pages, template settings, preview settings, default music, imported custom templates, `DynamicPage`, `WeddingTemplate`, and admin project assets under `public/assets/admin`.

Runtime Data includes customers, orders, invitations, RSVP rows, guest book messages, client messages, analytics, check-ins, live mode state, internal notes, audit logs, non-project app settings, backup jobs, sync logs, and customer uploads under `public/uploads`.

## Required Environment Variables

Set these in Railway or the target server:

```bash
DATABASE_URL=postgresql://...
BACKUP_CRON_SECRET=long-random-secret
BACKUP_CRON_URL=https://your-live-app-domain.example/api/cron/backup
```

Project Content sync to GitHub additionally requires:

```bash
GITHUB_SYNC_ENABLED=true
GITHUB_SYNC_TOKEN=github_pat_or_token_with_contents_write
GITHUB_SYNC_REPO=owner/repository
GITHUB_SYNC_BRANCH=main
```

Optional:

```bash
BACKUP_RETENTION_COUNT=20
GITHUB_SYNC_MAX_FILE_MB=95
```

## Backup Contents

Each backup JSON contains:

- Runtime PostgreSQL table exports only.
- Customer upload files from `public/uploads`, encoded with base64 and SHA-256 hashes.
- Metadata with table counts, upload counts, and excluded Project Content notes.

Backups do not contain code, default templates, project images, project music, Project Content AppSettings, `DynamicPage`, or `WeddingTemplate`.

## Automatic Backups

Railway Cron is the only automatic scheduler. It uses `railway-cron.json`:

```json
{
  "deploy": {
    "startCommand": "pnpm backup:trigger",
    "cronSchedule": "0 */6 * * *"
  }
}
```

When Railway Cron runs:

1. `pnpm backup:trigger` executes `scripts/trigger-backup-cron.mjs`.
2. The script sends `POST /api/cron/backup` with `Authorization: Bearer $BACKUP_CRON_SECRET`.
3. The API route verifies the secret.
4. `runScheduledTask("backup", "automatic")` runs.
5. `createBackupSnapshot("scheduled")` writes the Runtime Data backup.
6. `BackupJob` is updated to `SUCCESS` or `FAILED`.

No GitHub upload is part of this backup flow.

## Manual Backup

From the admin dashboard, open the Backups page and click the manual backup button. This creates the same Runtime Data backup package and does not queue a GitHub upload.

## Project Content Sync

Admin changes to Project Content save to PostgreSQL first and then queue GitHub Sync. GitHub Sync exports Project Content files such as `data/site-settings.json`, `data/home-content.json`, `data/dynamic-pages.json`, `data/wedding-templates.json`, and project assets under `public/assets/admin`.

Runtime Data and customer uploads are intentionally excluded from GitHub Sync.

## Restore Policy

Automatic restore is disabled. The app route `app/api/admin/recent-edits/restore/route.ts` returns a manual-restore-only redirect.

The restore script is guarded by explicit flags:

```bash
ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL \
DATABASE_URL="postgresql://..." \
node scripts/restore-postgres-backup.mjs ./backup.json --confirm-manual-restore
```

Runtime backup packages are not auto-restored by this script. Restoring Runtime Data requires a reviewed manual plan for the intended target database.

For production restore, an additional acknowledgement is required:

```bash
ALLOW_PRODUCTION_RESTORE=I_UNDERSTAND_THIS_IS_PRODUCTION
```

## Safety Notes

- Runtime backup creation never writes to GitHub.
- GitHub Sync never writes to PostgreSQL.
- Backup restore never runs automatically.
- Backup retention deletes only local old backup files.
- Project Content edits are versioned in GitHub, but PostgreSQL remains the live runtime source.
