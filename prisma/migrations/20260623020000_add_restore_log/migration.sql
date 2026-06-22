-- CreateTable: RestoreLog for tracking restore attempts
CREATE TABLE "RestoreLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileName" TEXT,
    "commitSha" TEXT,
    "itemsRestored" INTEGER,
    "uploadsRestored" INTEGER,
    "error" TEXT,
    "durationMs" INTEGER,
    "details" JSONB,
    "performedBy" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestoreLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RestoreLog_createdAt_idx" ON "RestoreLog"("createdAt");
CREATE INDEX "RestoreLog_status_createdAt_idx" ON "RestoreLog"("status", "createdAt");
CREATE INDEX "RestoreLog_type_createdAt_idx" ON "RestoreLog"("type", "createdAt");
