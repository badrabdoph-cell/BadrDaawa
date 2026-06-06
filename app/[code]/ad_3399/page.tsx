import Link from "next/link";
import { Download, ExternalLink, ImagePlus, LogOut, MessageSquareText, Music2, QrCode, Save, Settings2 } from "lucide-react";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { GuestTable } from "@/components/GuestTable";
import { ImageCropUploader } from "@/components/ImageCropUploader";
import { QrCodeBlock } from "@/components/QrCodeBlock";
import { StatsGrid } from "@/components/StatsGrid";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";
import { calculateAttendance, getInvitationUrl } from "@/lib/utils";

export default async function CustomerAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
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

      {query.saved ? <div className="notice success customer-notice">تم حفظ التعديلات المتاحة لهذه الدعوة.</div> : null}

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
          <form className="admin-form-grid compact-controls" action={`/api/client/invitations/${invitation.code}`} method="post">
            <label className="field">
              <span>اسم العريس</span>
              <input name="groomName" defaultValue={invitation.groomName} />
            </label>
            <label className="field">
              <span>اسم العروسة</span>
              <input name="brideName" defaultValue={invitation.brideName} />
            </label>
            <label className="field">
              <span>تاريخ الفرح</span>
              <input name="weddingDate" type="date" defaultValue={invitation.weddingDate.slice(0, 10)} />
            </label>
            <label className="field">
              <span>وقت الفرح</span>
              <input name="weddingTime" defaultValue={invitation.weddingTime} />
            </label>
            <label className="field">
              <span>القاعة والعنوان</span>
              <input name="venue" defaultValue={invitation.venue} />
            </label>
            <label className="field">
              <span>المدينة</span>
              <input name="city" defaultValue={invitation.city} />
            </label>
            <label className="field">
              <span>رابط الخريطة</span>
              <input name="mapUrl" defaultValue={invitation.mapUrl} />
            </label>
            <button className="btn btn-gold admin-submit" type="submit">
              <Save size={17} />
              حفظ التعديلات
            </button>
          </form>
        </article>

        <article className="panel control-panel-wide">
          <ImagePlus size={24} />
          <h2>استبدال الصور</h2>
          <p>ارفع الصور بعد الكروب والضغط بنفس أبعاد القالب حتى تظهر في الدعوة بدون قص عشوائي.</p>
          <form action={`/api/client/invitations/${invitation.code}`} method="post">
            <ImageCropUploader label="صور الدعوة" name="galleryImage" maxFiles={3} defaultImages={invitation.gallery} />
            <button className="btn btn-gold admin-submit" type="submit">
              <Save size={17} />
              حفظ الصور
            </button>
          </form>
        </article>

        <article className="panel control-panel-wide">
          <Music2 size={24} />
          <h2>موسيقى الدعوة</h2>
          <p>اترك الرابط فارغًا لتشغيل الموسيقى المؤقتة، أو ضع رابط ملف MP3/WAV خاص بالدعوة.</p>
          <form className="admin-form-grid compact-controls" action={`/api/client/invitations/${invitation.code}`} method="post">
            <label className="field full">
              <span>رابط الأغنية</span>
              <input name="musicUrl" defaultValue={invitation.musicUrl || ""} placeholder="https://..." />
            </label>
            <button className="btn btn-gold admin-submit" type="submit">
              <Save size={17} />
              حفظ الموسيقى
            </button>
          </form>
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
