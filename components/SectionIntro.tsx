import type { ReactNode } from "react";

export function SectionIntro({ eyebrow, title, lead }: { eyebrow: ReactNode; title: ReactNode; lead: ReactNode }) {
  return (
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      <p className="section-lead">{lead}</p>
    </div>
  );
}
