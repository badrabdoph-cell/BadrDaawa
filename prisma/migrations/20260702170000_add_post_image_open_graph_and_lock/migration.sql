ALTER TABLE "Invitation" ADD COLUMN "postImageOgUrl" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageOgSignature" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageOgWidth" INTEGER;
ALTER TABLE "Invitation" ADD COLUMN "postImageOgHeight" INTEGER;
ALTER TABLE "Invitation" ADD COLUMN "postImageGenerationToken" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "postImageGenerationStartedAt" TIMESTAMP(3);
