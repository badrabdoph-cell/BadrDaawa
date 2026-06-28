import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="dashboard-head" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div>
        <span className="eyebrow">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p style={{ margin: "12px 0 24px", opacity: 0.6, fontSize: "1rem" }}>
          المسار الذي طلبته غير موجود في لوحة التحكم.
        </p>
        <Link className="btn btn-gold" href="/admin">
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
