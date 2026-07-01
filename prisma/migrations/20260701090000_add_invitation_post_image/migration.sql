ALTER TABLE "Invitation" ADD COLUMN "postImageUrl" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageTemplateId" TEXT DEFAULT 'breaking-news-v1';
ALTER TABLE "Invitation" ADD COLUMN "postImageStatus" TEXT DEFAULT 'NEEDS_REGENERATION';
ALTER TABLE "Invitation" ADD COLUMN "postImageSignature" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Invitation" ADD COLUMN "postImageError" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageWidth" INTEGER;
ALTER TABLE "Invitation" ADD COLUMN "postImageHeight" INTEGER;
