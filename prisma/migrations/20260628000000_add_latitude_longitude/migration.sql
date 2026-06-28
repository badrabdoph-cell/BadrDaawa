-- Add latitude/longitude columns to Invitation table
ALTER TABLE "Invitation" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Invitation" ADD COLUMN "longitude" DOUBLE PRECISION;

-- Add latitude/longitude columns to OrderRequest table
ALTER TABLE "OrderRequest" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "OrderRequest" ADD COLUMN "longitude" DOUBLE PRECISION;
