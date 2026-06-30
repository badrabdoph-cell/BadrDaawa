import Link from "next/link";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { BarChart3, History, Percent, TicketPercent } from "lucide-react";
import { AdminPromoCopyPanel } from "@/components/AdminPromoCopyPanel";
import { AdminPromoQuickForm } from "@/components/AdminPromoQuickForm";
import { AdminPromoSectionNav } from "@/components/AdminPromoSectionNav";
import { StatsGrid } from "@/components/StatsGrid";
import { prisma } from "@/lib/db";
import { buildShortReferralUrl } from "@/lib/partner-promo";
import { getShareableSiteUrl } from "@/lib/utils";
import { createQuickPromoCodeAction } from "./actions";

export const dynamic = "force-dynamic";

type PromoCodesPageParams = {
  created?: string;
  error?: string;
};

function discountLabel(type: string, value: unknown) {
  const amount = value === null || value === undefined ? "" : String(value);
  if (type === "PERCENTAGE") return `خصم ${amount}%`;
  if (type === "FIXED_AMOUNT") return `خصم ${amount} جنيه`;
  if (type === "FREE_INVITATION") return "دعوة مجانية";
  return "بدون خصم";
}

function errorMessage(value?: string) {
  if (value === "database") return "قاعدة البيانات غير متاحة حالياً.";
  if (value === "name") return "اكتب اسم الشريك أو المصور أولاً.";
  if (value === "discount") return "قيمة الخصم مطلوبة عند اختيار نسبة أو مبلغ ثابت.";
  return value ? "تعذر إنشاء البروموكود. راجع البيانات وحاول مرة أخرى." : "";
}

function conversionRate(orders: number, visits: number) {
  if (!visits) return "0%";
  return `${Math.round((orders / visits) * 100)}%`;
}

export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<PromoCodesPageParams>;
}) {
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  if (!prisma) return <div className="notice danger">قاعدة البيانات غير متاحة حالياً.</div>;

  const siteUrl = getShareableSiteUrl(requestHeaders).replace(/\/$/, "");
  const [partnerPromoCount, activePartnerPromoCount, discountPromoCount, visitCount, usageCount, orderCount, createdPromo] = await Promise.all([
    prisma.partnerPromoCode.count({ where: { deletedAt: null } }),
    prisma.partnerPromoCode.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.discountPromoCode.count({ where: { deletedAt: null } }),
    prisma.partnerActivityLog.count({ where: { action: "promo.short_link_visit" } }),
    prisma.partnerUsageLog.count({ where: { result: "SUCCESS" } }),
    prisma.orderRequest.count({ where: { partnerPromoId: { not: null } } }),
    params.created
      ? prisma.partnerPromoCode.findUnique({
          where: { id: params.created },
          include: { partner: { select: { displayName: true } } },
        })
      : Promise.resolve(null),
  ]);

  const createdShortUrl = createdPromo ? buildShortReferralUrl(siteUrl, createdPromo.referralSlug) : "";
  const createdQrCodeUrl = createdPromo ? await QRCode.toDataURL(createdShortUrl).catch(() => createdPromo.qrCodeUrl || "") : "";
  const message = errorMessage(params.error);

  return (
    <section className="admin-command-center promo-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">قسم أساسي</span>
          <h1>أكواد البرومو</h1>
          <p>ابدأ بإنشاء كود سريع، ثم انتقل للقائمة المناسبة: مصورين وشركاء، خصومات مستقلة، أو السجل.</p>
        </div>
      </div>

      <AdminPromoSectionNav />

      {message ? <div className="notice danger">{message}</div> : null}

      <StatsGrid
        stats={[
          { label: "بروموكود المصورين", value: partnerPromoCount, hint: `${activePartnerPromoCount} نشط` },
          { label: "أكواد الخصم المستقلة", value: discountPromoCount, hint: "منفصلة عن المصورين" },
          { label: "زيارات الروابط", value: visitCount, hint: "كل روابط /r" },
          { label: "استخدامات مؤكدة", value: usageCount, hint: "طلبات طبقت بروموكود" },
          { label: "معدل التحويل", value: conversionRate(orderCount, visitCount), hint: `${orderCount} طلب من ${visitCount} زيارة` },
        ]}
      />

      <div className="promo-admin-grid">
        <section className="panel promo-create-panel">
          <AdminPromoQuickForm action={createQuickPromoCodeAction} />
        </section>

        <aside className="promo-admin-side">
          {createdPromo ? (
            <AdminPromoCopyPanel
              code={createdPromo.code}
              shortUrl={createdShortUrl}
              qrCodeUrl={createdQrCodeUrl}
              partnerName={createdPromo.partner.displayName}
              discountLabel={discountLabel(createdPromo.discountType, createdPromo.discountValue)}
            />
          ) : (
            <div className="promo-empty-guide panel">
              <TicketPercent size={24} />
              <strong>بعد إنشاء البروموكود ستظهر هنا أدوات النسخ</strong>
              <p>الكود، الرابط المختصر، QR، ورسالة جاهزة للإرسال تظهر فوراً بدون بحث.</p>
            </div>
          )}
        </aside>
      </div>

      <section className="promo-task-grid" aria-label="مهام البروموكود">
        <Link href="/admin/promo-codes/partners">
          <TicketPercent size={22} />
          <strong>بروموكود المصورين والشركاء</strong>
          <span>نسخ، فتح، إيقاف، تفعيل، حذف آمن، وإدارة الطلبات لكل كود.</span>
        </Link>
        <Link href="/admin/promo-codes/discounts">
          <Percent size={22} />
          <strong>أكواد الخصم المستقلة</strong>
          <span>قائمة منفصلة للأكواد التي لا ترتبط بمصور أو شريك.</span>
        </Link>
        <Link href="/admin/promo-codes/history">
          <History size={22} />
          <strong>سجل البروموكود</strong>
          <span>كل الزيارات والاستخدامات وحركات الإدارة في مكان واحد.</span>
        </Link>
        <Link href="/admin/partners">
          <BarChart3 size={22} />
          <strong>الشركاء</strong>
          <span>إدارة بيانات الشريك نفسه بعيداً عن تشغيل البروموكود.</span>
        </Link>
      </section>
    </section>
  );
}
