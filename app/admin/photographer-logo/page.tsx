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
    <section className="admin-command-center photographer-logo-admin">
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

      {globalLogoUrl ? (
        <article className="panel photographer-logo-current">
          <div className="admin-card-head">
            <Camera size={22} />
            <div>
              <span className="eyebrow">Current Global Logo</span>
              <h2>الشعار الافتراضي الحالي</h2>
            </div>
          </div>
          <div className="photographer-logo-preview-box">
            <img src={globalLogoUrl} alt="شعار المصور الافتراضي" />
            <div>
              <strong>{settings.photographer.defaultName}</strong>
              <span className="photographer-logo-path">{globalLogoUrl}</span>
            </div>
          </div>
        </article>
      ) : (
        <article className="panel photographer-logo-current">
          <div className="admin-card-head">
            <UploadCloud size={22} />
            <div>
              <span className="eyebrow">No Logo Set</span>
              <h2>لا يوجد شعار افتراضي</h2>
            </div>
          </div>
          <p className="admin-muted-paragraph">
            لم تقم برفع شعار افتراضي للمصور بعد. يمكنك رفعه من{" "}
            <Link href="/admin/settings">إعدادات الموقع</Link> ثم العودة لتحديث الدعوات الحالية.
          </p>
        </article>
      )}

      {invitations.length > 0 ? (
        <>
          <article className="panel photographer-logo-stats-panel">
            <div className="admin-card-head">
              <UsersRound size={22} />
              <div>
                <span className="eyebrow">Invitations Overview</span>
                <h2>إحصائيات الدعوات</h2>
              </div>
            </div>
            <div className="photographer-logo-stats">
              <div className="photographer-logo-stat">
                <UsersRound size={20} />
                <span>إجمالي الدعوات مع المصور</span>
                <strong>{invitations.length}</strong>
              </div>
              <div className="photographer-logo-stat good">
                <CheckCircle2 size={20} />
                <span>شعار افتراضي (لم يتغير)</span>
                <strong>{defaultCount}</strong>
              </div>
              <div className="photographer-logo-stat warning">
                <XCircle size={20} />
                <span>شعار مخصص (تم تغييره)</span>
                <strong>{customCount}</strong>
              </div>
            </div>
          </article>

          <div className="photographer-logo-bulk-actions">
            <form action="/api/admin/photographer-logo" method="post">
              <input type="hidden" name="action" value="update" />
              <button className="btn btn-gold btn-glow" type="submit" name="mode" value="defaults-only">
                <RefreshCw size={18} />
                تحديث الدعوات التي لم يتغير شعارها فقط ({defaultCount})
              </button>
              <button className="btn btn-soft" type="submit" name="mode" value="all">
                <RefreshCw size={18} />
                تحديث الكل (بما فيهم المخصص) ({invitations.length})
              </button>
            </form>
          </div>

          <article className="panel">
            <div className="admin-card-head">
              <Image size={22} />
              <div>
                <span className="eyebrow">Invitation List</span>
                <h2>قائمة الدعوات</h2>
                <p>الدعوات التي تم تفعيل المصور فيها. الدعوات ذات الشعار المخصص لن تتأثر عند تحديث الشعار الافتراضي إلا إذا اخترت "تحديث الكل".</p>
              </div>
            </div>
            <div className="photographer-logo-list">
              {invitations.map((inv) => (
                <div className={`photographer-logo-item ${inv.hasCustomLogo ? "custom" : "default"}`} key={inv.code}>
                  <div className="photographer-logo-item-info">
                    <strong>{inv.groomName} و {inv.brideName}</strong>
                    <span>كود: {inv.code}</span>
                  </div>
                  <div className="photographer-logo-item-logo">
                    {inv.logoUrl ? (
                      <img src={inv.logoUrl} alt="شعار" />
                    ) : (
                      <span className="photographer-logo-empty">—</span>
                    )}
                  </div>
                  <span className={`photographer-logo-source-badge ${inv.hasCustomLogo ? "custom" : "global"}`}>
                    {inv.hasCustomLogo ? "شعار مخصص" : "شعار افتراضي"}
                  </span>
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
    </section>
  );
}
