import { CheckCircle2, FileAudio, Globe2, Music2, Power, PowerOff, Save, UploadCloud } from "lucide-react";
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

export default async function AdminMusicPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; count?: string; open?: string }> }) {
  const [params, library, templates] = await Promise.all([searchParams, getMusicLibrary(), getTemplatesWithSettings()]);
  const enabledTemplates = templates.filter((template) => template.enabled);
  const slot = library.slots[0];
  const isActive = Boolean(slot?.enabled && slot.url);
  const appliedCount = Number(params.count || 0);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Music Library</span>
          <h1>الموسيقى</h1>
          <p>موسيقى عامة واحدة لكل القوالب. ارفع ملف جديد لاستبدال القديم تلقائيًا، أو أوقفها، أو شغلها من نفس المكان.</p>
        </div>
      </div>

      {params.saved ? (
        <div className="notice success">
          <CheckCircle2 size={18} />
          {appliedCount > 0 ? `تم حفظ المقطع وتطبيقه على ${params.count} قالب.` : "تم حفظ المقطع. اختار قوالب أو فعل تطبيقه على كل القوالب لما تحب تشغله في الدعوات."}
        </div>
      ) : null}

      {params.error ? (
        <div className="notice danger">
          {params.error === "youtube"
            ? "روابط YouTube لا تعمل كملف صوت مباشر. استخدم ملف MP3/WAV أو رابط مباشر ينتهي بامتداد صوت."
            : params.error === "audio"
              ? "ارفع ملف صوت صالح أو أضف رابط صوت مباشر قبل تشغيل الموسيقى."
              : "لم يتم حفظ الموسيقى. راجع البيانات مرة أخرى."}
        </div>
      ) : null}

      <section className="music-admin-hero panel">
        <div>
          <span className="music-orb">
            <Music2 size={26} />
          </span>
          <div>
            <span className="eyebrow">Audio Control</span>
            <h2>موسيقى واحدة لكل القوالب</h2>
            <p>أي ملف جديد يستبدل الملف المرفوع القديم بدل تكديس ملفات كثيرة داخل المشروع. روابط YouTube غير مدعومة للتشغيل المباشر داخل الصوت.</p>
          </div>
        </div>
        <div className="music-admin-stats">
          <strong>{isActive ? "ON" : "OFF"}</strong>
          <span>{enabledTemplates.length} قالب</span>
        </div>
      </section>

      <div className="music-slot-grid">
        <section className="panel music-slot-card music-single-card">
          <div className="music-slot-summary">
            <span className="music-slot-number">1</span>
            <div className="music-slot-summary-copy">
              <span className="eyebrow">Global Track</span>
              <h2>{slot?.name || "الموسيقى العامة"}</h2>
              <p>{slot?.url ? `${isActive ? "تعمل" : "متوقفة"} على كل القوالب` : "لم يتم إضافة مقطع بعد"}</p>
            </div>
            <span className={isActive ? "music-state-pill active" : "music-state-pill"}>
              {isActive ? <Power size={15} /> : <PowerOff size={15} />}
              {isActive ? "تشغيل" : "إيقاف"}
            </span>
          </div>

          <div className="music-slot-body">
            {slot?.url ? (
              <div className="music-current-source">
                <FileAudio size={18} />
                <span>{slot.url}</span>
              </div>
            ) : null}

            <form className="music-slot-form" action="/api/admin/music" method="post" encType="multipart/form-data">
              <input type="hidden" name="slotId" value={slot?.id || "global-track"} />
              <input type="hidden" name="existingAudioUrl" value={slot?.url || ""} />

              <div className="music-form-topline">
                <label className="field">
                  <span>اسم الموسيقى</span>
                  <input name="trackName" defaultValue={slot?.name || "الموسيقى العامة"} placeholder="مثال: موسيقى الدعوات" />
                </label>
                <label className="music-power-switch">
                  <input name="trackEnabled" type="checkbox" defaultChecked={slot?.enabled !== false} />
                  <span>
                    <Power size={17} />
                    تشغيل الموسيقى
                  </span>
                </label>
              </div>

              <div className="music-source-grid">
                <label className="music-upload-box">
                  <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac" />
                  <UploadCloud size={22} />
                  <strong>رفع ملف واستبدال الحالي</strong>
                  <small>MP3, WAV, OGG, WEBM, M4A حتى 35MB</small>
                </label>

                <label className="field music-url-field">
                  <span>
                    <Globe2 size={15} />
                    رابط صوت مباشر
                  </span>
                  <input name="audioUrl" defaultValue={slot?.url && !slot.url.startsWith("/uploads/") ? slot.url : ""} placeholder="https://example.com/song.mp3" />
                  <small>لا تستخدم YouTube هنا. لازم رابط ملف صوت مباشر ينتهي بامتداد صوت.</small>
                </label>
              </div>

              <button className="btn btn-gold btn-glow music-save-button" type="submit">
                <Save size={18} />
                حفظ وتطبيق على كل القوالب
              </button>
            </form>

            <div className="music-slot-foot">
              <span>آخر حفظ</span>
              <strong>{formatDate(slot?.updatedAt || "")}</strong>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
