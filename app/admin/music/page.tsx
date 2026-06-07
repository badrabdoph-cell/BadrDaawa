import { AlertTriangle, CheckCircle2, FileAudio, Music2, Pause, Play, Save, Trash2, UploadCloud } from "lucide-react";
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

function saveMessage(saved?: string, count?: string) {
  const templateCount = Number(count || 0);
  if (saved === "enabled") return `تم تشغيل الموسيقى على ${templateCount} قالب.`;
  if (saved === "disabled") return "تم إيقاف الموسيقى العامة. الملف محفوظ ويمكن تشغيله مرة أخرى.";
  if (saved === "cleared") return "تم حذف المقطع وإيقاف الموسيقى العامة.";
  if (saved) return `تم حفظ الموسيقى وتطبيقها على ${templateCount} قالب.`;
  return "";
}

export default async function AdminMusicPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; count?: string }> }) {
  const [params, library, templates] = await Promise.all([searchParams, getMusicLibrary(), getTemplatesWithSettings()]);
  const enabledTemplates = templates.filter((template) => template.enabled);
  const slot = library.slots[0];
  const slotId = slot?.id || "global-track";
  const hasAudio = Boolean(slot?.url);
  const isActive = Boolean(slot?.enabled && slot.url);
  const currentName = slot?.name || "الموسيقى العامة";
  const message = saveMessage(params.saved, params.count);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Music Control</span>
          <h1>الموسيقى العامة</h1>
          <p>تحكم مباشر في مقطع واحد فقط لكل القوالب. أي رفع جديد يستبدل القديم بدل ما يزود ملفات بلا داعي.</p>
        </div>
      </div>

      {message ? (
        <div className="notice success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      ) : null}

      {params.error ? (
        <div className="notice danger">
          <AlertTriangle size={18} />
          {params.error === "youtube"
            ? "YouTube لا يعمل كصوت مباشر. استخدم ملف صوت أو رابط MP3/WAV/OGG مباشر."
            : params.error === "audio"
              ? "لا يوجد ملف صوت صالح. ارفع ملف أو أضف رابط صوت مباشر قبل التشغيل."
              : "تعذر تنفيذ أمر الموسيقى."}
        </div>
      ) : null}

      <section className="music-control-panel panel">
        <div className="music-control-status">
          <span className={isActive ? "music-status-icon active" : "music-status-icon"}>
            <Music2 size={24} />
          </span>
          <div>
            <span className="eyebrow">Global Track</span>
            <h2>{currentName}</h2>
            <p>{hasAudio ? (isActive ? `شغالة على ${enabledTemplates.length} قالب` : "متوقفة حاليا، والمقطع محفوظ") : "لا يوجد مقطع محفوظ حاليا"}</p>
          </div>
          <strong className={isActive ? "music-live-badge active" : "music-live-badge"}>{isActive ? "ON" : "OFF"}</strong>
        </div>

        {slot?.url ? (
          <div className="music-now-playing">
            <div>
              <FileAudio size={18} />
              <span>{slot.url}</span>
            </div>
            <audio controls preload="metadata" src={slot.url} />
          </div>
        ) : (
          <div className="music-empty-box">ارفع ملف صوت أو أضف رابط مباشر عشان الموسيقى تشتغل في القوالب.</div>
        )}

        <div className="music-action-row">
          <form action="/api/admin/music" method="post">
            <input type="hidden" name="slotId" value={slotId} />
            <button className="btn btn-gold" name="action" value="enable" type="submit" disabled={!hasAudio || isActive}>
              <Play size={17} />
              تشغيل
            </button>
          </form>
          <form action="/api/admin/music" method="post">
            <input type="hidden" name="slotId" value={slotId} />
            <button className="btn btn-soft" name="action" value="disable" type="submit" disabled={!hasAudio || !isActive}>
              <Pause size={17} />
              إيقاف
            </button>
          </form>
          <form action="/api/admin/music" method="post">
            <input type="hidden" name="slotId" value={slotId} />
            <button className="btn btn-soft danger-button" name="action" value="clear" type="submit" disabled={!hasAudio}>
              <Trash2 size={17} />
              حذف المقطع
            </button>
          </form>
        </div>
      </section>

      <section className="music-replace-panel panel">
        <div className="admin-card-head">
          <UploadCloud size={22} />
          <div>
            <span className="eyebrow">Replace Audio</span>
            <h2>استبدال أو حفظ مقطع جديد</h2>
            <p>اختار ملف من جهازك أو ضع رابط صوت مباشر. الحفظ يطبق المقطع على كل القوالب تلقائيا.</p>
          </div>
        </div>

        <form className="music-simple-form" action="/api/admin/music" method="post" encType="multipart/form-data">
          <input type="hidden" name="slotId" value={slotId} />
          <input type="hidden" name="existingAudioUrl" value={slot?.url || ""} />
          <input type="hidden" name="action" value="save" />

          <label className="field">
            <span>اسم المقطع</span>
            <input name="trackName" defaultValue={currentName} placeholder="الموسيقى العامة" />
          </label>

          <label className="field">
            <span>رفع ملف صوت من الجهاز</span>
            <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac" />
            <small>لو اخترت ملف جديد، هيستبدل الملف القديم تلقائيا.</small>
          </label>

          <label className="field">
            <span>أو رابط صوت مباشر</span>
            <input name="audioUrl" defaultValue={slot?.url && !slot.url.startsWith("/uploads/") ? slot.url : ""} placeholder="https://example.com/song.mp3" />
            <small>لازم الرابط يكون ملف صوت مباشر، وليس صفحة YouTube.</small>
          </label>

          <label className="music-checkline">
            <input name="trackEnabled" type="checkbox" defaultChecked={slot?.enabled !== false} />
            <span>تشغيل المقطع بعد الحفظ</span>
          </label>

          <div className="music-meta-line">
            <span>آخر حفظ</span>
            <strong>{formatDate(slot?.updatedAt || "")}</strong>
          </div>

          <button className="btn btn-gold btn-glow music-save-button" type="submit">
            <Save size={18} />
            حفظ واستبدال
          </button>
        </form>
      </section>
    </>
  );
}
