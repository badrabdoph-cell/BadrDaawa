"use client";

import { LockKeyhole, KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("يرجى إدخال اسم المستخدم وكلمة المرور.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || "بيانات الدخول غير صحيحة.");
        return;
      }
      if (data?.redirect) {
        router.push(data.redirect);
      } else {
        router.push("/");
      }
    } catch {
      setError("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={handleLogin}>
      <div className="field">
        <label htmlFor="username">اسم المستخدم</label>
        <input id="username" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="field" style={{ marginTop: 14 }}>
        <label htmlFor="password">كلمة المرور</label>
        <input id="password" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error ? <p className="status danger" style={{ marginTop: 12 }}>{error}</p> : null}
      <button className="btn btn-gold" type="submit" disabled={busy} style={{ marginTop: 18 }}>
        {busy ? <Loader2 size={18} /> : <LockKeyhole size={18} />}
        دخول
      </button>
      <p className="status" style={{ marginTop: 16 }}>
        <KeyRound size={16} />
        يتم تسليم بيانات الدخول مع رابط الدعوة.
      </p>
    </form>
  );
}
