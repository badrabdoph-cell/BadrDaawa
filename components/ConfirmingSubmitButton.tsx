"use client";

import type { ReactNode } from "react";

type ConfirmingSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  confirmTitle?: string;
  confirmMessage: string;
  countSelector?: string;
  selectCountSelector?: string;
  fallbackCount?: number;
};

export function ConfirmingSubmitButton({
  children,
  className,
  disabled,
  name,
  value,
  confirmTitle = "تأكيد العملية",
  confirmMessage,
  countSelector,
  selectCountSelector,
  fallbackCount = 0,
}: ConfirmingSubmitButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      name={name}
      value={value}
      type="submit"
      onClick={(event) => {
        const form = event.currentTarget.form;
        const selectedCount = countSelector ? document.querySelectorAll<HTMLInputElement>(countSelector).length : 0;
        const optionCount = selectCountSelector
          ? Number(document.querySelector<HTMLSelectElement>(selectCountSelector)?.selectedOptions[0]?.dataset.count || 0)
          : 0;
        const count = selectedCount || optionCount || fallbackCount;
        if (!count) {
          event.preventDefault();
          window.alert("لا توجد عناصر لتنفيذ هذا الإجراء.");
          return;
        }
        const ok = window.confirm(`${confirmTitle}\n\n${confirmMessage}\n\nعدد العناصر: ${count}`);
        if (!ok) event.preventDefault();
        if (form && name && value) {
          const actionInput = form.querySelector<HTMLInputElement>('input[name="action"]');
          if (actionInput) actionInput.value = value;
        }
      }}
    >
      {children}
    </button>
  );
}
