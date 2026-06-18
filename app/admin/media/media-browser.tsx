"use client";

import { useState } from "react";
import { LayoutGrid, List, Trash2, Copy, Check, UploadCloud, FileAudio, FileImage, Film, X, AlertTriangle, ImageOff, Square, CheckSquare } from "lucide-react";
import { formatArabicNumber } from "@/lib/utils";
import type { MediaFileReportItem } from "@/lib/media-cleanup";
import { useRouter } from "next/navigation";

function formatBytes(value: number) {
  if (!value) return "0 KB";
  if (value < 1024 * 1024) return `${formatArabicNumber(Math.max(1, Math.round(value / 1024)))} KB`;
  return `${formatArabicNumber(Number((value / (1024 * 1024)).toFixed(1)))} MB`;
}

function sourceLabel(source: string) {
  if (source === "Invitation") return "دعوة";
  if (source === "Order") return "طلب";
  if (source === "Template") return "قالب";
  if (source === "MusicLibrary") return "مكتبة الموسيقى";
  if (source === "RuntimeData") return "بيانات التشغيل";
  return "إعدادات";
}

function MediaPreview({ file }: { file: MediaFileReportItem }) {
  if (file.kind === "video") {
    return (
      <div className="media-library-audio-preview">
        <FileAudio size={24} />
        <video controls preload="metadata" src={file.url} />
      </div>
    );
  }
  if (file.kind === "audio") {
    return (
      <div className="media-library-audio-preview">
        <FileAudio size={24} />
        <audio controls preload="none" src={file.url} />
      </div>
    );
  }
  return <img src={file.url} alt={file.relativePath || "صورة الوسائط"} loading="lazy" />;
}

type MediaBrowserProps = {
  files: MediaFileReportItem[];
};

export function MediaBrowser({ files }: MediaBrowserProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  function toggleSelect(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map((f) => f.url)));
    }
  }

  async function handleBulkDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.set("action", "bulk-delete");
      for (const url of selected) {
        formData.append("url", url);
      }
      const res = await fetch("/api/admin/media/file", { method: "POST", body: formData });
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        router.refresh();
      }
    } catch {
      /**/
    }
    setDeleting(false);
    setConfirmDelete(false);
  }

  function handleReplace(url: string, file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.set("action", "replace");
    formData.set("url", url);
    formData.set("file", file);
    fetch("/api/admin/media/file", { method: "POST", body: formData }).then((res) => {
      if (res.redirected) window.location.href = res.url;
      else router.refresh();
    });
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      window.setTimeout(() => setCopiedUrl(null), 1600);
    } catch {
      /**/
    }
  }

  function handleSingleDelete(file: MediaFileReportItem) {
    setSelected(new Set([file.url]));
    setConfirmDelete(true);
  }

  if (!files.length) {
    return (
      <div className="admin-empty-state compact">
        <ImageOff size={22} />
        <strong>لا توجد ملفات مطابقة.</strong>
      </div>
    );
  }

  return (
    <>
      <div className="media-browser-toolbar">
        <div className="media-view-toggle">
          <button type="button" className={`btn btn-soft${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="عرض شبكي">
            <LayoutGrid size={17} />
          </button>
          <button type="button" className={`btn btn-soft${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} title="عرض قائمة">
            <List size={17} />
          </button>
        </div>
        {selected.size > 0 ? (
          <div className="media-bulk-bar">
            <span>{formatArabicNumber(selected.size)} ملف محدد</span>
            {confirmDelete ? (
              <>
                <span className="media-confirm-text"><AlertTriangle size={15} /> تأكيد الحذف?</span>
                <button className="btn btn-soft danger-button" type="button" onClick={handleBulkDelete} disabled={deleting}>
                  {deleting ? "..." : "تأكيد"}
                </button>
                <button className="btn btn-soft" type="button" onClick={() => setConfirmDelete(false)}>
                  <X size={15} /> إلغاء
                </button>
              </>
            ) : (
              <button className="btn btn-soft danger-button" type="button" onClick={handleBulkDelete}>
                <Trash2 size={16} /> حذف المحدد
              </button>
            )}
          </div>
        ) : null}
      </div>

      {viewMode === "grid" ? (
        <div className="media-library-grid">
          {files.map((file) => (
            <article className="media-library-card" key={file.url}>
              <div className="media-card-check">
                <button type="button" className={`media-checkbox${selected.has(file.url) ? " checked" : ""}`} onClick={() => toggleSelect(file.url)} aria-label="تحديد">
                  {selected.has(file.url) ? <CheckSquare size={18} /> : <Square size={18} />}
                </button>
                <span className={`media-type-badge ${file.kind}`}>
                  {file.kind === "image" ? <FileImage size={12} /> : file.kind === "video" ? <Film size={12} /> : <FileAudio size={12} />}
                  {file.kind === "image" ? "صورة" : file.kind === "video" ? "فيديو" : "صوت"}
                </span>
              </div>
              <div className={file.kind === "audio" || file.kind === "video" ? "media-library-preview audio" : "media-library-preview"}>
                <MediaPreview file={file} />
              </div>
              <div className="media-library-card-body">
                <div>
                  <strong>{file.relativePath}</strong>
                  <span>{file.kind === "image" ? "صورة" : file.kind === "video" ? "فيديو" : "صوت"} · {file.extension.toUpperCase()} · {formatBytes(file.sizeBytes)}</span>
                </div>
                <div className="media-source-badges">
                  {file.sources.length ? file.sources.map((source) => <em key={source}>{sourceLabel(source)}</em>) : <em className="unused">غير مستخدم</em>}
                </div>
                {file.usageDetails.length ? (
                  <div className="media-usage-list">
                    {file.usageDetails.slice(0, 5).map((usage, index) => (
                      <small key={`${usage.source}-${usage.label}-${index}`}>{sourceLabel(usage.source)}: {usage.label}</small>
                    ))}
                    {file.usageDetails.length > 5 ? <small>+ {formatArabicNumber(file.usageDetails.length - 5)} استخدام آخر</small> : null}
                  </div>
                ) : null}
                {file.cleanupReasons.length ? (
                  <div className="media-usage-list">
                    {file.cleanupReasons.map((reason) => (
                      <small key={reason}>سبب التنظيف: {reason}</small>
                    ))}
                  </div>
                ) : null}
                <div className="media-library-actions">
                  <button className="btn btn-soft" type="button" onClick={() => copyUrl(file.url)}>
                    {copiedUrl === file.url ? <Check size={17} /> : <Copy size={17} />}
                    {copiedUrl === file.url ? "تم النسخ" : "نسخ الرابط"}
                  </button>
                  <label className="btn btn-soft media-replace-label">
                    <UploadCloud size={16} />
                    استبدال
                    <input
                      type="file"
                      accept={
                        file.kind === "image"
                          ? `image/*,.${file.extension}`
                          : file.kind === "video"
                            ? `video/*,.${file.extension}`
                            : `audio/*,.${file.extension}`
                      }
                      onChange={(e) => handleReplace(file.url, e.target.files?.[0] || null)}
                    />
                  </label>
                  {file.sources.length === 0 ? (
                    <button className="btn btn-soft danger-button" type="button" onClick={() => handleSingleDelete(file)}>
                      <Trash2 size={16} /> حذف
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="media-list-view">
          <div className="media-list-header">
            <button type="button" className={`media-checkbox${selected.size === files.length ? " checked" : ""}`} onClick={toggleSelectAll} aria-label="تحديد الكل">
              {selected.size === files.length ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <span>الملف</span>
            <span>النوع</span>
            <span>الحجم</span>
            <span>الاستخدام</span>
            <span>الإجراءات</span>
          </div>
          {files.map((file) => (
            <div className="media-list-row" key={file.url}>
              <button type="button" className={`media-checkbox${selected.has(file.url) ? " checked" : ""}`} onClick={() => toggleSelect(file.url)} aria-label="تحديد">
                {selected.has(file.url) ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <div className="media-list-thumb">
                {file.kind === "image" ? (
                  <img src={file.url} alt="" loading="lazy" />
                ) : file.kind === "video" ? (
                  <Film size={20} />
                ) : (
                  <FileAudio size={20} />
                )}
              </div>
              <div className="media-list-info">
                <strong>{file.relativePath}</strong>
              </div>
              <span className={`media-type-badge ${file.kind}`}>
                {file.kind === "image" ? "صورة" : file.kind === "video" ? "فيديو" : "صوت"}
              </span>
              <span className="media-list-size">{formatBytes(file.sizeBytes)}</span>
              <div className="media-source-badges">
                {file.sources.length ? file.sources.map((source) => <em key={source}>{sourceLabel(source)}</em>) : <em className="unused">غير مستخدم</em>}
              </div>
              <div className="media-list-actions">
                <button className="btn btn-soft" type="button" onClick={() => copyUrl(file.url)} title="نسخ الرابط">
                  {copiedUrl === file.url ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <label className="btn btn-soft media-replace-label" title="استبدال">
                  <UploadCloud size={15} />
                  <input
                    type="file"
                    accept={
                      file.kind === "image"
                        ? `image/*,.${file.extension}`
                        : file.kind === "video"
                          ? `video/*,.${file.extension}`
                          : `audio/*,.${file.extension}`
                    }
                    onChange={(e) => handleReplace(file.url, e.target.files?.[0] || null)}
                  />
                </label>
                {file.sources.length === 0 ? (
                  <button className="btn btn-soft danger-button" type="button" onClick={() => handleSingleDelete(file)} title="حذف">
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
