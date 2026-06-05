"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  title?: string;
  iconOnly?: boolean;
};

export function CopyButton({ value, label = "نسخ", copiedLabel = "تم النسخ", className = "btn btn-soft", title, iconOnly = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className={className} type="button" title={title || label} aria-label={title || label} onClick={copyValue}>
      {copied ? <Check size={17} /> : <Copy size={17} />}
      {iconOnly ? null : copied ? copiedLabel : label}
    </button>
  );
}
