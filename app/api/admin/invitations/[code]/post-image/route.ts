import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { isPostImageFeatureEnabled } from "@/lib/post-image/feature-flag";
import { regenerateInvitationPostImage } from "@/lib/post-image/service";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublicSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function isPostImageEnabled() {
  const settings = await getPublishedSiteSettings().catch(() => null);
  return isPostImageFeatureEnabled(settings);
}

function postImagePayload(invitation: {
  code: string;
  customSlug: string | null;
  postImageUrl: string | null;
  postImageStatus: string | null;
  postImageTemplateId: string | null;
  postImageGeneratedAt: Date | null;
  postImageError: string | null;
  postImageWidth: number | null;
  postImageHeight: number | null;
}) {
  return {
    code: invitation.code,
    customSlug: invitation.customSlug,
    url: invitation.postImageUrl,
    status: invitation.postImageStatus || "NEEDS_REGENERATION",
    templateId: invitation.postImageTemplateId || "breaking-news-v1",
    generatedAt: invitation.postImageGeneratedAt?.toISOString() || null,
    error: invitation.postImageError,
    width: invitation.postImageWidth,
    height: invitation.postImageHeight,
    downloadFileName: `post-image-${invitation.code}.png`,
  };
}

async function findInvitation(code: string) {
  if (!prisma) return null;
  return prisma.invitation.findFirst({
    where: {
      deletedAt: null,
      OR: [{ code }, { customSlug: code }],
    },
    select: {
      code: true,
      customSlug: true,
      postImageUrl: true,
      postImageStatus: true,
      postImageTemplateId: true,
      postImageGeneratedAt: true,
      postImageError: true,
      postImageWidth: true,
      postImageHeight: true,
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });
  }

  const { code } = await context.params;
  if (!(await isPostImageEnabled())) return NextResponse.json({ error: "post-image-disabled" }, { status: 404 });
  const invitation = await findInvitation(code);
  if (!invitation) return NextResponse.json({ error: "الدعوة غير موجودة." }, { status: 404 });

  return NextResponse.json({ ok: true, postImage: postImagePayload(invitation) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });
  }

  const { code } = await context.params;
  if (!(await isPostImageEnabled())) return NextResponse.json({ error: "post-image-disabled" }, { status: 404 });
  const invitation = await findInvitation(code);
  if (!invitation) return NextResponse.json({ error: "الدعوة غير موجودة." }, { status: 404 });

  const siteUrl = getPublicSiteUrl(request.headers).replace(/\/$/, "");
  const publicUrl = `${siteUrl}/${invitation.customSlug || invitation.code}`;
  const result = await regenerateInvitationPostImage({ code: invitation.code, publicUrl });
  const updated = await findInvitation(invitation.code);

  return NextResponse.json({
    ok: result.ok,
    result,
    postImage: updated ? postImagePayload(updated) : postImagePayload(invitation),
  });
}
