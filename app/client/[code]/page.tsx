import Link from "next/link";
import { Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { notFound } from "next/navigation";
import { GuestTable } from "@/components/GuestTable";
import { QrCodeBlock } from "@/components/QrCodeBlock";
import { StatsGrid } from "@/components/StatsGrid";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/demo-data";
import { calculateAttendance, getInvitationUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function ClientInvitationDashboard({ params }: PageProps) {
  const { code } = await params;
  const invitation = getInvitationByCode(code);
  if (!invitation) {
    notFound();
  }

  const guests = getGuestsByInvitation(invitation.code);
  const summary = calculateAttendance(guests);
  const url = getInvitationUrl(invitation.code);

  return (
    <div className="page-shell">
      <main className="dashboard-main">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Customer Panel</span>
            <h1>
              {invitation.groomName} &amp; {invitation.brideName}
            </h1>
            <p>{url}</p>
          </div>
          <div className="button-row">
            <Link className="btn btn-soft" href={`/${invitation.code}`}>
              <ExternalLink size={18} />
              فتح الدعوة
            </Link>
            <button className="btn btn-gold" type="button">
              <Copy size={18} />
              نسخ الرابط
            </button>
          </div>
        </div>
        <StatsGrid
          stats={[
            { label: "إجمالي الردود", value: summary.totalResponses },
            { label: "حضور مؤكد", value: summary.confirmedGuests },
            { label: "معتذرون", value: summary.declinedGuests },
            { label: "مشاهدات الدعوة", value: invitation.views },
          ]}
        />
        <section className="section compact">
          <div className="grid-3">
            <article className="panel">
              <QrCode size={24} />
              <h2>أدوات الدعوة</h2>
              <p>الرابط والـ QR جاهزين للمشاركة والطباعة.</p>
              <QrCodeBlock value={url} />
            </article>
            <article className="panel">
              <Download size={24} />
              <h2>تصدير الحضور</h2>
              <p>تحميل القائمة في صيغة Excel أو PDF أو نسخها كاملة.</p>
              <div className="button-row">
                <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>
                  Excel
                </a>
                <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>
                  PDF
                </a>
              </div>
            </article>
            <article className="panel">
              <h2>صلاحيات العميل</h2>
              <p>العميل يتابع الحضور فقط، بدون صلاحيات لتكسير القوالب أو تغيير التصميم.</p>
            </article>
          </div>
        </section>
        <section className="section compact" style={{ paddingTop: 0 }}>
          <div className="dashboard-head">
            <div>
              <span className="eyebrow">Guest List</span>
              <h2>قائمة الحضور</h2>
            </div>
          </div>
          <GuestTable guests={guests} />
        </section>
      </main>
    </div>
  );
}
