"use client";

import { useMemo, useState } from "react";
import { Camera, CheckCircle2, Image, RefreshCw, UsersRound, XCircle } from "lucide-react";

type InvitationRow = {
  code: string;
  groomName: string;
  brideName: string;
  status: string;
  logoUrl: string;
  hasCustomLogo: boolean;
  disabledAt?: Date | string | null;
};

export function PhotographerBulkUpdate({ invitations }: { invitations: InvitationRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size === invitations.length;
  const customCount = invitations.filter((i) => i.hasCustomLogo).length;
  const defaultCount = invitations.filter((i) => !i.hasCustomLogo).length;

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(new Set(checked ? invitations.map((i) => i.code) : []));
  }

  const stats = useMemo(
    () => [
      { icon: UsersRound, label: "إجمالي الدعوات مع المصور", value: invitations.length },
      { icon: CheckCircle2, label: "شعار افتراضي", value: defaultCount },
      { icon: XCircle, label: "شعار مخصص", value: customCount },
    ],
    [invitations.length, defaultCount, customCount],
  );

  return (
    <>
      <div className="admin-metrics-grid" style={{ marginBottom: 16 }}>
        {stats.map((s) => (
          <div className="admin-metric-card" key={s.label}>
            <s.icon size={20} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <form action="/api/admin/photographer-logo" method="post">
        <input type="hidden" name="mode" value="update-selected" />
        <article className="panel" style={{ marginBottom: 16 }}>
          <div className="admin-card-head" style={{ marginBottom: 14 }}>
            <Image size={22} />
            <div>
              <span className="eyebrow">Bulk Update</span>
              <h2>تحديث الدعوات الحالية</h2>
              <p>اختر الدعوات التي تريد تحديثها بالشعار والبيانات الافتراضية الجديدة.</p>
            </div>
          </div>
          <div className="admin-order-list">
            <div className="admin-order-item" style={{ fontWeight: 600, background: "rgba(245,234,214,0.04)", borderBottom: "1px solid rgba(245,234,214,0.1)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flex: "0 0 auto" }}>
                <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
                <small>الكل</small>
              </label>
              <span style={{ flex: 1 }}><strong>اسم العروسين</strong></span>
              <small style={{ flex: "0 0 90px", textAlign: "center" }}>الحالة</small>
              <small style={{ flex: "0 0 70px", textAlign: "center" }}>الشعار</small>
            </div>
            {invitations.map((inv) => (
              <div className="admin-order-item" key={inv.code}>
                <label style={{ display: "flex", alignItems: "center", flex: "0 0 auto", cursor: "pointer" }}>
                  <input type="checkbox" name="codes" value={inv.code} checked={selected.has(inv.code)} onChange={() => toggle(inv.code)} />
                </label>
                <span>
                  <strong>{inv.groomName} و {inv.brideName}</strong>
                  <small>كود: {inv.code}</small>
                </span>
                <em className={`status ${inv.disabledAt ? "danger" : inv.status === "ACTIVE" ? "success" : "neutral"}`} style={{ flex: "0 0 90px", textAlign: "center" }}>
                  {inv.disabledAt ? "معطلة" : inv.status === "ACTIVE" ? "منشورة" : "مسودة"}
                </em>
                {inv.logoUrl ? (
                  <img src={inv.logoUrl} alt="شعار" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: "rgba(255,255,255,0.08)", flex: "0 0 36px" }} />
                ) : (
                  <Camera size={18} style={{ opacity: 0.3, flex: "0 0 36px" }} />
                )}
                <em className={`status ${inv.hasCustomLogo ? "warning" : "success"}`} style={{ flex: "0 0 70px", textAlign: "center" }}>
                  {inv.hasCustomLogo ? "مخصص" : "افتراضي"}
                </em>
              </div>
            ))}
          </div>
          <div className="button-row" style={{ marginTop: 16 }}>
            <button className="btn btn-gold btn-glow" type="submit" disabled={selected.size === 0}>
              <RefreshCw size={18} />
              تحديث المحدد ({selected.size})
            </button>
          </div>
        </article>
      </form>
    </>
  );
}
