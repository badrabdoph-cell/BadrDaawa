export type OperationStatus = "pending" | "in_progress" | "completed" | "failed";

export type OperationProgress = {
  id: string;
  type: string;
  label: string;
  status: OperationStatus;
  progress: number;
  step: string;
  startedAt: string;
  error?: string;
  errorDetails?: string;
  errorCode?: string;
  result?: Record<string, unknown>;
};

const store = new Map<string, OperationProgress>();

const DEFAULT_STEPS: Record<string, string[]> = {
  database: ["بدء إنشاء نسخة قاعدة البيانات", "قراءة بيانات الجداول", "ضغط البيانات", "رفع إلى GitHub", "تم الانشاء"],
  uploads: ["بدء إنشاء نسخة الملفات", "قراءة الملفات المرفوعة", "تجهيز الملفات", "رفع إلى GitHub", "تم الانشاء"],
  full: ["بدء إنشاء النسخة الكاملة", "قراءة بيانات قاعدة البيانات", "قراءة الملفات المرفوعة", "ضغط ورفع البيانات", "رفع إلى GitHub", "تم الانشاء"],
  "restore-database": ["بدء استعادة قاعدة البيانات", "تحميل النسخة من GitHub", "فك الضغط", "حذف البيانات الحالية", "إدراج البيانات الجديدة", "تمت الاستعادة"],
  "restore-uploads": ["بدء استعادة الملفات", "تحميل النسخة من GitHub", "قراءة قائمة الملفات", "استعادة الملفات", "تمت الاستعادة"],
  "restore-full": ["بدء الاستعادة الكاملة", "تحميل النسخة من GitHub", "استعادة قاعدة البيانات", "استعادة الملفات المرفوعة", "تمت الاستعادة"],
  "auto-restore": ["بدء Auto Restore", "فحص حالة قاعدة البيانات", "فحص حالة الملفات", "تنفيذ الاستعادة", "تم التحقق"],
};

const STEP_LABELS: Record<string, string> = {
  database: "إنشاء نسخة قاعدة بيانات",
  uploads: "إنشاء نسخة ملفات",
  full: "إنشاء نسخة كاملة",
  "restore-database": "استعادة قاعدة البيانات",
  "restore-uploads": "استعادة الملفات",
  "restore-full": "استعادة كاملة",
  "auto-restore": "Auto Restore",
};

export function createOperation(type: string): { id: string } {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  store.set(id, {
    id,
    type,
    label: STEP_LABELS[type] || type,
    status: "pending",
    progress: 0,
    step: "في انتظار البدء...",
    startedAt: now,
  });
  return { id };
}

export function getOperation(id: string): OperationProgress | null {
  const op = store.get(id);
  if (!op || isExpired(op)) {
    store.delete(id);
    return null;
  }
  return op;
}

export function updateOperation(id: string, update: Partial<OperationProgress>) {
  const op = store.get(id);
  if (!op || isExpired(op)) return;
  Object.assign(op, update);
  store.set(id, op);
}

export function completeOperation(id: string, result?: Record<string, unknown>) {
  const op = store.get(id);
  if (!op) return;
  op.status = "completed";
  op.progress = 100;
  op.step = "اكتملت العملية";
  if (result) op.result = result;
  store.set(id, op);
}

export function failOperation(id: string, error: string, details?: string) {
  const op = store.get(id);
  if (!op) return;
  op.status = "failed";
  op.progress = op.progress;
  op.step = "فشلت العملية";
  op.error = error;
  op.errorDetails = details;
  op.errorCode = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  store.set(id, op);
}

export function setOperationProgressFromSteps(id: string, stepIndex: number, steps: string[]) {
  const progress = Math.min(Math.round((stepIndex / steps.length) * 100), 99);
  updateOperation(id, {
    progress,
    step: steps[stepIndex] || steps[steps.length - 1],
    status: "in_progress",
  });
}

export function getStepsForType(type: string): string[] {
  return DEFAULT_STEPS[type] || [type, "جارٍ العمل...", "اكتمل"];
}

const EXPIRATION_MS = 10 * 60 * 1000;

function isExpired(op: OperationProgress): boolean {
  const age = Date.now() - new Date(op.startedAt).getTime();
  if (op.status === "completed" || op.status === "failed") {
    return age > EXPIRATION_MS;
  }
  return age > EXPIRATION_MS * 2;
}

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [id, op] of store) {
      if (isExpired(op)) store.delete(id);
    }
  }, 60_000);
}
