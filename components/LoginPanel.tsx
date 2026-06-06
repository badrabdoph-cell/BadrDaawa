import { LockKeyhole } from "lucide-react";

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
      <form className="login-card" action={action} method="post">
        <span className="brand-mark">
          <LockKeyhole size={20} />
        </span>
        <div>
          <span className="eyebrow">Secure Access</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} name={name} type="hidden" value={value} />
        ))}
        {setupWarning ? <p className="login-warning">{setupWarning}</p> : null}
        {error ? <p className="login-error">بيانات الدخول غير صحيحة</p> : null}
        <label className="field">
          <span>{usernamePlaceholder}</span>
          <input name="username" autoComplete="username" required />
        </label>
        <label className="field">
          <span>كلمة المرور</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="btn btn-gold btn-glow" type="submit">
          دخول
        </button>
      </form>
    </main>
  );
}
