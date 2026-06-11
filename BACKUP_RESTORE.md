# BadrDaawa Backup And Restore

## Architecture

- PostgreSQL is the only operational source of truth.
- GitHub stores backup files only.
- JSON files inside a backup are settings or legacy reference data, not the primary restore source for operational data.
- Backups are written locally to `data/backups` and uploaded to the configured GitHub repository under `backups/`.
- Retention keeps the latest 20 backup files. Older backup files are deleted from GitHub during a successful upload.

## Required Environment Variables

Set these in Railway or the target server:

```bash
DATABASE_URL=postgresql://...
GITHUB_SYNC_TOKEN=github_pat_or_token_with_contents_write
GITHUB_SYNC_REPO=owner/repository
GITHUB_SYNC_BRANCH=main
```

Optional:

```bash
BACKUP_RETENTION_COUNT=20
GITHUB_BACKUP_REPO_PATH=backups
BACKUP_GITHUB_MAX_FILE_MB=95
BACKUP_GITHUB_MAX_TOTAL_MB=180
```

The runtime server must have PostgreSQL client tools available:

```bash
pg_dump
pg_restore
```

## Backup Contents

Each backup JSON contains:

- A compressed PostgreSQL custom-format dump created by `pg_dump`.
- Database metadata and table counts.
- Important JSON settings and legacy files from `data/*.json`.
- Upload files, limited by the configured backup size limits.

## Automatic Backups

The internal scheduler creates a backup every 6 hours.

When a backup runs:

1. A `BackupJob` row is created with status `RUNNING`.
2. `pg_dump` exports PostgreSQL.
3. A backup JSON is written to `data/backups`.
4. The backup is uploaded to GitHub.
5. A `SyncLog` row records the upload result.
6. GitHub retention removes backups older than the latest 20.

Failures are logged and stored in `BackupJob` or `SyncLog`. A backup or GitHub failure must not delete PostgreSQL data.

## Manual Backup

From the admin dashboard, open the Backups page and click the manual backup button.

The manual backup creates the same PostgreSQL backup package and queues a GitHub upload.

## Restore To A New Railway Project

1. Create the new Railway project and PostgreSQL database.
2. Set `DATABASE_URL` for the BadrDaawa service.
3. Download the latest backup JSON from the GitHub backup repository under `backups/`.
4. Install PostgreSQL client tools in the restore environment.
5. Run:

```bash
DATABASE_URL="postgresql://..." node scripts/restore-postgres-backup.mjs ./latest-backup.json
```

6. Deploy the app normally.
7. Confirm that admin pages, invitations, RSVP, guest book, analytics, and client dashboards read from PostgreSQL.

## Restore To A VPS Or Another Host

1. Provision PostgreSQL.
2. Create an empty database for BadrDaawa.
3. Set `DATABASE_URL` to the new database.
4. Download the latest backup JSON.
5. Run:

```bash
DATABASE_URL="postgresql://..." node scripts/restore-postgres-backup.mjs ./latest-backup.json
```

6. Copy or configure upload storage as needed.
7. Start the app.

## Rollback

Before restoring over an existing database, create a fresh backup of the current database first:

```bash
node scripts/backup.mjs
```

Then run the restore command only after confirming the target `DATABASE_URL`.

## Safety Notes

- Retention deletes only old backup files in GitHub under the backup folder.
- Retention never deletes PostgreSQL data.
- The restore script uses `pg_restore --clean --if-exists`; run it only against the intended target database.
- Keep GitHub tokens private and rotate them if exposed.
