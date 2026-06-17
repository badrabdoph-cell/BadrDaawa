import { Camera, CheckCircle2, Image, RefreshCw, Save, UploadCloud, UsersRound, XCircle } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";
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
  const customCount = invitations.filter((inv) => inv.hasCustomLogo).length;
  const defaultCount = invitations.filter((inv) => !inv.hasCustomLogo).length;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "document.addEventListener('DOMContentLoaded',function(){var sa=document.getElementById('select-all');sa&&sa.addEventListener('change',function(){document.querySelectorAll('.inv-select').forEach(function(i){i.checked=sa.checked})})})" }} />

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

      {hasInvitations ? (
        <>
          <div className="admin-metrics-grid" style={{ marginBottom: 16 }}>
            <div className="admin-metric-card">
              <UsersRound size={20} />
              <span>إجمالي الدعوات مع المصور</span>
              <strong>{invitations.length}</strong>
            </div>
            <div className="admin-metric-card">
              <CheckCircle2 size={20} />
              <span>شعار افتراضي</span>
              <strong>{defaultCount}</strong>
            </div>
            <div className="admin-metric-card">
              <XCircle size={20} />
              <span>شعار مخصص</span>
              <strong>{customCount}</strong>
            </div>
          </div>

          <form action="/api/admin/photographer-logo" method="post">
            <input type="hidden" name="mode" value="update-selected" />
            <article className="panel" style={{ marginBottom: 16 }}>
              <div className="admin-card-head" style={{ marginBottom: 14 }}>
                <Image size={22} />
                <div>
                  <span className="eyebrow">Bulk Update</span>
                  <h2>تحديث الدعوات الحالية</h2>
                  <p>اختر الدعوات التي تريد تحديثها بالشعار والبيانات الافتراضية الجديدة.</p>
                </div>
              </div>
              <div className="admin-order-list">
                <div className="admin-order-item" style={{ fontWeight: 600, background: "rgba(245,234,214,0.04)", borderBottom: "1px solid rgba(245,234,214,0.1)" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: "0 0 auto" }}>
                    <input id="select-all" type="checkbox" />
                    <small>الكل</small>
                  </label>
                  <span style={{ flex: 1 }}><strong>اسم العروسين</strong></span>
                  <small style={{ flex: "0 0 90px", textAlign: "center" }}>الحالة</small>
                  <small style={{ flex: "0 0 70px", textAlign: "center" }}>الشعار</small>
                </div>
                {invitations.map((inv) => (
                  <div className="admin-order-item" key={inv.code}>
                    <label style={{ display: "flex", alignItems: "center", flex: "0 0 auto", cursor: "pointer" }}>
                      <input type="checkbox" name="codes" value={inv.code} className="inv-select" defaultChecked />
                    </label>
                    <span>
                      <strong>{inv.groomName} و {inv.brideName}</strong>
                      <small>كود: {inv.code}</small>
                    </span>
                    <em className={`status ${inv.status === "ACTIVE" ? "success" : "neutral"}`} style={{ flex: "0 0 90px", textAlign: "center" }}>
                      {inv.status === "ACTIVE" ? "منشورة" : "مسودة"}
                    </em>
                    {inv.logoUrl ? (
                      <img src={inv.logoUrl} alt="شعار" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: "rgba(255,255,255,0.08)", flex: "0 0 36px" }} />
                    ) : (
                      <Camera size={18} style={{ opacity: 0.3, flex: "0 0 36px" }} />
                    )}
                    <em className={`status ${inv.hasCustomLogo ? "warning" : "success"}`} style={{ flex: "0 0 70px", textAlign: "center" }}>
                      {inv.hasCustomLogo ? "مخصص" : "افتراضي"}
                    </em>
                  </div>
                ))}
              </div>
              <div className="button-row" style={{ marginTop: 16 }}>
                <button className="btn btn-gold btn-glow" type="submit">
                  <RefreshCw size={18} />
                  تحديث المحدد
                </button>
              </div>
            </article>
          </form>
        </>
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
