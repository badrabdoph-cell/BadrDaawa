import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { Camera, Copy, ExternalLink, Save, UploadCloud } from "lucide-react";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { AdminPromoTestButton } from "@/components/AdminPromoTestButton";
import { CopyButton } from "@/components/CopyButton";
import { prisma } from "@/lib/db";
import { buildShortReferralPath, buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { createQuickPromoCodeAction } from "../actions";

export const dynamic = "force-dynamic";

type PageParams = {
  created?: string;
  error?: string;
  linkTest?: string;
};

function errorMessage(value?: string) {
  if (value === "database_unavailable" || value === "database") return "قاعدة البيانات غير متاحة حالياً.";
  if (value === "name") return "اسم المصور مطلوب.";
  if (value === "discount") return "قيمة الخصم مطلوبة عند اختيار نسبة.";
  if (value === "duplicate") return "هذا الكود مستخدم بالفعل. اتركه فارغاً أو اختر كوداً آخر.";
  return value ? "تعذر إنشاء الكود. راجع البيانات وحاول مرة أخرى." : "";
}

function discountLabel(type: string, value: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `خصم ${amount}%`;
  if (type === "FREE_INVITATION") return "مجاني 100%";
  if (type === "FIXED_AMOUNT") return `خصم ${amount} جنيه`;
  return "بدون خصم";
}

export default async function PhotographerPromoPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const createdPromo = params.created
    ? await prisma.partnerPromoCode.findUnique({ where: { id: params.created }, include: { partner: true } })
    : null;
  const shortPath = createdPromo ? buildShortReferralPath(createdPromo.referralSlug) : "";
  const shortUrl = createdPromo ? buildShortReferralUrl(siteUrl, createdPromo.referralSlug) : "";
  const qrCodeUrl = createdPromo ? createdPromo.qrCodeUrl || (await QRCode.toDataURL(shortUrl).catch(() => "")) : "";
  const message = errorMessage(params.error);

  return (
    <section className="admin-command-center promo-admin-page promo-creative-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">أكواد الخصم</span>
          <h1>أكواد المصورين</h1>
          <p>أنشئ كود مصور أو قاعة أو شريك. سيظهر لك كود مستقل ورابط مختصر يدخل الموقع والبروموكود جاهز.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      {message ? <div className="notice danger">{message}</div> : null}
      {params.linkTest === "ok" ? <div className="notice success">تم إنشاء الكود وفحص الرابط المختصر بنجاح.</div> : null}
      {params.linkTest === "failed" ? <div className="notice danger">تم إنشاء الكود لكن فحص الرابط المختصر فشل. اختبر الرابط قبل مشاركته.</div> : null}

      <div className="promo-workbench">
        <form className="panel promo-builder-form" action={createQuickPromoCodeAction} encType="multipart/form-data">
          <input type="hidden" name="returnTo" value="/admin/promo-codes/photographers" />
          <div className="admin-card-head">
            <Camera size={22} />
            <div>
              <span className="eyebrow">إنشاء كود مصور</span>
              <h2>بيانات المصور</h2>
            </div>
          </div>
          <div className="dynamic-page-form-grid">
            <label className="field">
              <span>اسم المصور</span>
              <input name="displayName" placeholder="مثال: Badr Studio" required minLength={2} />
            </label>
            <label className="field">
              <span>الصفة</span>
              <select name="partnerType" defaultValue="PHOTOGRAPHER">
                <option value="PHOTOGRAPHER">مصور فوتوغرافي</option>
                <option value="VIDEOGRAPHER">مصور فيديو</option>
                <option value="HALL">قاعة</option>
                <option value="PLANNER">منظم حفلات</option>
                <option value="DJ">DJ</option>
                <option value="MAKEUP_ARTIST">ميكب آرتست</option>
                <option value="DECORATOR">ديكور</option>
                <option value="OTHER">مزود خدمة</option>
              </select>
            </label>
            <label className="field">
              <span>رفع الشعار</span>
              <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif" />
              <small><UploadCloud size={13} /> إذا لم ترفع شعاراً سيتم استخدام شعار الموقع.</small>
            </label>
            <label className="field">
              <span>Facebook</span>
              <input name="facebookUrl" type="url" dir="ltr" placeholder="https://facebook.com/..." />
            </label>
            <label className="field">
              <span>Instagram</span>
              <input name="instagramUrl" type="url" dir="ltr" placeholder="https://instagram.com/..." />
            </label>
            <label className="field">
              <span>البروموكود</span>
              <input name="promoCode" dir="ltr" placeholder="BADR أو اتركه للتوليد" />
              <small>الرابط المختصر سيكون بالشكل: /r/BADR</small>
            </label>
            <label className="field">
              <span>نوع الخصم</span>
              <select name="discountType" defaultValue="NONE">
                <option value="NONE">بدون خصم</option>
                <option value="PERCENTAGE">نسبة الخصم</option>
                <option value="FREE_INVITATION">مجاني 100%</option>
              </select>
            </label>
            <label className="field">
              <span>نسبة الخصم</span>
              <input name="discountValue" inputMode="decimal" placeholder="20" />
            </label>
          </div>
          <button className="btn btn-gold" type="submit">
            <Save size={17} />
            إنشاء كود المصور
          </button>
        </form>

        <aside className="panel promo-result-card">
          <div className="admin-card-head">
            <Copy size={22} />
            <div>
              <span className="eyebrow">الناتج</span>
              <h2>الكود والرابط المختصر</h2>
            </div>
          </div>
          {createdPromo ? (
            <>
              <div className="promo-result-hero">
                <span>{createdPromo.partner.displayName}</span>
                <strong dir="ltr">{createdPromo.code}</strong>
                <small>{discountLabel(createdPromo.discountType, createdPromo.discountValue)}</small>
                <code dir="ltr">{shortUrl}</code>
              </div>
              {qrCodeUrl ? <div className="promo-result-qr" style={{ backgroundImage: `url(${qrCodeUrl})` }} aria-label="QR" /> : null}
              <div className="button-row">
                <CopyButton value={createdPromo.code} label="نسخ الكود" className="btn btn-soft" />
                <CopyButton value={shortUrl} label="نسخ الرابط" className="btn btn-soft" />
                <AdminPromoTestButton code={createdPromo.code} label="اختبار الكود" />
                <Link className="btn btn-gold" href={shortPath} target="_blank">
                  <ExternalLink size={17} />
                  اختبار الرابط
                </Link>
              </div>
            </>
          ) : (
            <div className="admin-empty-state compact">
              <Camera size={24} />
              <strong>أنشئ كوداً ليظهر هنا فوراً</strong>
              <p>سيظهر الكود والرابط المختصر وأزرار النسخ والاختبار بعد الإنشاء.</p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
