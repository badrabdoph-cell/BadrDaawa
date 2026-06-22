import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCommitUrl } from "@/lib/github-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(request.nextUrl.searchParams.get("offset")) || 0, 0);

    if (!prisma) {
      return NextResponse.json({ versions: [], total: 0, error: "Database not available" }, { status: 503 });
    }

    const [versions, total] = await Promise.all([
      prisma.contentVersion.findMany({
        orderBy: { version: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.contentVersion.count(),
    ]);

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        commitSha: v.commitSha,
        commitUrl: v.commitSha ? getCommitUrl(v.commitSha) : null,
        publishedBy: v.publishedBy,
        publishedAt: v.publishedAt.toISOString(),
        changedKeys: v.changedKeys,
      })),
      total,
    });
  } catch (error) {
    return NextResponse.json(
      { versions: [], total: 0, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
