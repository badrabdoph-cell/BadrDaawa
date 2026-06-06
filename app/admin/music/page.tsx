import { CheckCircle2, FileAudio, Globe2, Music2, Save, UploadCloud } from "lucide-react";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  if (!value) return "لم يتم الحفظ بعد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAssignedTemplates(slotTemplateSlugs: string[], templates: Awaited<ReturnType<typeof getTemplatesWithSettings>>) {
  const assigned = new Set(slotTemplateSlugs);
  return templates.filter((template) => assigned.has(template.slug));
}

export default async function AdminMusicPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; count?: string }> }) {
  const [params, library, templates] = await Promise.all([searchParams, getMusicLibrary(), getTemplatesWithSettings()]);
  const enabledTemplates = templates.filter((template) => template.enabled);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Music Library</span>
          <h1>الموسيقى</h1>
          <p>ارفع حتى 5 مقاطع صوتية أو استخدم رابط صوت مباشر، وطبّق كل مقطع على كل القوالب أو على قوالب محددة بالاسم.</p>
        </div>
      </div>

      {params.saved ? (
        <div className="notice success">
          <CheckCircle2 size={18} />
          تم حفظ المقطع وتطبيقه على {params.count || "0"} قالب.
        </div>
      ) : null}

      {params.error ? (
        <div className="notice danger">
          تأكد من اختيار ملف صوت أو رابط مباشر، واختيار قالب واحد على الأقل أو تطبيقه على كل القوالب.
        </div>
      ) : null}

      <section className="music-admin-hero panel">
        <div>
          <span className="music-orb">
            <Music2 size={26} />
          </span>
          <div>
            <span className="eyebrow">Smart Audio Mapping</span>
            <h2>مكتبة صوت مركزية للقوالب</h2>
            <p>أي حفظ هنا يحدث إعدادات القوالب مباشرة، وبالتالي المعاينة والدعوات تستخدم نفس المقطع الجديد بدون تعديل يدوي لكل قالب.</p>
          </div>
        </div>
        <div className="music-admin-stats">
          <strong>{library.slots.filter((slot) => slot.url).length}/5</strong>
          <span>مقاطع محفوظة</span>
        </div>
      </section>

      <div className="music-slot-grid">
        {library.slots.map((slot, index) => {
          const assignedTemplates = slot.applyToAll ? enabledTemplates : getAssignedTemplates(slot.templateSlugs, enabledTemplates);
          return (
            <article className="panel music-slot-card" key={slot.id}>
              <div className="music-slot-head">
                <span className="music-slot-number">{index + 1}</span>
                <div>
                  <span className="eyebrow">Track Slot</span>
                  <h2>{slot.name}</h2>
                  <p>{slot.url ? `مطبق على ${assignedTemplates.length} قالب` : "جاهز لإضافة مقطع جديد"}</p>
                </div>
              </div>

              {slot.url ? (
                <div className="music-current-source">
                  <FileAudio size={18} />
                  <span>{slot.url}</span>
                </div>
              ) : null}

              <form className="music-slot-form" action="/api/admin/music" method="post" encType="multipart/form-data">
                <input type="hidden" name="slotId" value={slot.id} />
                <label className="field">
                  <span>اسم المقطع</span>
                  <input name="trackName" defaultValue={slot.name} placeholder="مثال: دخول العروس" />
                </label>

                <label className="music-upload-box">
                  <input name="audioFile" type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/webm,audio/mp4,audio/aac" />
                  <UploadCloud size={22} />
                  <strong>رفع ملف صوت</strong>
                  <small>MP3, WAV, OGG, WEBM, M4A حتى 35MB</small>
                </label>

                <label className="field">
                  <span>
                    <Globe2 size={15} />
                    رابط صوت مباشر
                  </span>
                  <input name="audioUrl" defaultValue={slot.url.startsWith("/uploads/") ? "" : slot.url} placeholder="https://example.com/song.mp3" />
                </label>

                <label className="admin-toggle-row music-apply-all">
                  <input name="applyToAll" type="checkbox" defaultChecked={slot.applyToAll} />
                  <span>تطبيق هذا المقطع على كل القوالب دفعة واحدة</span>
                </label>

                <div className="music-template-picker">
                  <div className="music-picker-head">
                    <strong>اختيار القوالب</strong>
                    <span>{enabledTemplates.length} قالب متاح</span>
                  </div>
                  <div className="music-template-list">
                    {enabledTemplates.map((template) => (
                      <label className="music-template-option" key={template.slug}>
                        <input name="templateSlugs" type="checkbox" value={template.slug} defaultChecked={slot.applyToAll || slot.templateSlugs.includes(template.slug)} />
                        <span>
                          <strong>{template.arabicName}</strong>
                          <small>{template.slug}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="btn btn-gold btn-glow music-save-button" type="submit">
                  <Save size={18} />
                  حفظ وتطبيق المقطع
                </button>
              </form>

              <div className="music-slot-foot">
                <span>آخر حفظ</span>
                <strong>{formatDate(slot.updatedAt)}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
