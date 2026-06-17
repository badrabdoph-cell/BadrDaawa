import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Search, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl, formatArabicNumber } from "@/lib/utils";
import { PublishedInvitationRow } from "@/components/PublishedInvitationActions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دعوات حقيقية",
  description: "مجموعة من الدعوات المنشورة لعملائنا من BadrDaawa.",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function getState(invitation: { isActive: boolean; disabledAt?: string | null }) {
  if (invitation.disabledAt) return "disabled";
  if (!invitation.isActive) return "paused";
  return "active";
}

function stateLabel(state: string) {
  if (state === "active") return "نشطة";
  if (state === "paused") return "متوقفة";
  if (state === "disabled") return "معطلة";
  return "";
}

function stateClass(state: string) {
  if (state === "active") return "status success";
  if (state === "paused") return "status warning";
  return "status danger";
}

export default async function ClientInvitationsPublicPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [params, invitations, templates, requestHeaders] = await Promise.all([
    searchParams,
    getAdminInvitations(),
    getTemplatesWithSettings(),
    headers(),
  ]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const query = (params.q || "").trim().toLowerCase();

  const activeInvitations = invitations.filter((invitation) => invitation.isActive && !invitation.disabledAt);

  const filtered = query
    ? activeInvitations.filter((invitation) => {
        const template = templates.find((t) => t.slug === invitation.templateSlug);
        const searchable = [
          invitation.code,
          invitation.customSlug,
          invitation.groomName,
          invitation.brideName,
          invitation.venue,
          template?.arabicName || invitation.templateSlug,
        ].join(" ").toLowerCase();
        return searchable.includes(query);
      })
    : activeInvitations;

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container client-invitations-page">
          <div className="section-title-block">
            <span className="eyebrow">
              <Sparkles size={16} />
              Client Invitations
            </span>
            <h1 className="section-title">دعوات حقيقية</h1>
            <p className="section-lead">مجموعة من الدعوات المنشورة لعملائنا.</p>
          </div>

          <form className="admin-table-toolbar" action="/client-invitations" method="get">
            <label className="admin-search-field">
              <Search size={17} />
              <input name="q" placeholder="ابحث بالاسم، الكود، القالب أو المكان" defaultValue={params.q || ""} />
            </label>
            <button className="btn btn-soft" type="submit">بحث</button>
            {query ? (
              <Link className="btn btn-soft" href="/client-invitations">مسح</Link>
            ) : null}
          </form>

          {filtered.length ? (
            <div className="published-rows-wrapper">
              <table className="published-rows-table">
                <thead>
                  <tr>
                    <th>الدعوة</th>
                    <th>تاريخ الحفل</th>
                    <th>الزيارات</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invitation) => {
                    const template = templates.find((t) => t.slug === invitation.templateSlug);
                    const publicSlug = invitation.customSlug || invitation.code;
                    const state = getState(invitation);
                    return (
                      <PublishedInvitationRow
                        key={invitation.id}
                        code={invitation.code}
                        groomName={invitation.groomName}
                        brideName={invitation.brideName}
                        templateName={template?.arabicName}
                        weddingDate={formatDate(invitation.weddingDate)}
                        views={formatArabicNumber(invitation.views)}
                        status={state}
                        statusLabel={stateLabel(state)}
                        statusClass={stateClass(state)}
                        publicPath={`/${publicSlug}`}
                        adminPath={`/admin/invitations/${encodeURIComponent(invitation.code)}`}
                        invitationUrl={`${siteUrl}/${publicSlug}`}
                        adminUrl={`${siteUrl}/admin/invitations/${encodeURIComponent(invitation.code)}`}
                        disabledAt={invitation.disabledAt}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h2>{query ? "لا توجد نتائج مطابقة" : "لا توجد دعوات منشورة حالياً"}</h2>
              <p>{query ? "جرّب تغيير كلمة البحث." : "ستظهر الدعوات المنشورة هنا تلقائياً."}</p>
              {query ? null : (
                <Link className="btn btn-gold" href="/templates">
                  مشاهدة التصاميم
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
