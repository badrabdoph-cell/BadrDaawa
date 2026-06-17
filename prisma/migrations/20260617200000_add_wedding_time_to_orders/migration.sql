-- Add weddingTime column to OrderRequest for user-selected event time
ALTER TABLE "OrderRequest" ADD COLUMN "weddingTime" TEXT NOT NULL DEFAULT '07:00 مساءً';
