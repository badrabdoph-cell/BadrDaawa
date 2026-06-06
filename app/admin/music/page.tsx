import { CheckCircle2, ChevronDown, FileAudio, Globe2, Music2, Power, PowerOff, Save, UploadCloud } from "lucide-react";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

const slotLabels = ["الموسيقى الأولى", "الموسيقى الثانية", "الموسيقى الثالثة", "الموسيقى الرابعة", "الموسيقى الخامسة"];

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
          <p>تحكم في 5 مقاطع صوتية، افتح المقطع المطلوب فقط، واربطه بكل القوالب أو بقوالب محددة.</p>
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
          تأكد من اختيار قالب واحد على الأقل. ولو المقطع في وضع التشغيل لازم يكون فيه ملف صوت أو رابط مباشر.
        </div>
      ) : null}

      <section className="music-admin-hero panel">
        <div>
          <span className="music-orb">
            <Music2 size={26} />
          </span>
          <div>
            <span className="eyebrow">Audio Control</span>
            <h2>تحكم هادي في موسيقى القوالب</h2>
            <p>الرفع أو الرابط يتزامن مع ملفات المشروع، وزر التشغيل يحدد هل المقطع يعمل على القوالب المختارة أو يتوقف عنها.</p>
          </div>
        </div>
        <div className="music-admin-stats">
          <strong>{library.slots.filter((slot) => slot.url && slot.enabled).length}/5</strong>
          <span>مقاطع مفعلة</span>
        </div>
      </section>

      <div className="music-slot-grid">
        {library.slots.map((slot, index) => {
          const assignedTemplates = slot.applyToAll ? enabledTemplates : getAssignedTemplates(slot.templateSlugs, enabledTemplates);
          const isActive = Boolean(slot.enabled && slot.url);
          const slotLabel = slotLabels[index] || `الموسيقى ${index + 1}`;

          return (
            <details className="panel music-slot-card" key={slot.id} open={params.saved === slot.id}>
              <summary className="music-slot-summary">
                <span className="music-slot-number">{index + 1}</span>
                <div className="music-slot-summary-copy">
                  <span className="eyebrow">{slotLabel}</span>
                  <h2>{slot.name}</h2>
                  <p>{slot.url ? `${isActive ? "يعمل" : "متوقف"} على ${assignedTemplates.length} قالب` : "لم يتم إضافة مقطع بعد"}</p>
                </div>
                <span className={isActive ? "music-state-pill active" : "music-state-pill"}>
                  {isActive ? <Power size={15} /> : <PowerOff size={15} />}
                  {isActive ? "تشغيل" : "إيقاف"}
                </span>
                <ChevronDown className="music-summary-chevron" size={19} />
              </summary>

              <div className="music-slot-body">
                {slot.url ? (
                  <div className="music-current-source">
                    <FileAudio size={18} />
                    <span>{slot.url}</span>
                  </div>
                ) : null}

                <form className="music-slot-form" action="/api/admin/music" method="post" encType="multipart/form-data">
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="existingAudioUrl" value={slot.url} />

                  <div className="music-form-topline">
                    <label className="field">
                      <span>اسم المقطع</span>
                      <input name="trackName" defaultValue={slot.name} placeholder="مثال: دخول العروس" />
                    </label>
                    <label className="music-power-switch">
                      <input name="trackEnabled" type="checkbox" defaultChecked={slot.enabled} />
                      <span>
                        <Power size={17} />
                        تشغيل المقطع
                      </span>
                    </label>
                  </div>

                  <div className="music-source-grid">
                    <label className="music-upload-box">
                      <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac" />
                      <UploadCloud size={22} />
                      <strong>رفع ملف صوت</strong>
                      <small>MP3, WAV, OGG, WEBM, M4A حتى 35MB</small>
                    </label>

                    <label className="field music-url-field">
                      <span>
                        <Globe2 size={15} />
                        رابط صوت مباشر
                      </span>
                      <input name="audioUrl" defaultValue={slot.url.startsWith("/uploads/") ? "" : slot.url} placeholder="https://example.com/song.mp3" />
                      <small>لو لم تختار ملفًا أو رابطًا جديدًا سيتم استخدام المقطع المحفوظ حاليًا.</small>
                    </label>
                  </div>

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
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
