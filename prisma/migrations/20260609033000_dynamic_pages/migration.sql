CREATE TABLE "DynamicPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DynamicPage_slug_key" ON "DynamicPage"("slug");

CREATE INDEX "DynamicPage_isPublished_updatedAt_idx" ON "DynamicPage"("isPublished", "updatedAt");
