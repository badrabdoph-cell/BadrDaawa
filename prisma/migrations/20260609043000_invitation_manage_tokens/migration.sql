ALTER TABLE "Invitation" ADD COLUMN "manageToken" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "manageTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Invitation_manageToken_key" ON "Invitation"("manageToken");
CREATE INDEX "Invitation_manageTokenExpiresAt_idx" ON "Invitation"("manageTokenExpiresAt");
