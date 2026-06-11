-- Operational JSON entities moved to PostgreSQL.
-- This migration only creates new tables and indexes; it does not delete legacy JSON data.

CREATE TABLE IF NOT EXISTS "GuestBookMessage" (
  "id" TEXT NOT NULL,
  "invitationCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestBookMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CoupleMessagesSetting" (
  "invitationCode" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'moderated',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoupleMessagesSetting_pkey" PRIMARY KEY ("invitationCode")
);

CREATE TABLE IF NOT EXISTS "ClientMessage" (
  "id" TEXT NOT NULL,
  "invitationCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "sender" TEXT NOT NULL DEFAULT 'admin',
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InvitationCheckIn" (
  "id" TEXT NOT NULL,
  "invitationCode" TEXT NOT NULL,
  "visitorKey" TEXT NOT NULL,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvitationCheckIn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeddingLiveMode" (
  "invitationCode" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "announcement" TEXT,
  "events" JSONB NOT NULL DEFAULT '[]',
  "updatedBy" TEXT NOT NULL DEFAULT 'admin',
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeddingLiveMode_pkey" PRIMARY KEY ("invitationCode")
);

CREATE TABLE IF NOT EXISTS "InternalNote" (
  "id" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "authorLabel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorId" TEXT,
  "actorLabel" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "entityLabel" TEXT,
  "oldValues" JSONB,
  "newValues" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GuestBookMessage_invitationCode_status_createdAt_idx" ON "GuestBookMessage"("invitationCode", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "GuestBookMessage_createdAt_idx" ON "GuestBookMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "CoupleMessagesSetting_mode_idx" ON "CoupleMessagesSetting"("mode");
CREATE INDEX IF NOT EXISTS "ClientMessage_invitationCode_createdAt_idx" ON "ClientMessage"("invitationCode", "createdAt");
CREATE INDEX IF NOT EXISTS "ClientMessage_readAt_idx" ON "ClientMessage"("readAt");
CREATE UNIQUE INDEX IF NOT EXISTS "InvitationCheckIn_invitationCode_visitorKey_key" ON "InvitationCheckIn"("invitationCode", "visitorKey");
CREATE INDEX IF NOT EXISTS "InvitationCheckIn_invitationCode_createdAt_idx" ON "InvitationCheckIn"("invitationCode", "createdAt");
CREATE INDEX IF NOT EXISTS "InvitationCheckIn_createdAt_idx" ON "InvitationCheckIn"("createdAt");
CREATE INDEX IF NOT EXISTS "WeddingLiveMode_enabled_updatedAt_idx" ON "WeddingLiveMode"("enabled", "updatedAt");
CREATE INDEX IF NOT EXISTS "InternalNote_entityType_entityId_updatedAt_idx" ON "InternalNote"("entityType", "entityId", "updatedAt");
CREATE INDEX IF NOT EXISTS "InternalNote_updatedAt_idx" ON "InternalNote"("updatedAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorType_createdAt_idx" ON "AuditLog"("actorType", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
