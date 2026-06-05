import Link from "next/link";
import { KeyRound, LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionIntro } from "@/components/SectionIntro";

export default function ClientLoginPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section">
        <div className="container form-grid">
          <div>
            <SectionIntro eyebrow="لوحة العميل" title="دخول العروسين" lead="في الإنتاج يتم الدخول باسم مستخدم وكلمة مرور يتم إنشاؤهما من Super Admin." />
            <div className="panel" style={{ marginTop: 28 }}>
              <h3>تجربة سريعة</h3>
              <p>افتح لوحة العميل التجريبية لمتابعة حضور دعوة A7X92K.</p>
              <Link className="btn btn-gold" href="/client/A7X92K">
                فتح لوحة تجريبية
              </Link>
            </div>
          </div>
          <form className="form-panel">
            <div className="field">
              <label htmlFor="username">اسم المستخدم</label>
              <input id="username" placeholder="username" />
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="password">كلمة المرور</label>
              <input id="password" type="password" placeholder="password" />
            </div>
            <button className="btn btn-gold" type="button" style={{ marginTop: 18 }}>
              <LockKeyhole size={18} />
              دخول
            </button>
            <p className="status" style={{ marginTop: 16 }}>
              <KeyRound size={16} />
              بيانات الدخول يتم إنشاؤها تلقائيًا لكل عميل.
            </p>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
