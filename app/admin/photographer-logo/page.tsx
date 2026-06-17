import Link from "next/link";
import { Camera, CheckCircle2, Image, RefreshCw, Settings, UploadCloud, UsersRound, XCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PhotographerLogoPageParams = {
  success?: string;
  error?: string;
  updated?: string;
  skipped?: string;
};

function notice(saved?: string, error?: string, updated?: string, skipped?: string) {
  if (error === "invalid") return { kind: "danger", text: "الرجاء تحديد وضع التحديث." };
  if (error === "nologo") return { kind: "danger", text: "لا يوجد شعار افتراضي للمصور. قم برفع شعار أولاً من إعدادات الموقع." };
  if (error === "database") return { kind: "danger", text: "قاعدة البيانات غير متاحة." };
  if (error === "failed") return { kind: "danger", text: "فشلت عملية التحديث. حاول مرة أخرى." };
  if (saved) {
    const updatedCount = Number(updated) || 0;
    const skippedCount = Number(skipped) || 0;
    let text = `تم تحديث ${updatedCount} دعوة بنجاح.`;
    if (skippedCount) text += ` تخطي ${skippedCount} دعوة بشعار مخصص.`;
    return { kind: "success", text };
  }
  return null;
}

export default async function AdminPhotographerLogoPage({
  searchParams,
}: {
  searchParams: Promise<PhotographerLogoPageParams>;
}) {
  const [params, settings] = await Promise.all([searchParams, getSiteSettings()]);
  const message = notice(params.success, params.error, params.updated, params.skipped);

  const globalLogoUrl = settings.photographer.defaultLogoUrl;

  let invitations: Array<{
    code: string;
    groomName: string;
    brideName: string;
    status: string;
    logoUrl: string;
    logoSource: string;
    hasCustomLogo: boolean;
  }> = [];

  try {
    if (prisma) {
      const dbInvitations = await prisma.invitation.findMany({
        where: { deletedAt: null },
        select: {
          code: true,
          groomName: true,
          brideName: true,
          photographer: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      });

      invitations = dbInvitations
        .filter((inv) => {
          if (!inv.photographer || typeof inv.photographer !== "object") return false;
          const raw = inv.photographer as Record<string, unknown>;
          return raw.enabled !== false;
        })
        .map((inv) => {
          const raw = inv.photographer as Record<string, unknown>;
          const logoUrl = typeof raw.logoUrl === "string" ? raw.logoUrl : "";
          const logoSource = raw._logoSource === "custom" ? "custom" : "global";
          return {
            code: inv.code,
            groomName: inv.groomName,
            brideName: inv.brideName,
            status: inv.status,
            logoUrl,
            logoSource,
            hasCustomLogo: logoSource === "custom" && Boolean(logoUrl),
          };
        });
    }
  } catch (error) {
    console.error("[Photographer Logo Page] Failed to load invitations", error);
  }

  const customCount = invitations.filter((inv) => inv.hasCustomLogo).length;
  const defaultCount = invitations.filter((inv) => !inv.hasCustomLogo).length;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Photographer Logo</span>
          <h1>إدارة شعار المصور</h1>
          <p>تحكم بالشعار الافتراضي للمصور في جميع الدعوات. يمكنك تحديث الكل دفعة واحدة أو فقط الدعوات التي لم يتم تخصيص شعار لها.</p>
        </div>
        <Link className="btn btn-soft" href="/admin/settings">
          <Settings size={17} />
          إعدادات الموقع
        </Link>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <article className="panel" style={{ marginBottom: 16 }}>
        <div className="admin-card-head">
          <Camera size={22} />
          <div>
            <span className="eyebrow">{globalLogoUrl ? "Current Global Logo" : "No Logo Set"}</span>
            <h2>{globalLogoUrl ? "الشعار الافتراضي الحالي" : "لا يوجد شعار افتراضي"}</h2>
          </div>
        </div>
        {globalLogoUrl ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
            <img src={globalLogoUrl} alt="شعار المصور الافتراضي" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "contain", background: "rgba(255,255,255,0.08)" }} />
            <div>
              <strong style={{ color: "#fff7e8", display: "block" }}>{settings.photographer.defaultName}</strong>
              <small style={{ color: "rgba(245,234,214,0.58)", wordBreak: "break-all" }}>{globalLogoUrl}</small>
            </div>
          </div>
        ) : (
          <p style={{ color: "rgba(245,234,214,0.58)", marginTop: 12 }}>
            لم تقم برفع شعار افتراضي للمصور بعد. يمكنك رفعه من{" "}
            <Link href="/admin/settings">إعدادات الموقع</Link> ثم العودة لتحديث الدعوات الحالية.
          </p>
        )}
      </article>

      {invitations.length > 0 ? (
        <>
          <div className="admin-metrics-grid" style={{ marginBottom: 16 }}>
            <div className="admin-metric-card">
              <UsersRound size={20} />
              <span>إجمالي الدعوات مع المصور</span>
              <strong>{invitations.length}</strong>
            </div>
            <div className="admin-metric-card">
              <CheckCircle2 size={20} />
              <span>شعار افتراضي (لم يتغير)</span>
              <strong>{defaultCount}</strong>
            </div>
            <div className="admin-metric-card">
              <XCircle size={20} />
              <span>شعار مخصص (تم تغييره)</span>
              <strong>{customCount}</strong>
            </div>
          </div>

          <form action="/api/admin/photographer-logo" method="post" style={{ marginBottom: 16 }}>
            <div className="button-row">
              <button className="btn btn-gold btn-glow" type="submit" name="mode" value="defaults-only">
                <RefreshCw size={18} />
                تحديث الدعوات التي لم يتغير شعارها فقط ({defaultCount})
              </button>
              <button className="btn btn-soft" type="submit" name="mode" value="all">
                <RefreshCw size={18} />
                تحديث الكل ({invitations.length})
              </button>
            </div>
          </form>

          <article className="panel">
            <div className="admin-card-head" style={{ marginBottom: 14 }}>
              <Image size={22} />
              <div>
                <span className="eyebrow">Invitation List</span>
                <h2>قائمة الدعوات</h2>
              </div>
            </div>
            <div className="admin-order-list">
              {invitations.map((inv) => (
                <div className="admin-order-item" key={inv.code}>
                  <span>
                    <strong>{inv.groomName} و {inv.brideName}</strong>
                    <small>كود: {inv.code} | {inv.logoUrl ? "يوجد شعار" : "لا يوجد شعار"}</small>
                  </span>
                  {inv.logoUrl ? (
                    <img src={inv.logoUrl} alt="شعار" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: "rgba(255,255,255,0.08)", flex: "0 0 auto" }} />
                  ) : (
                    <Camera size={20} style={{ opacity: 0.3, flex: "0 0 auto" }} />
                  )}
                  <em className={`status ${inv.hasCustomLogo ? "warning" : "success"}`}>
                    {inv.hasCustomLogo ? "شعار مخصص" : "شعار افتراضي"}
                  </em>
                </div>
              ))}
            </div>
          </article>
        </>
      ) : (
        <div className="admin-empty-state compact">
          <Camera size={32} />
          <strong>لا توجد دعوات مع مصور</strong>
          <p>ليس هناك أي دعوات تم تفعيل المصور فيها بعد.</p>
        </div>
      )}
    </>
  );
}
