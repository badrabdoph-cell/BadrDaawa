import Link from "next/link";
import { Copy, Eye, Pause, Play, Trash2 } from "lucide-react";
import { demoInvitations } from "@/lib/demo-data";
import { invitationTemplates } from "@/lib/templates";
import { getInvitationUrl } from "@/lib/utils";

export default function InvitationsPage() {
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Invitations</span>
          <h1>إدارة الدعوات</h1>
        </div>
        <button className="btn btn-gold" type="button">
          إنشاء دعوة جديدة
        </button>
      </div>
      <div className="form-panel" style={{ marginBottom: 18 }}>
        <h2>نموذج إنشاء دعوة</h2>
        <div className="input-grid">
          {["اسم العريس", "اسم العروسة", "تاريخ الفرح", "وقت الفرح", "مكان الفرح", "Google Maps Link"].map((label) => (
            <div className="field" key={label}>
              <label>{label}</label>
              <input placeholder={label} />
            </div>
          ))}
          <div className="field">
            <label>اختيار القالب</label>
            <select>
              {invitationTemplates.map((template) => (
                <option key={template.slug}>{template.arabicName}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>لغة الدعوة</label>
            <select>
              <option>عربي</option>
              <option>English</option>
            </select>
          </div>
          <div className="field">
            <label>صور العروسين</label>
            <input type="file" multiple />
          </div>
          <div className="field">
            <label>موسيقى خلفية</label>
            <input type="file" accept="audio/*" />
          </div>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الأسماء</th>
              <th>القالب</th>
              <th>المشاهدات</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {demoInvitations.map((invitation) => {
              const template = invitationTemplates.find((item) => item.slug === invitation.templateSlug);
              return (
                <tr key={invitation.id}>
                  <td>{invitation.code}</td>
                  <td>
                    {invitation.groomName} &amp; {invitation.brideName}
                  </td>
                  <td>{template?.arabicName}</td>
                  <td>{invitation.views}</td>
                  <td>
                    <span className={invitation.isActive ? "status success" : "status danger"}>{invitation.isActive ? "نشطة" : "متوقفة"}</span>
                  </td>
                  <td>
                    <div className="button-row">
                      <Link className="btn btn-soft btn-icon" href={`/${invitation.code}`} title="فتح الدعوة">
                        <Eye size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={`/client/${invitation.code}`} title="لوحة العميل">
                        <Play size={17} />
                      </Link>
                      <button className="btn btn-soft btn-icon" title={getInvitationUrl(invitation.code)} type="button">
                        <Copy size={17} />
                      </button>
                      <button className="btn btn-soft btn-icon" title="إيقاف" type="button">
                        <Pause size={17} />
                      </button>
                      <button className="btn btn-soft btn-icon" title="حذف" type="button">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
