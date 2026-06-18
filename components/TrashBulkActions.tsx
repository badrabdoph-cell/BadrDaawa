"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ArchiveRestore, RotateCcw, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { TrashItem, TrashEntityType } from "@/lib/trash";

type Props = {
  items: TrashItem[];
  csrfToken: string;
  filterType: string;
};

export function TrashBulkActions({ items, csrfToken, filterType }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const allIds = items.map((item) => `${item.storage}-${item.type}-${item.id}`);
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const handleBulkAction = async (action: "bulk-restore" | "bulk-hard-delete") => {
    if (selectedIds.size === 0) return;
    setBusy(true);

    const formData = new FormData();
    formData.append("action", action);
    formData.append("type", filterType === "all" ? "invitation" : filterType);
    formData.append("csrf_token", csrfToken);

    for (const compositeId of selectedIds) {
      const parts = compositeId.split("-");
      const id = parts.slice(2).join("-");
      formData.append("ids[]", id);
    }

    try {
      const res = await fetch("/api/admin/trash/bulk", { method: "POST", body: formData });
      if (res.redirected) {
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch {
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      {selectedIds.size > 0 ? (
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            padding: "10px 14px",
            border: "1px solid rgba(243,207,115,0.2)",
            borderRadius: "10px",
            background: "rgba(243,207,115,0.06)",
            marginTop: "10px",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "0.9rem", opacity: 0.8 }}>
            {selectedIds.size} عنصر محدد
          </span>
          <button
            className="btn btn-soft"
            type="button"
            onClick={() => handleBulkAction("bulk-restore")}
            disabled={busy}
            style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem" }}
          >
            <RotateCcw size={15} />
            استعادة المحدد
          </button>
          <button
            className="btn btn-soft danger-button"
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem", borderColor: "rgba(239,68,68,0.3)", color: "#ffb6ae" }}
          >
            <Trash2 size={15} />
            حذف نهائي
          </button>
          <button
            className="btn btn-soft"
            type="button"
            onClick={() => setSelectedIds(new Set())}
            style={{ minHeight: "36px", padding: "6px 14px", fontSize: "0.85rem", marginInlineStart: "auto" }}
          >
            إلغاء التحديد
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={confirmDelete}
        title="تأكيد الحذف النهائي"
        message={`هل أنت متأكد من حذف ${selectedIds.size} عنصر/عناصر نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="حذف نهائي"
        cancelText="إلغاء"
        isDangerous
        isLoading={busy}
        onConfirm={() => handleBulkAction("bulk-hard-delete")}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={{ accentColor: "#a8792b", width: "17px", height: "17px", cursor: "pointer" }}
                  aria-label="تحديد الكل"
                />
              </th>
              <th>النوع</th>
              <th>العنصر</th>
              <th>تفاصيل</th>
              <th>تاريخ الحذف</th>
              <th>المصدر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const compositeId = `${item.storage}-${item.type}-${item.id}`;
              return (
                <tr key={compositeId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(compositeId)}
                      onChange={() => toggleSelect(compositeId)}
                      style={{ accentColor: "#a8792b", width: "17px", height: "17px", cursor: "pointer" }}
                      aria-label={`تحديد ${item.title}`}
                    />
                  </td>
                  <td><span className="status danger">{typeLabels[item.type]}</span></td>
                  <td>
                    <strong>{item.title}</strong>
                    <small className="admin-muted-line">{item.subtitle}</small>
                  </td>
                  <td>
                    <span>{item.meta || "غير محدد"}</span>
                    {typeof item.relatedCount === "number" ? <small className="admin-muted-line">{item.relatedCount} سجل مرتبط</small> : null}
                  </td>
                  <td>{formatDateTime(item.deletedAt)}</td>
                  <td>{item.storage === "database" ? "قاعدة البيانات" : "ملفات runtime"}</td>
                  <td>
                    <div className="button-row" style={{ gap: "6px" }}>
                      <form action="/api/admin/trash" method="post">
                        <input type="hidden" name="csrf_token" value={csrfToken} />
                        <input type="hidden" name="action" value="restore" />
                        <input type="hidden" name="type" value={item.type} />
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="storage" value={item.storage} />
                        <button className="btn btn-soft" type="submit" style={{ minHeight: "34px", padding: "6px 10px", fontSize: "0.82rem" }}>
                          <RotateCcw size={14} />
                          استعادة
                        </button>
                      </form>
                      <form action="/api/admin/trash" method="post">
                        <input type="hidden" name="csrf_token" value={csrfToken} />
                        <input type="hidden" name="action" value="hard-delete" />
                        <input type="hidden" name="type" value={item.type} />
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="storage" value={item.storage} />
                        <button className="btn btn-soft danger-button" type="submit" style={{ minHeight: "34px", padding: "6px 10px", fontSize: "0.82rem", borderColor: "rgba(239,68,68,0.2)", color: "#ffb6ae" }}>
                          <Trash2 size={14} />
                          حذف نهائي
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state compact">
                    <strong>سلة المهملات فارغة</strong>
                    <p>العناصر التي يتم حذفها من الدعوات أو الطلبات أو العملاء ستظهر هنا للاستعادة أو الحذف النهائي.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

const typeLabels: Record<TrashEntityType, string> = {
  invitation: "دعوة",
  order: "طلب",
  customer: "عميل",
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "غير محدد";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}
