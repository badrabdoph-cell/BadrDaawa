import Link from "next/link";
import { Download, ExternalLink, ImagePlus, LogOut, MessageSquareText, QrCode, Save, Settings2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { GuestTable } from "@/components/GuestTable";
import { QrCodeBlock } from "@/components/QrCodeBlock";
import { StatsGrid } from "@/components/StatsGrid";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { calculateAttendance, getInvitationUrl } from "@/lib/utils";

export default async function CustomerAdminPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invitation = await getInvitationByCode(code);
  if (!invitation) {
    notFound();
  }

  const guests = await getGuestsByInvitation(invitation.code);
  const summary = calculateAttendance(guests);
  const url = getInvitationUrl(invitation.code);

  return (
    <main className="customer-admin">
      <section className="customer-topbar">
        <div>
          <span className="eyebrow">Customer Admin</span>
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
          <CopyButton className="btn btn-gold" value={url} label="نسخ الرابط" title="نسخ رابط الدعوة" />
          <form action="/api/auth/client/logout" method="post">
            <input name="code" type="hidden" value={invitation.code} />
            <button className="btn btn-soft btn-icon" type="submit" title="تسجيل خروج">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </section>

      <StatsGrid
        stats={[
          { label: "إجمالي الردود", value: summary.totalResponses },
          { label: "حضور مؤكد", value: summary.confirmedGuests },
          { label: "معتذرون", value: summary.declinedGuests },
          { label: "مشاهدات الدعوة", value: invitation.views },
        ]}
      />

      <section className="customer-control-grid">
        <article className="panel">
          <QrCode size={24} />
          <h2>الرابط والـ QR</h2>
          <p>أي تعديل على رابط الدعوة يتزامن تلقائيًا مع QR لأنه مبني من نفس الكود.</p>
          <QrCodeBlock value={url} />
        </article>

        <article className="panel control-panel-wide">
          <Settings2 size={24} />
          <h2>تعديل بيانات الدعوة</h2>
          <form className="admin-form-grid compact-controls">
            <label className="field">
              <span>اسم العريس</span>
              <input defaultValue={invitation.groomName} />
            </label>
            <label className="field">
              <span>اسم العروسة</span>
              <input defaultValue={invitation.brideName} />
            </label>
            <label className="field">
              <span>تاريخ الفرح</span>
              <input type="date" defaultValue={invitation.weddingDate.slice(0, 10)} />
            </label>
            <label className="field">
              <span>وقت الفرح</span>
              <input defaultValue={invitation.weddingTime} />
            </label>
            <label className="field">
              <span>القاعة والعنوان</span>
              <input defaultValue={invitation.venue} />
            </label>
            <label className="field">
              <span>رابط الخريطة</span>
              <input defaultValue={invitation.mapUrl} />
            </label>
            <button className="btn btn-gold admin-submit" type="button">
              <Save size={17} />
              حفظ التعديلات
            </button>
          </form>
        </article>

        <article className="panel control-panel-wide">
          <ImagePlus size={24} />
          <h2>استبدال الصور</h2>
          <p>الصور الحالية ظاهرة داخل الدعوة. عند ربط التخزين، العميل يقدر يستبدلها من هنا.</p>
          <div className="client-gallery-editor">
            {invitation.gallery.length ? invitation.gallery.map((image) => <img src={image} alt="صورة الدعوة" key={image} />) : null}
          </div>
          <input type="file" multiple accept="image/*" />
        </article>

        <article className="panel control-panel-wide">
          <MessageSquareText size={24} />
          <h2>نصوص الدعوة</h2>
          <textarea defaultValue="حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري. أنا مستنيك تكون جزء من يومي المفضل." rows={4} />
        </article>

        <article className="panel">
          <Download size={24} />
          <h2>تصدير الحضور</h2>
          <p>حمل قائمة الحضور Excel أو PDF.</p>
          <div className="button-row">
            <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/excel`}>
              Excel
            </a>
            <a className="btn btn-soft" href={`/api/invitations/${invitation.code}/export/pdf`}>
              PDF
            </a>
          </div>
        </article>
      </section>

      <section className="section compact">
        <div className="dashboard-head">
          <div>
            <span className="eyebrow">Guest List</span>
            <h2>قائمة الحضور</h2>
          </div>
        </div>
        <GuestTable guests={guests} />
      </section>
    </main>
  );
}
