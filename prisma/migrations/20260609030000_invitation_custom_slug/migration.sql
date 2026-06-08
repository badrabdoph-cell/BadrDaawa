ALTER TABLE "Invitation" ADD COLUMN "customSlug" TEXT;

CREATE UNIQUE INDEX "Invitation_customSlug_key" ON "Invitation"("customSlug");
