import { FilePenLine, MessageSquareText, PlusCircle, Save, Trash2 } from "lucide-react";
import { contentPresetKindLabels, getDraftContentPresets } from "@/lib/content-presets";
import type { ContentPreset, ContentPresetKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const presetKinds: ContentPresetKind[] = ["opening", "welcome", "rsvp"];

function statusMessage(saved?: string, error?: string) {
  if (error === "required") return { kind: "danger", text: "اكتب اسم النص والمحتوى قبل الحفظ." };
  if (error) return { kind: "danger", text: "تعذر تنفيذ العملية. حاول مرة أخرى." };
  if (saved === "created") return { kind: "success", text: "تم حفظ النص الجاهز ويمكن استخدامه داخل الدعوات الآن." };
  if (saved === "updated") return { kind: "success", text: "تم تحديث النص الجاهز." };
  if (saved === "deleted") return { kind: "success", text: "تم حذف النص الجاهز." };
  return null;
}

function PresetEditor({ preset }: { preset: ContentPreset }) {
  return (
    <article className="content-preset-card">
      <form action="/api/admin/content-presets" method="post">
        <input name="action" type="hidden" value="update" />
        <input name="id" type="hidden" value={preset.id} />
        <label className="field">
          <span>النوع</span>
          <select name="kind" defaultValue={preset.kind}>
            {presetKinds.map((kind) => (
              <option key={kind} value={kind}>
                {contentPresetKindLabels[kind]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>اسم مختصر</span>
          <input name="title" defaultValue={preset.title} required />
        </label>
        <label className="field wide">
          <span>النص</span>
          <textarea name="content" defaultValue={preset.content} rows={4} required />
        </label>
        <label className="field wide">
          <span>رسالة الاعتذار RSVP (اختياري)</span>
          <input name="secondaryContent" defaultValue={preset.secondaryContent || ""} />
        </label>
        <div className="content-preset-actions">
          <button className="btn btn-soft" type="submit">
            <Save size={16} />
            حفظ
          </button>
        </div>
      </form>
      <form action="/api/admin/content-presets" method="post">
        <input name="action" type="hidden" value="delete" />
        <input name="id" type="hidden" value={preset.id} />
        <button className="btn btn-soft danger-button" type="submit">
          <Trash2 size={16} />
          حذف
        </button>
      </form>
    </article>
  );
}

export default async function ContentPresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [presets, query] = await Promise.all([getDraftContentPresets(), searchParams]);
  const message = statusMessage(query.saved, query.error);
  const totals = {
    all: presets.length,
    opening: presets.filter((preset: ContentPreset) => preset.kind === "opening").length,
    welcome: presets.filter((preset: ContentPreset) => preset.kind === "welcome").length,
    rsvp: presets.filter((preset: ContentPreset) => preset.kind === "rsvp").length,
  };

  return (
    <section className="admin-command-center">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Content Presets</span>
          <h1>النصوص الجاهزة</h1>
          <p>احفظ افتتاحيات ورسائل ترحيب ورسائل RSVP، ثم استخدمها داخل أي دعوة بضغطة واحدة.</p>
        </div>
      </div>

      {message ? <div className={message.kind === "danger" ? "notice danger" : "notice success"}>{message.text}</div> : null}

      <div className="admin-metrics-grid content-preset-metrics">
        <article className="admin-metric-card">
          <FilePenLine />
          <span>كل النصوص</span>
          <strong>{totals.all}</strong>
          <small>متاحة لكل محررات الدعوات.</small>
        </article>
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>افتتاحيات</span>
          <strong>{totals.opening}</strong>
          <small>تُطبّق على رسالة الدعوة الأساسية.</small>
        </article>
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>ترحيب</span>
          <strong>{totals.welcome}</strong>
          <small>تُطبّق على رسالة الترحيب القصيرة.</small>
        </article>
        <article className="admin-metric-card">
          <MessageSquareText />
          <span>RSVP</span>
          <strong>{totals.rsvp}</strong>
          <small>تُطبّق على سؤال تأكيد الحضور.</small>
        </article>
      </div>

      <div className="content-presets-layout">
        <article className="admin-ops-panel content-preset-create">
          <div className="admin-ops-head">
            <PlusCircle size={18} />
            <h3>إضافة نص جاهز</h3>
          </div>
          <form action="/api/admin/content-presets" method="post" className="content-preset-form">
            <input name="action" type="hidden" value="create" />
            <label className="field">
              <span>النوع</span>
              <select name="kind" defaultValue="opening">
                {presetKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {contentPresetKindLabels[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>اسم مختصر</span>
              <input name="title" placeholder="مثال: ترحيب رسمي" required />
            </label>
            <label className="field wide">
              <span>النص</span>
              <textarea name="content" rows={6} placeholder="اكتب النص الذي تريد إعادة استخدامه..." required />
            </label>
            <label className="field wide">
              <span>رسالة الاعتذار RSVP (اختياري)</span>
              <input name="secondaryContent" placeholder="تظهر فقط عند استخدام Preset من نوع RSVP" />
            </label>
            <button className="btn btn-gold" type="submit">
              <Save size={17} />
              حفظ النص
            </button>
          </form>
        </article>

        <div className="content-presets-groups">
          {presetKinds.map((kind) => {
            const group = presets.filter((preset) => preset.kind === kind);
            return (
              <section className="admin-ops-panel" key={kind}>
                <div className="admin-ops-head">
                  <MessageSquareText size={18} />
                  <h3>
                    {contentPresetKindLabels[kind]} ({group.length})
                  </h3>
                </div>
                <div className="content-preset-list">
                  {group.length ? group.map((preset) => <PresetEditor key={preset.id} preset={preset} />) : <div className="admin-clear-state">لا توجد نصوص محفوظة في هذا القسم بعد.</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
