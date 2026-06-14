import Link from "next/link";
import { Code2, Settings2 } from "lucide-react";
import { AdminTemplateLookup } from "@/components/AdminTemplateLookup";
import { AdminTemplatePreviewInfoEditor } from "@/components/AdminTemplatePreviewInfoEditor";
import { AdminTextEditor } from "@/components/AdminTextEditor";
import { getInvitationByCode } from "@/lib/invitation-data";
import { extractInvitationCodeFromInput } from "@/lib/site-settings";
import { getTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export default async function AdminTemplatesPage({ searchParams }: { searchParams: Promise<{ invitation?: string; saved?: string; imported?: string }> }) {
  const params = await searchParams;
  const searchedCode = extractInvitationCodeFromInput(params.invitation || "");
  const searchedInvitation = searchedCode ? await getInvitationByCode(searchedCode) : undefined;
  const [templates, templatePreviewInfo] = await Promise.all([getTemplatesWithSettings(), getTemplatePreviewInfo()]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Templates</span>
          <h1>إدارة القوالب</h1>
          <p>كل قالب يظهر بمعاينة مباشرة، ومن قسم التعديل تتحكم في الألوان والصور والموسيقى وطريقة العرض.</p>
        </div>
      </div>

      <section className="template-admin-tools">
        <details className="panel template-code-import-panel">
          <summary className="template-import-summary">
            <span>
              <Code2 size={22} />
              إنشاء قالب من كود
            </span>
            <strong>فتح الأداة</strong>
          </summary>
          <div className="template-import-body">
            <p>الصق كود HTML كامل أو جزء من صفحة، وسيتم تحويله لقالب يظهر في الموقع والمعاينات والطلبات.</p>
            <form className="template-code-import-form" action="/api/admin/templates/import" method="post">
              <div className="admin-form-grid compact-controls">
                <label className="field">
                  <span>اسم القالب</span>
                  <input name="name" placeholder="مثال: Ivory Motion" />
                </label>
                <label className="field">
                  <span>الرابط المختصر</span>
                  <input name="slug" placeholder="ivory-motion" pattern="[A-Za-z0-9 -]+" />
                </label>
                <label className="field">
                  <span>التصنيف</span>
                  <input name="category" placeholder="قالب مخصص" />
                </label>
                <label className="field">
                  <span>رابط الموسيقى</span>
                  <input name="musicUrl" placeholder="/assets/audio/badr-sara-wedding-3.mp3 أو رابط أغنية مباشر" />
                </label>
                <label className="field full">
                  <span>وصف قصير</span>
                  <input name="concept" placeholder="وصف يظهر في قائمة القوالب" />
                </label>
                <label className="field full">
                  <span>كود القالب</span>
                  <textarea
                    name="html"
                    rows={9}
                    placeholder={`الصق HTML هنا. يمكنك استخدام:
{{groomName}} {{brideName}} {{coupleNames}}
{{weddingDate}} {{weddingTime}} {{venue}} {{city}}
{{mapUrl}} {{invitationUrl}} {{musicUrl}}
{{gallery1}} {{gallery2}} {{gallery3}}`}
                    required
                  />
                </label>
              </div>
              <button className="btn btn-gold btn-glow" type="submit">
                <Code2 size={18} />
                تحويل الكود لقالب
              </button>
            </form>
          </div>
        </details>

        <AdminTemplateLookup templates={templates} initialQuery={params.invitation || ""} searchedInvitation={searchedInvitation} />
      </section>

      <AdminTemplatePreviewInfoEditor templates={templates} templatePreviewInfo={templatePreviewInfo} />

      <section className="panel text-admin-panel">
        <div className="template-section-head">
          <div>
            <span className="eyebrow">Text Search</span>
            <h2>تعديل النصوص بالبحث</h2>
            <p>قسم مستقل للعثور على النصوص بسرعة وتعديلها بدون ما الاختيار يختفي أثناء الكتابة.</p>
          </div>
          <Settings2 size={24} />
        </div>
        <AdminTextEditor
          texts={[
            {
              id: "invite-line-1",
              label: "سطر الدعوة الأول",
              value: templatePreviewInfo.texts.inviteMessage,
            },
            {
              id: "invite-line-2",
              label: "سطر الدعوة الثاني",
              value: templatePreviewInfo.texts.inviteMessageSecondary,
            },
            {
              id: "photographer-title",
              label: "عنوان المصور",
              value: templatePreviewInfo.photographer.name,
            },
            {
              id: "photographer-copy",
              label: "وصف المصور",
              value: templatePreviewInfo.photographer.description,
            },
            {
              id: "poll-question",
              label: "سؤال الحضور",
              value: templatePreviewInfo.texts.rsvpQuestion,
            },
          ]}
        />
      </section>

      {params.saved ? (
        <div className={params.saved === "0" ? "notice danger" : "notice success"}>
          {params.saved === "0" ? "تعذر حفظ موسيقى القالب. راجع القالب المختار." : params.saved === "template-info" ? "تم حفظ معلومات القوالب وتحديث كل المعاينات." : "تم حفظ موسيقى القالب وتحديث المعاينة."}
        </div>
      ) : null}

      {params.imported ? (
        <div className={params.imported === "0" ? "notice danger" : "notice success"}>
          {params.imported === "0" ? "تعذر إنشاء القالب. الصق كود HTML صالح وحاول مرة أخرى." : `تم إنشاء القالب الجديد: ${params.imported}`}
        </div>
      ) : null}

    </>
  );
}
