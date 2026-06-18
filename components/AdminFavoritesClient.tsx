"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Archive, ExternalLink, FileText, GripVertical, UsersRound } from "lucide-react";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import type { AdminFavoriteEntityType } from "@/lib/types";
import type { AdminFavorite } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

type FavoritesClientProps = {
  groupedFavorites: [AdminFavoriteEntityType, FavoriteCardData[]][];
  favoriteCounts: Record<AdminFavoriteEntityType, number>;
  totalCount: number;
  query: string;
  selectedType: string | undefined;
};

type FavoriteCardData = {
  favorite: AdminFavorite;
  href: string;
  subtitle: string;
};

const typeLabels: Record<AdminFavoriteEntityType, string> = {
  invitation: "الدعوات",
  order: "الطلبات",
  customer: "العملاء",
};

const typeIcons = {
  invitation: Archive,
  order: FileText,
  customer: UsersRound,
};

const TYPE_ORDER: AdminFavoriteEntityType[] = ["invitation", "order", "customer"];

export function AdminFavoritesClient({ groupedFavorites, favoriteCounts, totalCount, query, selectedType }: FavoritesClientProps) {
  const [favorites, setFavorites] = useState(groupedFavorites);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [dragItem, setDragItem] = useState<{ group: number; index: number } | null>(null);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveNote = useCallback(async (favoriteId: string, note: string) => {
    try {
      await fetch("/api/admin/favorites/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: favoriteId, note }),
      });
    } catch {
    }
  }, []);

  const handleNoteStart = (favoriteId: string, currentNote: string | undefined) => {
    setEditingNote(favoriteId);
    setNoteText(currentNote || "");
  };

  const handleNoteSave = (favoriteId: string) => {
    saveNote(favoriteId, noteText);
    setFavorites((prev) =>
      prev.map(([type, items]) => [
        type,
        items.map((item) =>
          item.favorite.id === favoriteId ? { ...item, favorite: { ...item.favorite, note: noteText || undefined } } : item
        ),
      ])
    );
    setEditingNote(null);
    setNoteText("");
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent, favoriteId: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNoteSave(favoriteId);
    }
    if (e.key === "Escape") {
      setEditingNote(null);
      setNoteText("");
    }
  };

  const handleDragStart = (groupIdx: number, itemIdx: number) => {
    setDragItem({ group: groupIdx, index: itemIdx });
  };

  const handleDragOver = (e: React.DragEvent, groupIdx: number, itemIdx: number) => {
    e.preventDefault();
    if (!dragItem || (dragItem.group === groupIdx && dragItem.index === itemIdx)) return;
    const newFavorites = favorites.map(([type, items]) => [type, [...items]] as [AdminFavoriteEntityType, FavoriteCardData[]]);
    const sourceGroup = newFavorites[dragItem.group];
    const targetGroup = newFavorites[groupIdx];
    const [moved] = sourceGroup[1].splice(dragItem.index, 1);
    targetGroup[1].splice(itemIdx, 0, moved);
    setFavorites(newFavorites);
    setDragItem({ group: groupIdx, index: itemIdx });
  };

  const handleDragEnd = () => {
    setDragItem(null);
    const orderedIds = favorites.flatMap(([, items]) => items.map((item) => item.favorite.id));
    fetch("/api/admin/favorites/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: orderedIds }),
    }).catch(() => {});
  };

  const allFavorites = favorites.flatMap(([, items]) => items);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Favorites</span>
          <h1>المفضلة</h1>
          <p>وصول سريع للدعوات والطلبات والعملاء المهمين بدون البحث في كل مرة.</p>
        </div>
      </div>

      <section className="admin-list-overview" aria-label="ملخص المفضلة">
        <div className="admin-list-stat warning">
          <Archive size={19} />
          <span>كل المفضلة</span>
          <strong>{formatArabicNumber(totalCount)}</strong>
        </div>
        {TYPE_ORDER.map((type) => {
          const StatIcon = typeIcons[type];
          return (
            <div className="admin-list-stat" key={type}>
              <StatIcon size={19} />
              <span>{typeLabels[type]}</span>
              <strong>{formatArabicNumber(favoriteCounts[type])}</strong>
            </div>
          );
        })}
      </section>

      <form className="admin-table-toolbar" action="/admin/favorites" method="get">
        <label className="admin-search-field">
          <Archive size={17} />
          <input name="q" placeholder="ابحث داخل المفضلة" defaultValue={query || ""} />
        </label>
        <label className="admin-select-field">
          <Archive size={17} />
          <select name="type" defaultValue={selectedType || "all"} aria-label="فلترة نوع المفضلة">
            <option value="all">كل الأنواع</option>
            <option value="invitation">الدعوات</option>
            <option value="order">الطلبات</option>
            <option value="customer">العملاء</option>
          </select>
        </label>
        <button className="btn btn-soft" type="submit">تطبيق</button>
        {query || selectedType ? <Link className="btn btn-soft" href="/admin/favorites">مسح</Link> : null}
      </form>

      <section className="favorites-layout" aria-label="قائمة المفضلة">
        {favorites.map(([entityType, items], groupIdx) => {
          const Icon = typeIcons[entityType];
          if (!items.length) return null;
          return (
            <div className="favorites-group" key={entityType}>
              <div className="favorites-group-head">
                <div>
                  <Icon size={20} />
                  <h2>{typeLabels[entityType]}</h2>
                </div>
                <strong>{formatArabicNumber(items.length)}</strong>
              </div>
              <div className="favorites-list">
                {items.map(({ favorite, href, subtitle }, itemIdx) => (
                  <article
                    className={`favorite-card ${dragItem?.group === groupIdx && dragItem?.index === itemIdx ? "dragging" : ""}`}
                    key={favorite.id}
                    draggable
                    onDragStart={() => handleDragStart(groupIdx, itemIdx)}
                    onDragOver={(e) => handleDragOver(e, groupIdx, itemIdx)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="favorite-card-drag-handle" title="سحب لإعادة الترتيب">
                      <GripVertical size={14} />
                    </div>
                    <div>
                      <span>{typeLabels[favorite.entityType]}</span>
                      <h3>{favorite.label}</h3>
                      <p>{subtitle}</p>
                      {favorite.note ? (
                        <p className="favorite-card-note">{favorite.note}</p>
                      ) : null}
                      {editingNote === favorite.id ? (
                        <div className="favorite-card-note-edit">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onKeyDown={(e) => handleNoteKeyDown(e, favorite.id)}
                            placeholder="أضف ملاحظة..."
                            autoFocus
                          />
                          <button className="btn btn-soft" type="button" onClick={() => handleNoteSave(favorite.id)} style={{ minHeight: 30, fontSize: "0.78rem", padding: "4px 8px" }}>
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <button className="favorite-card-note-add btn btn-soft" type="button" onClick={() => handleNoteStart(favorite.id, favorite.note)} style={{ minHeight: 28, fontSize: "0.75rem", padding: "2px 8px", marginTop: 4 }}>
                          {favorite.note ? "تعديل الملاحظة" : "+ إضافة ملاحظة"}
                        </button>
                      )}
                      <small>أضيفت: {formatAdminDate(favorite.createdAt)}</small>
                    </div>
                    <div className="favorite-card-actions">
                      <Link className="btn btn-soft" href={href}>
                        <ExternalLink size={16} />
                        فتح
                      </Link>
                      <FavoriteToggleButton
                        entityType={favorite.entityType}
                        entityId={favorite.entityId}
                        label={favorite.label}
                        href={favorite.href}
                        returnTo="/admin/favorites"
                        active
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
        {!allFavorites.length ? (
          <div className="admin-empty-state compact">
            <Archive size={24} />
            <strong>لا توجد عناصر في المفضلة</strong>
            <p>استخدم علامة النجمة داخل الدعوات أو الطلبات أو العملاء لإضافتها هنا.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }).format(date);
}
