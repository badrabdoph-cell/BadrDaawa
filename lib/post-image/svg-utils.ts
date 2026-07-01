export function xml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dataUrl(value: string) {
  return value.replace(/&/g, "&amp;");
}

export function coupleFontSize(coupleLine: string, scale: number) {
  const length = coupleLine.replace(/\s+/g, "").length;
  if (length > 34) return 56 * scale;
  if (length > 26) return 64 * scale;
  if (length > 18) return 72 * scale;
  return 82 * scale;
}
