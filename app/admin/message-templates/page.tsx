import { Braces, MessageCircle, MessageSquareText, PlusCircle, Save, Trash2 } from "lucide-react";
import { getMessageTemplates, messageTemplateKindLabels } from "@/lib/message-templates";
import { getMessageTemplateVariables } from "@/lib/message-template-render";
import type { MessageTemplate, MessageTemplateKind } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

const templateKinds: MessageTemplateKind[] = ["whatsapp", "welcome", "reminder"];

function statusMessage(saved?: string, error?: string) {
  if (error === "required") return { kind: "danger", text: "اكتب اسم القالب ومحتوى الرسالة قبل الحفظ." };
  if (error) return { kind: "danger", text: "تعذر تنفيذ العملية. حاول مرة أخرى." };
  if (saved === "created") return { kind: "success", text: "تم حفظ قالب الرسالة ويمكن استخدامه داخل الدعوات الآن." };
  if (saved === "updated") return { kind: "success", text: "تم تحديث قالب الرسالة." };
  if (saved === "deleted") return { kind: "success", text: "تم حذف قالب الرسالة." };
  return null;
}

function TemplateEditor({ template }: { template: MessageTemplate }) {
  return (
    <article className="message-template-card">
      <form action="/api/admin/message-templates" method="post">
        <input name="action" type="hidden" value="update" />
        <input name="id" type="hidden" value={template.id} />
        <label className="field">
          <span>النوع</span>
          <select name="kind" defaultValue={template.kind}>
            {templateKinds.map((kind) => (
              <option key={kind} value={kind}>
                {messageTemplateKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>اسم القالب</span>
          <input name="title" defaultValue={template.title} required />
        </label>
        <label className="field wide">
          <span>نص الرسالة</span>
          <textarea name="content" defaultValue={template.content} rows={6} required />
        </label>
        <div className="message-template-actions">
          <button className="btn btn-soft" type="submit">
            <Save size={16} />
            حفظ
          </button>
        </div>
      </form>
      <form action="/api/admin/message-templates" method="post">
        <input name="action" type="hidden" value="delete" />
        <input name="id" type="hidden" value={template.id} />
        <button className="btn btn-soft danger-button" type="submit">
          <Trash2 size={16} />
          حذف
        </button>
      </form>
    </article>
  );
}

export default async function MessageTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [templates, query] = await Promise.all([getMessageTemplates(), searchParams]);
  const message = statusMessage(query.saved, query.error);
  const variables = getMessageTemplateVariables();
  const totals = {
    all: templates.length,
    whatsapp: templates.filter((template) => template.kind === "whatsapp").length,
    welcome: templates.filter((template) => template.kind === "welcome").length,
    reminder: templates.filter((template) => template.kind === "reminder").length,
  };

  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Message Templates</span>
          <h1>قوالب الرسائل</h1>
          <p>احفظ رسائل واتساب وترحيب وتذكير، واستخدم المتغيرات الديناميكية داخل أي دعوة.</p>
        </div>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <div className="admin-metrics-grid message-template-metrics">
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>كل القوالب</span>
          <strong>{formatArabicNumber(totals.all)}</strong>
          <small>متاحة للمشاركة والرسائل.</small>
        </article>
        <article className="admin-metric-card">
          <MessageCircle />
          <span>واتساب</span>
          <strong>{formatArabicNumber(totals.whatsapp)}</strong>
          <small>مناسبة لمشاركة رابط الدعوة.</small>
        </article>
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>ترحيب</span>
          <strong>{formatArabicNumber(totals.welcome)}</strong>
          <small>لرسائل بداية التعامل.</small>
        </article>
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>تذكير</span>
          <strong>{formatArabicNumber(totals.reminder)}</strong>
          <small>للتذكير قبل موعد الحفل.</small>
        </article>
      </div>

      <div className="message-template-layout">
        <article className="admin-ops-panel message-template-create">
          <div className="admin-ops-head">
            <PlusCircle size={18} />
            <h3>إضافة قالب رسالة</h3>
          </div>
          <form action="/api/admin/message-templates" method="post" className="message-template-form">
            <input name="action" type="hidden" value="create" />
            <label className="field">
              <span>النوع</span>
              <select name="kind" defaultValue="whatsapp">
                {templateKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {messageTemplateKindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>اسم القالب</span>
              <input name="title" placeholder="مثال: تذكير قبل الحفل" required />
            </label>
            <label className="field wide">
              <span>نص الرسالة</span>
              <textarea name="content" rows={8} placeholder="اكتب الرسالة مع المتغيرات مثل {{groomName}} و {{link}}" required />
            </label>
            <button className="btn btn-gold" type="submit">
              <Save size={17} />
              حفظ القالب
            </button>
          </form>

          <div className="message-template-vars">
            <div>
              <Braces size={18} />
              <strong>المتغيرات المتاحة</strong>
            </div>
            <p>استخدم هذه القيم داخل النص، وسيتم استبدالها تلقائياً حسب الدعوة.</p>
            <div>
              {variables.map((variable) => (
                <code key={variable}>{`{{${variable}}}`}</code>
              ))}
            </div>
          </div>
        </article>

        <div className="message-template-groups">
          {templateKinds.map((kind) => {
            const group = templates.filter((template) => template.kind === kind);
            return (
              <section className="admin-ops-panel" key={kind}>
                <div className="admin-ops-head">
                  <MessageSquareText size={18} />
                  <h3>
                    {messageTemplateKindLabels[kind]} ({formatArabicNumber(group.length)})
                  </h3>
                </div>
                <div className="message-template-list">
                  {group.length ? group.map((template) => <TemplateEditor key={template.id} template={template} />) : <div className="admin-clear-state">لا توجد قوالب محفوظة في هذا القسم بعد.</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
