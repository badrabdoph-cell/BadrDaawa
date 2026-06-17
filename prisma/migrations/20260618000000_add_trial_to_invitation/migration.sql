-- Add trial fields to Invitation for trial publishing feature
ALTER TABLE "Invitation" ADD COLUMN "trialDays" INTEGER;
ALTER TABLE "Invitation" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Invitation_trialEndsAt_idx" ON "Invitation" ("trialEndsAt");
