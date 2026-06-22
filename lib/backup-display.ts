export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(value: number | null | undefined) {
  if (value == null) return "—";
  if (value < 1000) return `${value}ms`;
  if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
  const min = Math.floor(value / 60000);
  const sec = ((value % 60000) / 1000).toFixed(0);
  return `${min}m ${sec}s`;
}

export function formatDate(
  value: string | Date | null | undefined,
  opts: { dateStyle?: "full" | "long" | "medium" | "short"; timeStyle?: "full" | "long" | "medium" | "short" } = {},
) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
      dateStyle: opts.dateStyle || "medium",
      timeStyle: opts.timeStyle || "short",
      timeZone: "Africa/Cairo",
    }).format(date);
  } catch {
    return date.toLocaleString("ar-EG");
  }
}

export function formatCompressionRatio(originalBytes: number, compressedBytes: number): string {
  if (!originalBytes || !compressedBytes) return "—";
  const ratio = ((1 - compressedBytes / originalBytes) * 100).toFixed(0);
  return `${ratio}%`;
}

export function truncateSha(sha: string | null | undefined, len = 8): string {
  if (!sha) return "—";
  return sha.slice(0, len);
}

export function formatBackupType(type: string): string {
  const map: Record<string, string> = {
    database: "قاعدة البيانات",
    uploads: "الملفات",
    full: "كاملة",
    scheduled: "تلقائي",
    manual: "يدوي",
    verify: "تحقق",
    "storage-cleanup": "تنظيف",
  };
  return map[type] || type;
}

export function formatBackupStatus(status: string): { label: string; color: string } {
  if (status === "SUCCESS" || status === "ok" || status === "success") return { label: "ناجحة", color: "#4caf87" };
  if (status === "FAILED" || status === "failed" || status === "error") return { label: "فاشلة", color: "#d9534f" };
  return { label: status, color: "rgba(245, 234, 214, 0.5)" };
}

export type BackupDisplayRow = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  durationMs: number | null;
  sizeBytes: number;
  compressedSizeBytes?: number;
  items: number;
  uploadsCount: number;
  uploadsSizeBytes: number;
  commitSha: string | null;
  repoPath: string | null;
  fileName: string;
  error: string | null;
  recordCounts?: Record<string, number>;
  files?: Array<{ name: string; size: number }>;
};
