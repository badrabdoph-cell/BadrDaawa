import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { commitContentFiles, type GitHubCommitResult } from "./github-content";
import {
  getAllDraftContent,
  promoteDraftToPublished,
  clearPendingChanges,
  updatePublishMeta,
  acquirePublishLock,
  releasePublishLock,
  getProjectContentDefinitions,
  type ProjectContentKey,
} from "./project-content-store";
import { readAppSetting } from "./app-settings";
import { recordAuditLog, getSystemAuditActor } from "./audit-log";

type PublishResult = {
  success: boolean;
  message: string;
  commitSha: string | null;
  commitUrl: string | null;
  publishedKeys: ProjectContentKey[];
  error?: string;
};

type SinglePublishResult = {
  success: boolean;
  message: string;
  commitSha: string | null;
  commitUrl: string | null;
  error?: string;
};

export async function publishAllChanges(publishedBy: string): Promise<PublishResult> {
  // Acquire lock to prevent concurrent publishes
  const lockAcquired = await acquirePublishLock();
  if (!lockAcquired) {
    return {
      success: false,
      message: "نشر آخر قيد التشغيل حالياً. يرجى المحاولة مرة أخرى بعد قليل.",
      commitSha: null,
      commitUrl: null,
      publishedKeys: [],
    };
  }

  try {
    console.log(`[Publish Pipeline] Starting publish by ${publishedBy}`);

    // Step 1: Read all Draft Content
    const draftContent = await getAllDraftContent();
    const draftKeys = Object.keys(draftContent) as ProjectContentKey[];
    
    if (draftKeys.length === 0) {
      await releasePublishLock();
      return {
        success: false,
        message: "لا توجد تغييرات مسودة للنشر.",
        commitSha: null,
        commitUrl: null,
        publishedKeys: [],
      };
    }

    console.log(`[Publish Pipeline] Found ${draftKeys.length} draft content items`);

    // Step 2: Generate JSON files in memory
    const contentFiles = await generateContentFiles(draftContent);
    
    if (contentFiles.length === 0) {
      await releasePublishLock();
      return {
        success: false,
        message: "فشل في توليد ملفات المحتوى.",
        commitSha: null,
        commitUrl: null,
        publishedKeys: [],
      };
    }

    console.log(`[Publish Pipeline] Generated ${contentFiles.length} content files`);

    // Step 3: Commit to GitHub
    const commitMessage = `chore(content): publish content updates\n\nPublished by: ${publishedBy}\nKeys: ${draftKeys.join(", ")}`;
    const githubResult = await commitContentFiles(contentFiles, commitMessage);

    if (!githubResult.success) {
      await releasePublishLock();
      return {
        success: false,
        message: `فشل في الرفع إلى GitHub: ${githubResult.message}`,
        commitSha: null,
        commitUrl: null,
        publishedKeys: [],
        error: githubResult.message,
      };
    }

    console.log(`[Publish Pipeline] GitHub commit successful: ${githubResult.commitSha}`);

    // Step 4: Promote Draft → Published
    for (const key of draftKeys) {
      await promoteDraftToPublished(key);
    }

    console.log(`[Publish Pipeline] Promoted ${draftKeys.length} items to published`);

    // Step 5: Record ContentVersion
    if (prisma) {
      const latestVersion = await prisma.contentVersion.findFirst({ orderBy: { version: "desc" } });
      const nextVersion = (latestVersion?.version ?? 0) + 1;
      await prisma.contentVersion.create({
        data: {
          version: nextVersion,
          commitSha: githubResult.commitSha,
          publishedBy,
          changedKeys: draftKeys,
        },
      });
      console.log(`[Publish Pipeline] ContentVersion #${nextVersion} recorded`);
    }

    // Step 6: Clear pending changes
    await clearPendingChanges();

    // Step 7: Revalidate all pages
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath("/order");
    revalidatePath("/privacy-policy");
    revalidatePath("/terms");
    revalidatePath("/refund-policy");
    revalidatePath("/usage-policy");
    revalidatePath("/admin");
    revalidatePath("/admin/publish");
    revalidatePath("/admin/broadcast");
    revalidatePath("/admin/texts");
    revalidatePath("/admin/settings");
    console.log(`[Publish Pipeline] Revalidated all pages`);

    // Step 8: Update metadata
    await updatePublishMeta({
      lastPublishedAt: new Date().toISOString(),
      lastPublishedBy: publishedBy,
    });

    console.log(`[Publish Pipeline] Updated publish metadata`);

    // Step 9: Audit Log
    await recordAuditLog({
      actor: getSystemAuditActor(publishedBy),
      action: "content.publish",
      entity: { type: "ContentPublish", id: githubResult.commitSha || "unknown", label: "Publish Content" },
      newValues: {
        commitSha: githubResult.commitSha,
        commitUrl: githubResult.commitUrl,
        publishedKeys: draftKeys,
        publishedBy,
      },
      metadata: {
        keys: draftKeys,
        commitMessage,
      },
    });

    console.log(`[Publish Pipeline] Audit log recorded`);

    await releasePublishLock();

    return {
      success: true,
      message: `تم النشر بنجاح. تم رفع ${draftKeys.length} عنصر إلى GitHub.`,
      commitSha: githubResult.commitSha,
      commitUrl: githubResult.commitUrl,
      publishedKeys: draftKeys,
    };
  } catch (error) {
    console.error(`[Publish Pipeline] Error during publish:`, error);
    await releasePublishLock();

    return {
      success: false,
      message: `حدث خطأ أثناء النشر: ${error instanceof Error ? error.message : "Unknown error"}`,
      commitSha: null,
      commitUrl: null,
      publishedKeys: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function generateContentFiles(draftContent: Record<ProjectContentKey, unknown>): Promise<Array<{ repoPath: string; bytes: Buffer }>> {
  const files: Array<{ repoPath: string; bytes: Buffer }> = [];
  const definitions = getProjectContentDefinitions();

  for (const definition of definitions) {
    const content = draftContent[definition.key];
    if (content === undefined || content === null) continue;

    const jsonContent = JSON.stringify(content, null, 2);
    files.push({
      repoPath: definition.repoPath,
      bytes: Buffer.from(`${jsonContent}\n`, "utf8"),
    });
  }

  // Also include dynamic pages from database
  const dynamicPagesFiles = await generateDynamicPagesFile();
  if (dynamicPagesFiles) {
    files.push(dynamicPagesFiles);
  }

  return files;
}

async function generateDynamicPagesFile(): Promise<{ repoPath: string; bytes: Buffer } | null> {
  try {
    if (!prisma) return null;

    const dynamicPages = await prisma.dynamicPage.findMany({
      orderBy: [{ slug: "asc" }],
      where: { isPublished: true },
    });

    if (dynamicPages.length === 0) return null;

    const jsonContent = JSON.stringify(dynamicPages, null, 2);
    return {
      repoPath: "data/dynamic-pages.json",
      bytes: Buffer.from(`${jsonContent}\n`, "utf8"),
    };
  } catch (error) {
    console.error("[Publish Pipeline] Failed to generate dynamic pages file:", error);
    return null;
  }
}

export async function getLatestContentVersion() {
  if (!prisma) return null;
  try {
    return await prisma.contentVersion.findFirst({ orderBy: { version: "desc" } });
  } catch {
    return null;
  }
}

export async function getAllContentVersions(limit = 50) {
  if (!prisma) return [];
  try {
    return await prisma.contentVersion.findMany({
      orderBy: { version: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function publishSingleContentToGitHub(
  key: ProjectContentKey,
  publishedBy: string,
): Promise<SinglePublishResult> {
  try {
    console.log(`[Publish Single] Publishing ${key} by ${publishedBy}`);

    // Read the published content and generate file
    const definition = getProjectContentDefinitions().find((d) => d.key === key);
    if (!definition) {
      return { success: false, message: `Key ${key} not found in definitions`, commitSha: null, commitUrl: null, error: "Unknown key" };
    }

    const content = await readAppSetting<unknown>(`project-content:published:${key}`);
    if (content === null || content === undefined) {
      return { success: false, message: `No published content found for ${key}`, commitSha: null, commitUrl: null, error: "No content" };
    }

    const jsonContent = JSON.stringify(content, null, 2);
    const contentFiles: Array<{ repoPath: string; bytes: Buffer }> = [
      { repoPath: definition.repoPath, bytes: Buffer.from(`${jsonContent}\n`, "utf8") },
    ];

    // Commit to GitHub
    const commitMessage = `chore(content): auto-publish ${key}\n\nPublished by: ${publishedBy}`;
    const githubResult = await commitContentFiles(contentFiles, commitMessage);

    if (!githubResult.success) {
      // Non-fatal: content is live in DB even if GitHub fails
      console.warn(`[Publish Single] GitHub commit failed for ${key}: ${githubResult.message}`);
    } else {
      console.log(`[Publish Single] GitHub commit successful: ${githubResult.commitSha}`);
    }

    // Record ContentVersion
    if (prisma) {
      try {
        const latestVersion = await prisma.contentVersion.findFirst({ orderBy: { version: "desc" } });
        const nextVersion = (latestVersion?.version ?? 0) + 1;
        await prisma.contentVersion.create({
          data: {
            version: nextVersion,
            commitSha: githubResult.commitSha || null,
            publishedBy,
            changedKeys: [key],
          },
        });
        console.log(`[Publish Single] ContentVersion #${nextVersion} recorded for ${key}`);
      } catch (dbError) {
        console.warn(`[Publish Single] Failed to record ContentVersion: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
    }

    // Revalidate all pages
    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath("/order");
    revalidatePath("/privacy-policy");
    revalidatePath("/terms");
    revalidatePath("/refund-policy");
    revalidatePath("/usage-policy");
    revalidatePath("/admin");
    revalidatePath("/admin/publish");
    revalidatePath("/admin/broadcast");
    revalidatePath("/admin/texts");
    revalidatePath("/admin/settings");
    console.log(`[Publish Single] Revalidated all pages for ${key}`);

    // Audit log
    await recordAuditLog({
      actor: getSystemAuditActor(publishedBy),
      action: "content.publish",
      entity: { type: "ContentPublish", id: githubResult.commitSha || key, label: `Auto-publish ${key}` },
      newValues: {
        commitSha: githubResult.commitSha,
        commitUrl: githubResult.commitUrl,
        publishedKeys: [key],
        publishedBy,
      },
      metadata: {
        keys: [key],
        commitMessage,
      },
    });

    return {
      success: true,
      message: `تم نشر ${key} بنجاح`,
      commitSha: githubResult.commitSha || null,
      commitUrl: githubResult.commitUrl || null,
    };
  } catch (error) {
    console.error(`[Publish Single] Error publishing ${key}:`, error);
    return {
      success: false,
      message: `فشل نشر ${key}: ${error instanceof Error ? error.message : "Unknown error"}`,
      commitSha: null,
      commitUrl: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getPublishStatus() {
  const meta = await import("./project-content-store").then((m) => m.getPublishMeta());
  return meta;
}
