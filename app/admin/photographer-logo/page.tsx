import { Camera, CheckCircle2, Image, RefreshCw, Save, UploadCloud, UsersRound, XCircle } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type PhotographerLogoPageParams = {
  settings_saved?: string;
  success?: string;
  error?: string;
  updated?: string;
  skipped?: string;
};

function notice(settingsSaved?: string, success?: string, error?: string, updated?: string, skipped?: string) {
  if (error === "invalid") return { kind: "danger", text: "الرجاء تحديد وضع التحديث." };
  if (error === "nologo") return { kind: "danger", text: "لا يوجد شعار افتراضي للمصور. قم برفع شعار أولاً." };
  if (error === "database") return { kind: "danger", text: "قاعدة البيانات غير متاحة." };
  if (error === "failed") return { kind: "danger", text: "فشلت العملية. حاول مرة أخرى." };
  if (settingsSaved) return { kind: "success", text: "تم حفظ بيانات المصور الأساسية بنجاح." };
  if (success) {
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
  const message = notice(params.settings_saved, params.success, params.error, params.updated, params.skipped);

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
          <h1>إدارة المصور الفوتوغرافي</h1>
          <p>تحكم ببيانات وشعار المصور الافتراضي لكل الدعوات. غيّر الشعار والبيانات ثم حدّث الدعوات الحالية دفعة واحدة.</p>
        </div>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <form className="site-settings-form" action="/api/admin/photographer-logo" method="post" encType="multipart/form-data">
        <input type="hidden" name="mode" value="save" />
        <article className="panel" style={{ marginBottom: 16 }}>
          <div className="admin-card-head">
            <Camera size={22} />
            <div>
              <span className="eyebrow">Photographer Settings</span>
              <h2>بيانات المصور الأساسية</h2>
              <p>هذه البيانات والشعار هي الافتراضية لكل الدعوات الجديدة والحالية عند تحديثها.</p>
            </div>
          </div>

          <label className="admin-toggle-row template-inline-toggle" style={{ marginBottom: 16 }}>
            <input name="showPhotographerCard" type="checkbox" defaultChecked={settings.photographer.showPhotographerCard} />
            إظهار بيانات المصور داخل الدعوات
          </label>

          <div className="admin-form-grid">
            <label className="field">
              <span>اسم المصور</span>
              <input name="photographerName" defaultValue={settings.photographer.defaultName} />
            </label>
            <label className="field">
              <span>رابط إنستجرام</span>
              <input name="photographerInstagramUrl" defaultValue={settings.photographer.defaultInstagramUrl} placeholder="https://instagram.com/..." />
            </label>
            <label className="field">
              <span>رابط فيسبوك</span>
              <input name="photographerFacebookUrl" defaultValue={settings.photographer.defaultFacebookUrl} placeholder="https://facebook.com/..." />
            </label>
            <label className="field">
              <span>شعار المصور</span>
              <input name="photographerLogoFile" type="file" accept={acceptedImageFormats} />
              <small>أفضل قياس: 200×200 بكسل. صيغ مدعومة: JPG, PNG, WebP</small>
            </label>
          </div>

          {globalLogoUrl ? (
            <div className="site-settings-logo-preview" style={{ marginTop: 16 }}>
              <UploadCloud size={18} />
              <img src={globalLogoUrl} alt="شعار المصور الافتراضي" />
              <span>{globalLogoUrl}</span>
            </div>
          ) : null}

          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="btn btn-gold btn-glow" type="submit">
              <Save size={18} />
              حفظ بيانات المصور
            </button>
          </div>
        </article>
      </form>

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
