CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "commitSha" TEXT,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedKeys" TEXT[] NOT NULL,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentVersion_version_key" ON "ContentVersion"("version");
