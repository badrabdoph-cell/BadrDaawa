"use client";

import { ArrowDown, ArrowUp, LayoutList, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type SectionDef = {
  id: string;
  label: string;
};

export function BroadcastSectionOrder({
  sections,
  initialOrder,
  onReorder,
}: {
  sections: SectionDef[];
  initialOrder: string[];
  onReorder?: (newOrder: string[]) => void;
}) {
  const [order, setOrder] = useState<string[]>(() => {
    const existing = initialOrder.filter((id) => sections.some((s) => s.id === id));
    const missing = sections.filter((s) => !existing.includes(s.id)).map((s) => s.id);
    return [...existing, ...missing];
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const existing = initialOrder.filter((id) => sections.some((s) => s.id === id));
    const missing = sections.filter((s) => !existing.includes(s.id)).map((s) => s.id);
    setOrder([...existing, ...missing]);
  }, [initialOrder, sections]);

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setOrder((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const sectionMap = new Map(sections.map((s) => [s.id, s.label]));

  const saveOrder = useCallback(async () => {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/admin/settings/section-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ order }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "تعذر الحفظ");
      setStatus("تم حفظ ترتيب الأقسام");
      onReorder?.(order);
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }, [order, onReorder]);

  return (
    <div className="broadcast-section-order">
      <div className="broadcast-section-order-head">
        <LayoutList size={16} />
        <span>ترتيب أقسام الصفحة الرئيسية</span>
      </div>
      <div className="broadcast-section-order-list">
        {order.map((id, index) => (
          <div className="broadcast-section-order-item" key={id}>
            <span className="broadcast-section-order-label">{sectionMap.get(id) || id}</span>
            <span className="broadcast-section-order-index">{index + 1}</span>
            <span className="broadcast-section-order-actions">
              <button type="button" onClick={() => moveUp(index)} disabled={index === 0} title="رفع للأعلى">
                <ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => moveDown(index)} disabled={index >= order.length - 1} title="إنزال للأسفل">
                <ArrowDown size={14} />
              </button>
            </span>
          </div>
        ))}
      </div>
      {status ? <div className="broadcast-section-order-status">{status}</div> : null}
      <button className="btn btn-gold btn-glow" type="button" onClick={saveOrder} disabled={saving} style={{ width: "100%", marginTop: 8 }}>
        <RefreshCw size={16} />
        {saving ? "جار الحفظ..." : "حفظ ترتيب الأقسام"}
      </button>
    </div>
  );
}
