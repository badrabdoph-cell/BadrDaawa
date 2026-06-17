-- CreateTable
CREATE TABLE "SafeBackup" (
    "id" TEXT NOT NULL,
    "backupFileName" TEXT NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT,

    CONSTRAINT "SafeBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SafeBackup_backupFileName_key" ON "SafeBackup"("backupFileName");

-- CreateIndex
CREATE INDEX "SafeBackup_markedAt_idx" ON "SafeBackup"("markedAt");
