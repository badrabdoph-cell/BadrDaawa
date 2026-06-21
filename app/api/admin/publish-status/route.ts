import { NextResponse } from "next/server";
import { getPublishMeta } from "@/lib/project-content-store";
import { getLatestContentVersion } from "@/lib/publish-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [meta, latestVersion] = await Promise.all([getPublishMeta(), getLatestContentVersion()]);
    return NextResponse.json({
      hasUnpublishedChanges: meta.hasUnpublishedChanges,
      pendingChanges: Object.keys(meta.pendingChanges || {}).length,
      latestVersion: latestVersion
        ? {
            version: latestVersion.version,
            publishedAt: latestVersion.publishedAt,
            publishedBy: latestVersion.publishedBy,
            commitSha: latestVersion.commitSha,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ hasUnpublishedChanges: false, pendingChanges: 0, latestVersion: null });
  }
}
