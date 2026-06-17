import { Camera, Save } from "lucide-react";
import { PhotographerBulkUpdate } from "@/components/PhotographerBulkUpdate";
import { PhotographerLogoUploader } from "@/components/PhotographerLogoUploader";
import { getSiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = {
  settings_saved?: string;
  success?: string;
  error?: string;
  updated?: string;
  skipped?: string;
};

function notice(settingsSaved?: string, success?: string, error?: string, updated?: string, skipped?: string) {
  if (error === "invalid") return { kind: "danger", text: "الرجاء تحديد وضع التحديث." };
  if (error === "noselection") return { kind: "danger", text: "لم تختر أي دعوات. اختر دعوة واحدة على الأقل." };
  if (error === "nologo") return { kind: "danger", text: "لا يوجد شعار افتراضي للمصور. ارفع شعاراً أولاً من بيانات المصور الأساسية." };
  if (error === "database") return { kind: "danger", text: "قاعدة البيانات غير متاحة." };
  if (error === "failed") return { kind: "danger", text: "فشلت العملية. حاول مرة أخرى." };
  if (settingsSaved) return { kind: "success", text: "تم حفظ بيانات المصور الأساسية وتحديث القوالب الجاهزة." };
  if (success) {
    const updatedCount = Number(updated) || 0;
    const skippedCount = Number(skipped) || 0;
    let text = `تم تحديث ${updatedCount} دعوة بنجاح.`;
    if (skippedCount) text += ` لم نجد ${skippedCount} دعوة مطابقة.`;
    return { kind: "success", text };
  }
  return null;
}

export default async function AdminPhotographerLogoPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
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

  const hasInvitations = invitations.length > 0;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Photographer Logo</span>
          <h1>إدارة المصور الفوتوغرافي</h1>
          <p>تحكم ببيانات وشعار المصور الافتراضي لكل الدعوات. غيّر الإعدادات ثم حدّث الدعوات التي تريدها دفعة واحدة.</p>
        </div>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <form className="site-settings-form" action="/api/admin/photographer-logo" method="post" encType="multipart/form-data">
        <input type="hidden" name="mode" value="save" />
        <article className="panel" style={{ marginBottom: 16 }}>
          <div className="admin-card-head">
            <Camera size={22} />
            <div>
              <span className="eyebrow">Global Defaults</span>
              <h2>بيانات المصور الأساسية</h2>
              <p>هذه البيانات هي الافتراضية لجميع الدعوات الجديدة. عند تغييرها يُحدّث معاين القوالب الجاهزة تلقائياً.</p>
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
          </div>

          <PhotographerLogoUploader currentLogoUrl={globalLogoUrl || ""} />

          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="btn btn-gold btn-glow" type="submit">
              <Save size={18} />
              حفظ بيانات المصور
            </button>
          </div>
        </article>
      </form>

      {hasInvitations ? (
        <PhotographerBulkUpdate invitations={invitations} />
      ) : (
        <div className="admin-empty-state compact">
          <Camera size={32} />
          <strong>لا توجد دعوات مع مصور</strong>
          <p>ليس هناك أي دعوات تم تفعيل المصور فيها بعد. بعد إنشاء دعوة وتفعيل المصور فيها ستظهر هنا لتتمكن من تحديث شعارها دفعة واحدة.</p>
        </div>
      )}
    </>
  );
}
