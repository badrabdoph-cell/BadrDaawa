"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import type { InternalNote, InternalNoteEntityType } from "@/lib/types";

function formatNoteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

function isEdited(note: InternalNote) {
  return note.updatedAt && note.updatedAt !== note.createdAt;
}

export function InternalNotesPanel({
  entityType,
  entityId,
  notes,
  title = "ملاحظات داخلية",
  returnTo,
  compact = false,
}: {
  entityType: InternalNoteEntityType;
  entityId: string;
  notes: InternalNote[];
  title?: string;
  returnTo: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notes;
    return notes.filter((note) => [note.body, note.authorLabel, note.createdAt, note.updatedAt].join(" ").toLowerCase().includes(normalized));
  }, [notes, query]);

  return (
    <section className={compact ? "internal-notes-panel compact" : "internal-notes-panel"} aria-label={title}>
      <div className="internal-notes-head">
        <div>
          <StickyNote size={16} />
          <strong>{title}</strong>
        </div>
        <span>{notes.length}</span>
      </div>

      <label className="internal-notes-search">
        <Search size={15} />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث داخل الملاحظات" />
      </label>

      <form action="/api/admin/internal-notes" method="post" className="internal-note-form">
        <input type="hidden" name="action" value="create" />
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <textarea name="body" rows={compact ? 2 : 3} maxLength={4000} required placeholder="أضف ملاحظة لا تظهر للعميل..." />
        <button className="btn btn-soft" type="submit">
          <Plus size={15} />
          إضافة
        </button>
      </form>

      <div className="internal-note-list">
        {filteredNotes.map((note) => (
          <article className="internal-note-card" key={note.id}>
            <p>{note.body}</p>
            <div className="internal-note-meta">
              <span>بواسطة {note.authorLabel}</span>
              <span>إنشاء: {formatNoteDate(note.createdAt)}</span>
              <span>آخر تعديل: {formatNoteDate(note.updatedAt)}</span>
              {isEdited(note) ? <strong>معدلة</strong> : null}
            </div>
            <details>
              <summary>
                <Pencil size={14} />
                تعديل
              </summary>
              <form action="/api/admin/internal-notes" method="post" className="internal-note-form inline">
                <input type="hidden" name="action" value="update" />
                <input type="hidden" name="id" value={note.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <textarea name="body" defaultValue={note.body} rows={3} maxLength={4000} required />
                <button className="btn btn-soft" type="submit">
                  <Pencil size={15} />
                  حفظ التعديل
                </button>
              </form>
            </details>
            <form action="/api/admin/internal-notes" method="post" className="internal-note-delete" onSubmit={(event) => {
              if (!window.confirm("حذف هذه الملاحظة الداخلية؟")) event.preventDefault();
            }}>
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value={note.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className="btn btn-soft danger-button" type="submit">
                <Trash2 size={15} />
                حذف
              </button>
            </form>
          </article>
        ))}
        {!filteredNotes.length ? <p className="internal-notes-empty">{notes.length ? "لا توجد نتائج مطابقة للبحث." : "لا توجد ملاحظات داخلية بعد."}</p> : null}
      </div>
    </section>
  );
}
