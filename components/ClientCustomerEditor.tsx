"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Save, X, User, Phone, Mail, ToggleLeft, ToggleRight } from "lucide-react";
import { PhoneInput } from "./PhoneInput";

type Props = {
  customerId: string;
  currentName: string;
  currentPhone: string;
  currentEmail: string;
  currentIsActive: boolean;
  returnTo: string;
};

export function ClientCustomerEditor({ customerId, currentName, currentPhone, currentEmail, currentIsActive, returnTo }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [phone, setPhone] = useState(currentPhone);
  const [email, setEmail] = useState(currentEmail);
  const [isActive, setIsActive] = useState(currentIsActive);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleStartEdit() {
    setName(currentName);
    setPhone(currentPhone);
    setEmail(currentEmail);
    setIsActive(currentIsActive);
    setEditing(true);
    setMessage(null);
  }

  function handleCancel() {
    setEditing(false);
    setMessage(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      setMessage({ type: "error", text: "اسم العميل مطلوب." });
      return;
    }
    if (!phone.trim()) {
      setMessage({ type: "error", text: "رقم الهاتف مطلوب." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          isActive,
        }),
      });
      const data = await res.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "تعذر حفظ التعديلات.");
      }
      setMessage({ type: "success", text: "تم حفظ بيانات العميل بنجاح." });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "حدث خطأ." });
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="customer-editor-trigger">
        <button className="btn btn-soft" type="button" onClick={handleStartEdit}>
          <Edit size={16} />
          تعديل بيانات العميل
        </button>
      </div>
    );
  }

  return (
    <div className="customer-editor-panel">
      <div className="customer-editor-fields">
        <label className="customer-editor-field">
          <User size={16} />
          <span>الاسم</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العميل" />
        </label>
        <label className="customer-editor-field">
          <Phone size={16} />
          <span>الهاتف</span>
          <PhoneInput value={phone} onChange={(value) => setPhone(value)} />
        </label>
        <label className="customer-editor-field">
          <Mail size={16} />
          <span>البريد</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني (اختياري)" dir="ltr" />
        </label>
        <label className="customer-editor-field customer-editor-toggle">
          <span>{isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</span>
          <span>حالة العميل</span>
          <button type="button" className={`btn btn-sm ${isActive ? "btn-success" : "btn-soft"}`} onClick={() => setIsActive(!isActive)}>
            {isActive ? "نشط" : "متوقف"}
          </button>
        </label>
      </div>
      {message ? (
        <p className={`customer-editor-message ${message.type === "success" ? "text-success" : "text-danger"}`}>{message.text}</p>
      ) : null}
      <div className="customer-editor-actions">
        <button className="btn btn-gold" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "..." : <><Save size={16} /> حفظ</>}
        </button>
        <button className="btn btn-soft" type="button" onClick={handleCancel}>
          <X size={16} /> إلغاء
        </button>
      </div>
    </div>
  );
}
