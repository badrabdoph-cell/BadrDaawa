import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const keys = [
    "project-content:published:site-settings",
    "project-content:published:template-settings",
    "project-content:published:template-preview-info",
    "project-content:published:templates-preview-music",
    "project-content:published:music-library",
    "project-content:published:home-content",
    "project-content:published:home-preview-settings",
    "project-content:published:legal-pages",
    "project-content:published:message-templates",
    "project-content:published:content-presets",
    "project-content:published:custom-templates",
    "project-content:draft:site-settings",
    "project-content:draft:template-settings",
  ];

  for (const key of keys) {
    const row = await prisma.appSetting.findUnique({ where: { key } });
    if (row) {
      console.log(`=== ${key} ===`);
      console.log(JSON.stringify(row.value, null, 2));
    } else {
      console.log(`=== ${key} ===`);
      console.log("(not found)");
    }
  }
} catch (e) {
  console.error("Error:", e.message);
}
await prisma.$disconnect();
