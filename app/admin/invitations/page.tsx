import Link from "next/link";
import { Copy, Eye, Pause, Play, Trash2 } from "lucide-react";
import { AdminCreateInvitationForm } from "@/components/AdminCreateInvitationForm";
import { getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getInvitationUrl } from "@/lib/utils";
import { getCustomerAdminPath } from "@/lib/slug";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; demo?: string }>;
}) {
  const [params, invitations, templates] = await Promise.all([searchParams, getAdminInvitations(), getTemplatesWithSettings()]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Invitations</span>
          <h1>إدارة الدعوات</h1>
        </div>
        <a className="btn btn-gold" href="#create-invitation">
          إنشاء دعوة جديدة
        </a>
      </div>
      <div id="create-invitation">
        <AdminCreateInvitationForm created={params.created} error={params.error} demo={params.demo} templates={templates} />
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
              <th>روابط</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => {
              const template = templates.find((item) => item.slug === invitation.templateSlug);
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
                    <div className="mini-links">
                      <span>{getInvitationUrl(invitation.code)}</span>
                      <span>{getCustomerAdminPath(invitation.code)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="button-row">
                      <Link className="btn btn-soft btn-icon" href={`/${invitation.code}`} title="فتح الدعوة">
                        <Eye size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={getCustomerAdminPath(invitation.code)} title="لوحة العميل">
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
