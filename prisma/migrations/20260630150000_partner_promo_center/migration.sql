-- Partner & Promo Center runtime data.
-- The migration is additive: no existing order, invitation, backup, or content data is removed.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "PartnerType" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'HALL', 'PLANNER', 'DJ', 'MAKEUP_ARTIST', 'DECORATOR', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerTier" AS ENUM ('FREE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerPromoKind" AS ENUM ('PARTNER', 'DISCOUNT', 'GLOBAL', 'REFERRAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerDiscountType" AS ENUM ('NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_INVITATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerUsageResult" AS ENUM ('SUCCESS', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerMessageType" AS ENUM ('INFORMATION', 'WARNING', 'OFFER', 'SUCCESS', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerMessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PartnerMessageTarget" AS ENUM ('ALL_INVITATIONS', 'PUBLISHED_INVITATIONS', 'PENDING_INVITATIONS', 'REJECTED_INVITATIONS', 'DISABLED_INVITATIONS', 'SPECIFIC_INVITATIONS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Partner" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerType" "PartnerType" NOT NULL,
  "displayName" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "logoUrl" TEXT,
  "facebookUrl" TEXT,
  "instagramUrl" TEXT,
  "websiteUrl" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "tiktokUrl" TEXT,
  "youtubeUrl" TEXT,
  "description" TEXT,
  "address" TEXT,
  "tier" "PartnerTier" NOT NULL DEFAULT 'FREE',
  "status" "PartnerStatus" NOT NULL DEFAULT 'DRAFT',
  "subscriptionStatus" "PartnerSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "subscriptionExpiry" TIMESTAMP(3),
  "subscriptionRenewDate" TIMESTAMP(3),
  "subscriptionPrice" DECIMAL(10,2),
  "subscriptionAutoDisable" BOOLEAN NOT NULL DEFAULT true,
  "showPartnerCard" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "internalNotes" TEXT,
  "publicNotes" TEXT,
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerPromoCode" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "referralSlug" TEXT NOT NULL,
  "qrCodeUrl" TEXT,
  "kind" "PartnerPromoKind" NOT NULL DEFAULT 'PARTNER',
  "status" "PartnerStatus" NOT NULL DEFAULT 'DRAFT',
  "discountType" "PartnerDiscountType" NOT NULL DEFAULT 'NONE',
  "discountValue" DECIMAL(10,2),
  "usageLimit" INTEGER,
  "currentUsage" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerPromoCode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerPromoCode_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "DiscountPromoCode" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "internalName" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "internalDescription" TEXT,
  "status" "PartnerStatus" NOT NULL DEFAULT 'DRAFT',
  "discountType" "PartnerDiscountType" NOT NULL DEFAULT 'NONE',
  "discountValue" DECIMAL(10,2),
  "usageLimit" INTEGER,
  "currentUsage" INTEGER NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "restrictions" JSONB,
  "lastUsedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscountPromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerUsageLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT,
  "promoId" TEXT,
  "orderId" TEXT,
  "invitationId" TEXT,
  "customerIp" TEXT,
  "device" TEXT,
  "browser" TEXT,
  "country" TEXT,
  "result" "PartnerUsageResult" NOT NULL,
  "failureReason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerUsageLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerUsageLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerUsageLog_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "PartnerPromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerActivityLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT,
  "action" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "performedBy" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerActivityLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerActivityLog_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerMessage" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "type" "PartnerMessageType" NOT NULL DEFAULT 'INFORMATION',
  "priority" "PartnerMessagePriority" NOT NULL DEFAULT 'NORMAL',
  "target" "PartnerMessageTarget" NOT NULL DEFAULT 'ALL_INVITATIONS',
  "icon" TEXT,
  "color" TEXT,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "dismissible" BOOLEAN NOT NULL DEFAULT true,
  "showOnce" BOOLEAN NOT NULL DEFAULT false,
  "showEveryVisit" BOOLEAN NOT NULL DEFAULT false,
  "requireConfirmation" BOOLEAN NOT NULL DEFAULT false,
  "startDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerMessage_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerMessageRecipient" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "messageId" TEXT NOT NULL,
  "invitationId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerMessageRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerMessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "PartnerMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerMessageRecipient_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerSubscription" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT NOT NULL,
  "status" "PartnerSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "plan" "PartnerTier" NOT NULL DEFAULT 'FREE',
  "price" DECIMAL(10,2),
  "renewDate" TIMESTAMP(3),
  "expiryDate" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerSubscription_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerFile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "partnerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" BIGINT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "PartnerFile_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PartnerFile_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PartnerTag" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerTagAssignment" (
  "partnerId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerTagAssignment_pkey" PRIMARY KEY ("partnerId", "tagId"),
  CONSTRAINT "PartnerTagAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PartnerTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PartnerTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "partnerId" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "partnerPromoId" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "discountPromoId" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "partnerSnapshot" JSONB;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "discountSnapshot" JSONB;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "partnerAppliedAt" TIMESTAMP(3);
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "referralSource" TEXT;

ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "partnerSnapshot" JSONB;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "promoSnapshot" JSONB;
ALTER TABLE "Invitation" ADD COLUMN IF NOT EXISTS "partnerPublishedAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_partnerPromoId_fkey" FOREIGN KEY ("partnerPromoId") REFERENCES "PartnerPromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_discountPromoId_fkey" FOREIGN KEY ("discountPromoId") REFERENCES "DiscountPromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Partner_slug_key" ON "Partner"("slug");
CREATE INDEX IF NOT EXISTS "Partner_partnerType_status_idx" ON "Partner"("partnerType", "status");
CREATE INDEX IF NOT EXISTS "Partner_tier_status_idx" ON "Partner"("tier", "status");
CREATE INDEX IF NOT EXISTS "Partner_subscriptionStatus_subscriptionExpiry_idx" ON "Partner"("subscriptionStatus", "subscriptionExpiry");
CREATE INDEX IF NOT EXISTS "Partner_deletedAt_idx" ON "Partner"("deletedAt");
CREATE INDEX IF NOT EXISTS "Partner_archivedAt_idx" ON "Partner"("archivedAt");
CREATE INDEX IF NOT EXISTS "Partner_createdAt_idx" ON "Partner"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPromoCode_code_key" ON "PartnerPromoCode"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPromoCode_referralSlug_key" ON "PartnerPromoCode"("referralSlug");
CREATE INDEX IF NOT EXISTS "PartnerPromoCode_partnerId_status_idx" ON "PartnerPromoCode"("partnerId", "status");
CREATE INDEX IF NOT EXISTS "PartnerPromoCode_code_idx" ON "PartnerPromoCode"("code");
CREATE INDEX IF NOT EXISTS "PartnerPromoCode_referralSlug_idx" ON "PartnerPromoCode"("referralSlug");
CREATE INDEX IF NOT EXISTS "PartnerPromoCode_status_expiryDate_idx" ON "PartnerPromoCode"("status", "expiryDate");
CREATE INDEX IF NOT EXISTS "PartnerPromoCode_createdAt_idx" ON "PartnerPromoCode"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "DiscountPromoCode_code_key" ON "DiscountPromoCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountPromoCode_status_expiryDate_idx" ON "DiscountPromoCode"("status", "expiryDate");
CREATE INDEX IF NOT EXISTS "DiscountPromoCode_discountType_status_idx" ON "DiscountPromoCode"("discountType", "status");
CREATE INDEX IF NOT EXISTS "DiscountPromoCode_deletedAt_idx" ON "DiscountPromoCode"("deletedAt");
CREATE INDEX IF NOT EXISTS "DiscountPromoCode_createdAt_idx" ON "DiscountPromoCode"("createdAt");

CREATE INDEX IF NOT EXISTS "PartnerUsageLog_partnerId_createdAt_idx" ON "PartnerUsageLog"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerUsageLog_promoId_createdAt_idx" ON "PartnerUsageLog"("promoId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerUsageLog_orderId_idx" ON "PartnerUsageLog"("orderId");
CREATE INDEX IF NOT EXISTS "PartnerUsageLog_invitationId_idx" ON "PartnerUsageLog"("invitationId");
CREATE INDEX IF NOT EXISTS "PartnerUsageLog_result_createdAt_idx" ON "PartnerUsageLog"("result", "createdAt");

CREATE INDEX IF NOT EXISTS "PartnerActivityLog_partnerId_createdAt_idx" ON "PartnerActivityLog"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerActivityLog_action_createdAt_idx" ON "PartnerActivityLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerActivityLog_createdAt_idx" ON "PartnerActivityLog"("createdAt");

CREATE INDEX IF NOT EXISTS "PartnerMessage_partnerId_createdAt_idx" ON "PartnerMessage"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerMessage_target_startDate_expiryDate_idx" ON "PartnerMessage"("target", "startDate", "expiryDate");
CREATE INDEX IF NOT EXISTS "PartnerMessage_priority_createdAt_idx" ON "PartnerMessage"("priority", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerMessage_deletedAt_idx" ON "PartnerMessage"("deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerMessageRecipient_messageId_invitationId_key" ON "PartnerMessageRecipient"("messageId", "invitationId");
CREATE INDEX IF NOT EXISTS "PartnerMessageRecipient_invitationId_createdAt_idx" ON "PartnerMessageRecipient"("invitationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerMessageRecipient_viewedAt_idx" ON "PartnerMessageRecipient"("viewedAt");
CREATE INDEX IF NOT EXISTS "PartnerMessageRecipient_dismissedAt_idx" ON "PartnerMessageRecipient"("dismissedAt");

CREATE INDEX IF NOT EXISTS "PartnerSubscription_partnerId_createdAt_idx" ON "PartnerSubscription"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "PartnerSubscription_status_expiryDate_idx" ON "PartnerSubscription"("status", "expiryDate");

CREATE INDEX IF NOT EXISTS "PartnerFile_partnerId_uploadedAt_idx" ON "PartnerFile"("partnerId", "uploadedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerTag_name_key" ON "PartnerTag"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerTag_slug_key" ON "PartnerTag"("slug");
CREATE INDEX IF NOT EXISTS "PartnerTag_createdAt_idx" ON "PartnerTag"("createdAt");
CREATE INDEX IF NOT EXISTS "PartnerTagAssignment_tagId_idx" ON "PartnerTagAssignment"("tagId");

CREATE INDEX IF NOT EXISTS "OrderRequest_partnerId_createdAt_idx" ON "OrderRequest"("partnerId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderRequest_partnerPromoId_createdAt_idx" ON "OrderRequest"("partnerPromoId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderRequest_discountPromoId_createdAt_idx" ON "OrderRequest"("discountPromoId", "createdAt");
