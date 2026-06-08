"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import type { MusicSlot } from "@/lib/music-library";
import type { TemplatesPreviewMusicSettings } from "@/lib/templates-preview-music";

export function TemplatesPreviewMusicForm({
  tracks,
  settings,
}: {
  tracks: MusicSlot[];
  settings: TemplatesPreviewMusicSettings;
}) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [trackId, setTrackId] = useState(settings.trackId);
  const selectedTrack = useMemo(() => tracks.find((track) => track.id === trackId) || tracks[0], [trackId, tracks]);

  return (
    <form className="templates-preview-music-form" action="/api/admin/music" method="post">
      <input type="hidden" name="action" value="templates-preview" />
      <label className={enabled ? "admin-toggle-row template-preview-music-toggle active" : "admin-toggle-row template-preview-music-toggle"}>
        <input name="templatesPreviewEnabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        <span>تشغيل موسيقى القوالب الجاهزة</span>
        <strong>{enabled ? "ON" : "OFF"}</strong>
      </label>
      <label className="field">
        <span>الموسيقى المستخدمة في معاينات القوالب</span>
        <select name="templatesPreviewTrackId" value={selectedTrack?.id || ""} onChange={(event) => setTrackId(event.target.value)} disabled={!tracks.length}>
          {tracks.length ? (
            tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))
          ) : (
            <option value="">لا توجد ملفات صوتية محفوظة</option>
          )}
        </select>
        <small>هذا الاختيار خاص بصفحة القوالب ومعايناتها فقط.</small>
      </label>
      <div className="templates-preview-music-player">
        {selectedTrack ? <AudioPlayer src={selectedTrack.url} label={`معاينة: ${selectedTrack.name}`} loop={false} /> : <div className="music-empty-box">أضف مقطعًا إلى مكتبة الموسيقى أولًا.</div>}
      </div>
      <button className="btn btn-gold btn-glow" type="submit" disabled={enabled && !selectedTrack}>
        <Save size={17} />
        حفظ موسيقى القوالب الجاهزة
      </button>
    </form>
  );
}
