import { Link2, WandSparkles } from "lucide-react";
import { invitationTemplates } from "@/lib/templates";

export function AdminCreateInvitationForm({ created, error, demo }: { created?: string; error?: string; demo?: string }) {
  return (
    <section className="admin-create-card">
      <div className="admin-create-head">
        <div>
          <span className="eyebrow">Create Invitation</span>
          <h2>إنشاء دعوة جديدة</h2>
          <p>اكتب بيانات الفرح وبيانات دخول العميل. الرابط بيتولد تلقائيًا مثل: `badr-sarah-1` ولو الاسم اتكرر هيزود الرقم.</p>
        </div>
        <WandSparkles size={30} />
      </div>
      {created ? (
        <div className="notice success">
          <Link2 size={18} />
          تم تجهيز الرابط: <strong>/{created}</strong> ولوحة العميل: <strong>/{created}/ad_3399</strong>
          {demo ? " - وضع ديمو بدون حفظ في قاعدة البيانات." : ""}
        </div>
      ) : null}
      {error ? <div className="notice danger">راجع البيانات المطلوبة قبل الإنشاء.</div> : null}
      <form className="admin-form-grid" action="/api/admin/invitations" method="post">
        <label className="field">
          <span>اسم العريس</span>
          <input name="groomName" placeholder="بدر" required />
        </label>
        <label className="field">
          <span>اسم العروسة</span>
          <input name="brideName" placeholder="سارة" required />
        </label>
        <label className="field">
          <span>اسم العريس بالإنجليزي للرابط</span>
          <input name="groomEnglish" placeholder="badr" pattern="[A-Za-z0-9 -]+" required />
        </label>
        <label className="field">
          <span>اسم العروسة بالإنجليزي للرابط</span>
          <input name="brideEnglish" placeholder="sarah" pattern="[A-Za-z0-9 -]+" required />
        </label>
        <label className="field">
          <span>رقم موبايل العميل</span>
          <input name="phone" inputMode="tel" placeholder="01011511561" required />
        </label>
        <label className="field">
          <span>اسم دخول العميل</span>
          <input name="username" placeholder="badr-sarah" required />
        </label>
        <label className="field">
          <span>باسورد العميل</span>
          <input name="password" type="password" minLength={8} required />
        </label>
        <label className="field">
          <span>تاريخ الفرح</span>
          <input name="weddingDate" type="date" required />
        </label>
        <label className="field">
          <span>وقت الفرح</span>
          <input name="weddingTime" placeholder="07:00 مساءً" />
        </label>
        <label className="field">
          <span>اسم القاعة والعنوان</span>
          <input name="venue" placeholder="قاعة رويال - البحيرة" required />
        </label>
        <label className="field">
          <span>المدينة</span>
          <input name="city" placeholder="البحيرة" />
        </label>
        <label className="field">
          <span>رابط Google Maps</span>
          <input name="mapUrl" placeholder="https://maps.google.com/..." />
        </label>
        <label className="field">
          <span>القالب</span>
          <select name="templateSlug" defaultValue="royal-envelope">
            {invitationTemplates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-gold btn-glow admin-submit" type="submit">
          إنشاء الدعوة والرابط
        </button>
      </form>
    </section>
  );
}
