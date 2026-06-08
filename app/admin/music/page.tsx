import { AlertTriangle, CheckCircle2, Disc3, FileAudio, Library, Music2, Pencil, Plus, RefreshCw, Star, Trash2, UploadCloud } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TemplatesPreviewMusicForm } from "@/components/TemplatesPreviewMusicForm";
import { getAdminInvitations } from "@/lib/admin-data";
import { isUploadedMusicUrl } from "@/lib/audio-files";
import { getDefaultMusicSlot, getMusicLibrary, getMusicUsage, type MusicSlot } from "@/lib/music-library";
import { resolveTemplatesPreviewMusic } from "@/lib/templates-preview-music";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type MusicPageParams = {
  saved?: string;
  error?: string;
  count?: string;
  converted?: string;
  confirmDelete?: string;
  used?: string;
};

function formatDate(value?: string) {
  if (!value) return "غير محدد";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatBytes(value?: number) {
  if (!value) return "غير معروف";
  if (value < 1024 * 1024) return `${formatArabicNumber(value / 1024)} KB`;
  return `${formatArabicNumber(value / (1024 * 1024))} MB`;
}

function formatDuration(value?: number) {
  if (!value) return "غير معروف";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function saveMessage(params: MusicPageParams) {
  if (params.saved === "templates-preview") return "تم حفظ موسيقى القوالب الجاهزة. سيظهر التغيير في معاينات القوالب فقط.";
  if (params.saved === "default") return "تم تعيين الموسيقى الافتراضية للموقع.";
  if (params.saved === "disabled") return "تم إيقاف الموسيقى الافتراضية.";
  if (params.saved === "deleted") return `تم حذف المقطع وتحويل ${formatArabicNumber(Number(params.converted || 0))} دعوة للموسيقى الافتراضية.`;
  if (params.saved === "renamed") return "تم تعديل اسم المقطع.";
  if (params.saved === "saved") return "تم حفظ المقطع في مكتبة الموسيقى.";
  if (params.saved) return "تم حفظ التغييرات.";
  return "";
}

function errorMessage(error?: string) {
  if (!error) return "";
  if (error === "blocked-url") return "هذا الرابط ليس ملفاً صوتياً مباشراً أو من مصدر غير مدعوم مثل YouTube أو Spotify أو SoundCloud.";
  if (error === "name") return "اكتب اسم واضح للمقطع قبل الحفظ.";
  if (error === "audio") return "لا يوجد ملف صوت صالح. الصيغ المسموحة: mp3, wav, ogg, aac, m4a, webm, flac.";
  if (error === "slot") return "لم يتم العثور على المقطع المطلوب.";
  if (error === "templates-preview-track") return "اختار مقطعًا صالحًا لموسيقى القوالب الجاهزة أو أوقف الإعداد.";
  return "تعذر تنفيذ أمر الموسيقى.";
}

function trackStatus(track: MusicSlot, defaultTrack?: MusicSlot) {
  if (defaultTrack?.id === track.id) return "الموسيقى الافتراضية";
  return track.enabled ? "نشط" : "محفوظ";
}

export default async function AdminMusicPage({ searchParams }: { searchParams: Promise<MusicPageParams> }) {
  const [params, library, invitations] = await Promise.all([searchParams, getMusicLibrary(), getAdminInvitations()]);
  const tracks = library.slots.filter((slot) => slot.url);
  const templatesPreviewMusic = await resolveTemplatesPreviewMusic(library);
  const defaultTrack = getDefaultMusicSlot(library);
  const usage = getMusicUsage(invitations, library);
  const confirmTrack = params.confirmDelete ? tracks.find((track) => track.id === params.confirmDelete) : undefined;
  const uploadedTracks = tracks.filter((track) => isUploadedMusicUrl(track.url));
  const totalSize = tracks.reduce((sum, track) => sum + (track.sizeBytes || 0), 0);
  const mostUsed = usage.mostUsedTrack;
  const success = saveMessage(params);
  const error = errorMessage(params.error);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Music System</span>
          <h1>إدارة الموسيقى</h1>
          <p>مكتبة موحدة للموسيقى مع أولوية واضحة: موسيقى الدعوة، ثم اختيار من المكتبة، ثم الموسيقى الافتراضية للموقع.</p>
        </div>
      </div>

      {success ? <div className="notice success"><CheckCircle2 size={18} />{success}</div> : null}
      {error ? <div className="notice danger"><AlertTriangle size={18} />{error}</div> : null}
      {confirmTrack ? (
        <section className="notice danger music-delete-warning">
          <AlertTriangle size={20} />
          <div>
            <strong>المقطع مستخدم في {formatArabicNumber(Number(params.used || 0))} دعوة.</strong>
            <span>عند تأكيد الحذف سيتم تحويل هذه الدعوات تلقائياً للموسيقى الافتراضية للموقع.</span>
          </div>
          <form action="/api/admin/music" method="post">
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="slotId" value={confirmTrack.id} />
            <input type="hidden" name="forceDelete" value="1" />
            <button className="btn btn-soft danger-button" type="submit"><Trash2 size={17} /> تأكيد الحذف</button>
          </form>
        </section>
      ) : null}

      <section className="music-stats-grid" aria-label="إحصائيات الموسيقى">
        <div className="admin-list-stat"><Library size={19} /><span>عدد المقاطع</span><strong>{formatArabicNumber(tracks.length)}</strong></div>
        <div className="admin-list-stat"><UploadCloud size={19} /><span>ملفات مرفوعة</span><strong>{formatArabicNumber(uploadedTracks.length)}</strong></div>
        <div className="admin-list-stat"><FileAudio size={19} /><span>حجم المكتبة</span><strong>{formatBytes(totalSize)}</strong></div>
        <div className="admin-list-stat good"><Star size={19} /><span>الأكثر استخداماً</span><strong>{mostUsed?.count ? mostUsed.slot.name : "لا يوجد"}</strong></div>
        <div className="admin-list-stat"><Disc3 size={19} /><span>موسيقى خاصة</span><strong>{formatArabicNumber(usage.customInvitationCount)}</strong></div>
        <div className="admin-list-stat good"><Music2 size={19} /><span>تستخدم الافتراضية</span><strong>{formatArabicNumber(usage.defaultInvitationCount)}</strong></div>
      </section>

      <section className="music-control-panel panel">
        <div className="admin-card-head">
          <Music2 size={22} />
          <div>
            <span className="eyebrow">Default Site Music</span>
            <h2>الموسيقى الافتراضية للموقع</h2>
          </div>
        </div>
        <div className="music-default-card">
          <span className={defaultTrack ? "music-status-icon active" : "music-status-icon"}><Music2 size={24} /></span>
          <div>
            <strong>{defaultTrack?.name || "لا يوجد مقطع افتراضي"}</strong>
            <small>المدة: {formatDuration(defaultTrack?.durationSeconds)} · الحالة: {defaultTrack ? "مفعلة" : "غير مفعلة"}</small>
          </div>
          {defaultTrack ? <AudioPlayer src={defaultTrack.url} label={defaultTrack.name} /> : null}
          <a className="btn btn-soft" href="#add-music"><RefreshCw size={17} /> تغيير المقطع</a>
        </div>
      </section>

      <section className="music-control-panel panel templates-preview-music-panel">
        <div className="admin-card-head">
          <Disc3 size={22} />
          <div>
            <span className="eyebrow">Templates Preview Music</span>
            <h2>موسيقى القوالب الجاهزة</h2>
          </div>
        </div>
        <p className="templates-preview-music-note">
          هذا الإعداد يعمل فقط داخل صفحة عرض القوالب الجاهزة ومعاينات القوالب قبل إنشاء الدعوة. لا يغيّر أي دعوة منشأة، ولا موسيقى العميل، ولا أي موسيقى مخصصة داخل دعوة.
        </p>
        <TemplatesPreviewMusicForm tracks={tracks} settings={templatesPreviewMusic.settings} />
      </section>

      <section className="music-library-panel panel">
        <div className="admin-card-head">
          <FileAudio size={22} />
          <div>
            <span className="eyebrow">Music Library</span>
            <h2>مكتبة الموسيقى</h2>
          </div>
        </div>

        {tracks.length ? (
          <div className="music-table-shell">
            <table className="data-table music-data-table">
              <thead>
                <tr>
                  <th>المقطع</th>
                  <th>المدة</th>
                  <th>الحجم</th>
                  <th>النوع</th>
                  <th>تاريخ الإضافة</th>
                  <th>الاستخدام</th>
                  <th>الحالة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track) => {
                  const isDefault = defaultTrack?.id === track.id;
                  const usedCount = usage.usageByUrl.get(track.url) || 0;
                  return (
                    <tr key={track.id}>
                      <td>
                        <strong>{track.name}</strong>
                        <small>{track.url}</small>
                      </td>
                      <td>{formatDuration(track.durationSeconds)}</td>
                      <td>{formatBytes(track.sizeBytes)}</td>
                      <td>{track.extension || track.mimeType || "غير معروف"}</td>
                      <td>{formatDate(track.createdAt || track.updatedAt)}</td>
                      <td>{formatArabicNumber(usedCount)} دعوة</td>
                      <td><span className={isDefault ? "status success" : "status"}>{trackStatus(track, defaultTrack)}</span></td>
                      <td>
                        <div className="music-row-actions">
                          <AudioPlayer src={track.url} label={track.name} />
                          <form action="/api/admin/music" method="post" className="music-inline-form">
                            <input type="hidden" name="action" value="rename" />
                            <input type="hidden" name="slotId" value={track.id} />
                            <input name="trackName" defaultValue={track.name} aria-label="اسم المقطع" />
                            <button className="btn btn-soft btn-icon" type="submit" title="تعديل الاسم"><Pencil size={16} /></button>
                          </form>
                          <form action="/api/admin/music" method="post" encType="multipart/form-data" className="music-inline-form">
                            <input type="hidden" name="action" value="replace" />
                            <input type="hidden" name="slotId" value={track.id} />
                            <input type="hidden" name="trackName" value={track.name} />
                            <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac" aria-label="استبدال الملف" />
                            <button className="btn btn-soft btn-icon" type="submit" title="استبدال الملف"><RefreshCw size={16} /></button>
                          </form>
                          <form action="/api/admin/music" method="post">
                            <input type="hidden" name="action" value="default" />
                            <input type="hidden" name="slotId" value={track.id} />
                            <button className="btn btn-soft btn-icon" type="submit" title="تعيين كموسيقى افتراضية" disabled={isDefault}><Star size={16} /></button>
                          </form>
                          <form action="/api/admin/music" method="post">
                            <input type="hidden" name="action" value="delete" />
                            <input type="hidden" name="slotId" value={track.id} />
                            <button className="btn btn-soft btn-icon danger-button" type="submit" title="حذف الملف"><Trash2 size={16} /></button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="music-empty-box">لا توجد مقاطع محفوظة بعد.</div>
        )}
      </section>

      <section id="add-music" className="music-replace-panel panel">
        <div className="admin-card-head">
          <Plus size={22} />
          <div>
            <span className="eyebrow">Add Track</span>
            <h2>إضافة موسيقى جديدة</h2>
          </div>
        </div>
        <form className="music-simple-form" action="/api/admin/music" method="post" encType="multipart/form-data">
          <input type="hidden" name="action" value="save" />
          <label className="field">
            <span>اسم المقطع</span>
            <input name="trackName" placeholder="مثال: دخول العروسة" required />
          </label>
          <label className="field">
            <span>رفع ملف صوت</span>
            <input name="audioFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac" />
            <small>الصيغ المسموحة: mp3, wav, ogg, aac, m4a, webm, flac.</small>
          </label>
          <label className="field">
            <span>أو رابط مباشر لملف صوت</span>
            <input name="audioUrl" placeholder="https://example.com/song.mp3" />
            <small>لا يقبل YouTube أو Spotify أو SoundCloud غير المباشر.</small>
          </label>
          <label className="music-checkline">
            <input name="setDefault" type="checkbox" />
            <span>تعيين كموسيقى افتراضية للموقع بعد الحفظ</span>
          </label>
          <button className="btn btn-gold btn-glow music-save-button" type="submit"><Plus size={18} /> إضافة موسيقى</button>
        </form>
      </section>
    </>
  );
}
