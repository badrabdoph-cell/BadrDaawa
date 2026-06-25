"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useCallback, useState } from "react";

type SectionDef = {
  id: string;
  label: string;
};

export function SectionOrderEditor({
  sections,
  initialOrder,
  inputName,
}: {
  sections: SectionDef[];
  initialOrder: string[];
  inputName: string;
}) {
  const [order, setOrder] = useState(() => {
    const existing = initialOrder.filter((id) => sections.some((s) => s.id === id));
    const missing = sections.filter((s) => !existing.includes(s.id)).map((s) => s.id);
    return [...existing, ...missing];
  });

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

  return (
    <div className="section-order-editor">
      <input type="hidden" name={inputName} value={JSON.stringify(order)} />
      <div className="section-order-list">
        {order.map((id, index) => (
          <div className="section-order-item" key={id}>
            <span className="section-order-grip">
              <GripVertical size={16} />
            </span>
            <span className="section-order-label">{sectionMap.get(id) || id}</span>
            <span className="section-order-index">{index + 1}</span>
            <span className="section-order-actions">
              <button type="button" className="btn btn-soft btn-icon" onClick={() => moveUp(index)} disabled={index === 0} title="رفع للأعلى">
                <ArrowUp size={15} />
              </button>
              <button type="button" className="btn btn-soft btn-icon" onClick={() => moveDown(index)} disabled={index >= order.length - 1} title="إنزال للأسفل">
                <ArrowDown size={15} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
