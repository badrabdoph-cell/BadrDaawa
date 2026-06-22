import { prisma } from "./db";
import { writeDraftContent, type ProjectContentKey } from "./project-content-store";
import { publishAllChanges } from "./publish-pipeline";
import { downloadContentFromGitHubCommit } from "./github-content";
import { recordAuditLog, getSystemAuditActor } from "./audit-log";

export type RollbackResult = {
  success: boolean;
  message: string;
  rollbackVersion: number;
  rolledBackToSha: string | null;
  restoredKeys: string[];
  newVersion: number | null;
  newCommitSha: string | null;
  newCommitUrl: string | null;
  error?: string;
};

export async function rollbackToVersion(version: number, rolledBackBy: string): Promise<RollbackResult> {
  if (!prisma) {
    return { success: false, message: "قاعدة البيانات غير متوفرة.", rollbackVersion: version, rolledBackToSha: null, restoredKeys: [], newVersion: null, newCommitSha: null, newCommitUrl: null, error: "Database not available" };
  }

  const target = await prisma.contentVersion.findFirst({ where: { version }, orderBy: { version: "desc" } });

  if (!target) {
    return { success: false, message: `الإصدار #${version} غير موجود.`, rollbackVersion: version, rolledBackToSha: null, restoredKeys: [], newVersion: null, newCommitSha: null, newCommitUrl: null, error: "Version not found" };
  }

  if (!target.commitSha) {
    return { success: false, message: `الإصدار #${version} لا يحتوي على commit SHA.`, rollbackVersion: version, rolledBackToSha: null, restoredKeys: [], newVersion: null, newCommitSha: null, newCommitUrl: null, error: "No commit SHA" };
  }

  try {
    const content = await downloadContentFromGitHubCommit(target.commitSha);
    if (!content) {
      return { success: false, message: `فشل تحميل محتوى الإصدار #${version} من GitHub.`, rollbackVersion: version, rolledBackToSha: target.commitSha, restoredKeys: [], newVersion: null, newCommitSha: null, newCommitUrl: null, error: "Failed to download content from GitHub" };
    }

    const restoredKeys: string[] = [];
    for (const [key, value] of Object.entries(content)) {
      await writeDraftContent(key as ProjectContentKey, value);
      restoredKeys.push(key);
    }

    const publishResult = await publishAllChanges(rolledBackBy);

    if (!publishResult.success) {
      return { success: false, message: `تمت استعادة المحتوى إلى المسودة لكن فشل النشر: ${publishResult.message}`, rollbackVersion: version, rolledBackToSha: target.commitSha, restoredKeys, newVersion: null, newCommitSha: null, newCommitUrl: null, error: publishResult.error };
    }

    await recordAuditLog({
      actor: getSystemAuditActor(rolledBackBy),
      action: "content.rollback",
      entity: { type: "ContentVersion", id: String(version), label: `Rollback to version #${version}` },
      oldValues: { rollbackVersion: version, commitSha: target.commitSha },
      newValues: { newVersion: publishResult.publishedKeys, newCommitSha: publishResult.commitSha },
      metadata: { source: "admin-rollback", restoredKeys, rolledBackBy },
    });

    return {
      success: true,
      message: `تمت استعادة الإصدار #${version} ونشره بنجاح.`,
      rollbackVersion: version,
      rolledBackToSha: target.commitSha,
      restoredKeys,
      newVersion: publishResult.commitSha ? (await prisma.contentVersion.findFirst({ orderBy: { version: "desc" } }))?.version ?? null : null,
      newCommitSha: publishResult.commitSha,
      newCommitUrl: publishResult.commitUrl,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `فشل الاستعادة: ${msg}`, rollbackVersion: version, rolledBackToSha: target.commitSha, restoredKeys: [], newVersion: null, newCommitSha: null, newCommitUrl: null, error: msg };
  }
}
