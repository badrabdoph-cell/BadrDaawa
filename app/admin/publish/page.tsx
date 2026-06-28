import type { Metadata } from "next";
import { getLatestContentVersion } from "@/lib/publish-pipeline";
import { History, ShieldCheck } from "lucide-react";
import { VersionHistorySection } from "./VersionHistorySection";

export const metadata: Metadata = { title: "النشر والإصدارات - لوحة الإدارة" };

export const dynamic = "force-dynamic";

export default async function AdminChangesPage() {
  const latestVersion = await getLatestContentVersion();

  return (
    <div>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Changes</span>
          <h1>التغيرات والإصدارات</h1>
          <p>سجل جميع التعديلات على المحتوى مع إمكانية استعادة أي إصدار سابق</p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14, padding: "10px 16px", border: "1px solid rgba(245,234,214,0.06)", borderRadius: 10, background: "rgba(255,255,255,0.015)", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <History size={15} style={{ opacity: 0.4 }} />
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>الحالة:</span>
          <strong style={{ fontSize: "0.84rem", color: "#4caf87" }}>
            النشر المباشر مفعّل
          </strong>
          <span style={{ fontSize: "0.76rem", opacity: 0.45, marginInlineStart: 4 }}>
            كل تعديل ينشر فوراً
          </span>
        </div>
        <div style={{ width: 1, height: 22, background: "rgba(245,234,214,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={15} style={{ opacity: 0.4 }} />
          <span style={{ opacity: 0.6, fontWeight: 800, fontSize: "0.8rem" }}>آخر إصدار:</span>
          <strong style={{ fontSize: "0.84rem" }}>
            {latestVersion ? `#${latestVersion.version}` : "—"}
          </strong>
          {latestVersion && (
            <span style={{ fontSize: "0.74rem", opacity: 0.45 }}>بواسطة {latestVersion.publishedBy}</span>
          )}
        </div>
      </div>

      <VersionHistorySection />
    </div>
  );
}