ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "manageToken" TEXT;
ALTER TABLE "OrderRequest" ADD COLUMN IF NOT EXISTS "manageTokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "OrderRequest_manageToken_key" ON "OrderRequest"("manageToken");
CREATE INDEX IF NOT EXISTS "OrderRequest_manageTokenExpiresAt_idx" ON "OrderRequest"("manageTokenExpiresAt");
