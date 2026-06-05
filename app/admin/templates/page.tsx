import { Eye, ToggleLeft, ToggleRight } from "lucide-react";
import { invitationTemplates } from "@/lib/templates";

export default function AdminTemplatesPage() {
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Templates</span>
          <h1>إدارة القالب الحالي</h1>
        </div>
      </div>
      <div className="template-grid">
        {invitationTemplates.map((template) => (
          <article className="template-card" key={template.slug}>
            <div className="template-preview">
              <img src={template.previewImage} alt={template.arabicName} />
              <span className="template-badge">{template.score}%</span>
            </div>
            <div className="template-body">
              <h3>{template.arabicName}</h3>
              <p>{template.category}</p>
              <div className="button-row">
                <button className="btn btn-soft btn-icon" type="button" title="معاينة">
                  <Eye size={17} />
                </button>
                <button className="btn btn-soft" type="button">
                  {template.enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {template.enabled ? "مفعل" : "متوقف"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
