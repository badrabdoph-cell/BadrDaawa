ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "OrderRequest" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Invitation_deletedAt_idx" ON "Invitation"("deletedAt");
CREATE INDEX "OrderRequest_deletedAt_idx" ON "OrderRequest"("deletedAt");
