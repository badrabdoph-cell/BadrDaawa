-- Add failure tracking fields to BackupJob

ALTER TABLE "BackupJob" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;
ALTER TABLE "BackupJob" ADD COLUMN IF NOT EXISTS "stage" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN IF NOT EXISTS "attemptedFileName" TEXT;
ALTER TABLE "BackupJob" ADD COLUMN IF NOT EXISTS "githubMessage" TEXT;

-- Index for querying failed jobs
CREATE INDEX IF NOT EXISTS "BackupJob_status_createdAt_idx" ON "BackupJob" ("status", "createdAt" DESC);
