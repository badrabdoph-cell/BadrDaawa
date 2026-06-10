import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";

export function LoginPanel({
  action,
  title,
  description,
  usernamePlaceholder = "اسم المستخدم",
  error,
  setupWarning,
  hiddenFields = {},
}: {
  action: string;
  title: string;
  description: string;
  usernamePlaceholder?: string;
  error?: string;
  setupWarning?: string;
  hiddenFields?: Record<string, string>;
}) {
  return (
    <main className="login-page">
      <section className="login-shell-grid" aria-label="تسجيل الدخول" data-no-scroll-animation>
        <div className="login-side">
          <span className="login-orb">
            <ShieldCheck size={26} />
          </span>
          <div>
            <span className="eyebrow">Secure Access</span>
            <h2>لوحة تحكم محمية</h2>
            <p>دخول محدود لإدارة الدعوات، الطلبات، القوالب، وروابط العملاء.</p>
          </div>
          <div className="login-security-list" aria-label="مزايا الأمان">
            <span>
              <LockKeyhole size={16} />
              جلسة خاصة
            </span>
            <span>
              <Sparkles size={16} />
              تحقق من الصلاحيات
            </span>
          </div>
        </div>

        <form className="login-card" action={action} method="post">
          <span className="brand-mark">
            <LockKeyhole size={20} />
          </span>
          <div>
            <span className="eyebrow">Admin Login</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} name={name} type="hidden" value={value} />
          ))}
          {setupWarning ? <p className="login-warning">{setupWarning}</p> : null}
          {error ? <p className="login-error">بيانات الدخول غير صحيحة أو تم تجاوز عدد المحاولات</p> : null}
          <label className="field">
            <span>{usernamePlaceholder}</span>
            <input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={120} required />
          </label>
          <label className="field">
            <span>كلمة المرور</span>
            <input name="password" type="password" autoComplete="current-password" maxLength={240} required />
          </label>
          <button className="btn btn-gold btn-glow" type="submit">
            دخول
          </button>
        </form>
      </section>
    </main>
  );
}
