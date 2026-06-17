# Emergency Backup System Implementation Plan

**Goal:** Build an "Emergency" (طوارئ) subsection under Admin Backups where the admin can mark specific backups as "safe" (سليمة) and perform a full site restore with one click.

**Architecture:** Add a `SafeBackup` Prisma model + REST API for marking/unmarking safe backups. New `/admin/backups/emergency` page shows all safe backups with prominent "استعادة" (Restore) buttons. Integrate "Mark Safe" into the main backups page table rows.

**Tech Stack:** Next.js App Router, Prisma (PostgreSQL), existing `restoreFromBackup` lib function, existing `POST /api/admin/backups/[fileName]/restore` endpoint.

## Global Constraints
- Arabic-first UI (labels, messages, directions)
- Reuse existing `RestoreBackupButton.tsx` component for the restore flow (not reinventing)
- Admin authentication required for all new API routes
- Follow existing code patterns (lucide icons, CSS classes, component structure)

---

### Task 1: Prisma Model + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260617200001_add_safe_backup/migration.sql`

- [ ] **Step 1: Add `SafeBackup` model to schema.prisma**

Add after `BackupJob` model (before `SyncLog`):

```prisma
model SafeBackup {
  id             String   @id @default(cuid())
  backupFileName String   @unique
  label          String?
  notes          String?
  markedAt       DateTime @default(now())
  markedBy       String?

  @@index([markedAt])
}
```

- [ ] **Step 2: Generate migration**

Run: `npx prisma migrate dev --name add_safe_backup --create-only`

- [ ] **Step 3: Edit migration SQL if needed, then apply**

Check the auto-generated SQL and apply: `npx prisma migrate deploy`

---

### Task 2: Lib Functions

**Files:**
- Modify: `lib/backups.ts`

- [ ] **Step 1: Add types and functions at end of `lib/backups.ts`**

```typescript
export type SafeBackupEntry = {
  id: string;
  backupFileName: string;
  label: string | null;
  notes: string | null;
  markedAt: string;
  markedBy: string | null;
};

export async function markBackupAsSafe(
  backupFileName: string,
  options?: { label?: string; notes?: string; markedBy?: string }
): Promise<SafeBackupEntry> {
  const record = await prisma.safeBackup.create({
    data: {
      backupFileName,
      label: options?.label ?? null,
      notes: options?.notes ?? null,
      markedBy: options?.markedBy ?? null,
    },
  });
  return {
    id: record.id,
    backupFileName: record.backupFileName,
    label: record.label,
    notes: record.notes,
    markedAt: record.markedAt.toISOString(),
    markedBy: record.markedBy,
  };
}

export async function unmarkBackupAsSafe(backupFileName: string): Promise<void> {
  await prisma.safeBackup.deleteMany({
    where: { backupFileName },
  });
}

export async function getSafeBackups(): Promise<SafeBackupEntry[]> {
  const records = await prisma.safeBackup.findMany({
    orderBy: { markedAt: "desc" },
  });
  return records.map((r) => ({
    id: r.id,
    backupFileName: r.backupFileName,
    label: r.label,
    notes: r.notes,
    markedAt: r.markedAt.toISOString(),
    markedBy: r.markedBy,
  }));
}

export async function isBackupSafe(backupFileName: string): Promise<boolean> {
  const count = await prisma.safeBackup.count({
    where: { backupFileName },
  });
  return count > 0;
}
```

---

### Task 3: API Routes

**Files:**
- Create: `app/api/admin/backups/[fileName]/safe/route.ts`
- Modify: `app/api/admin/backups/route.ts` (add GET /api/admin/backups/safe handling)

- [ ] **Step 1: Create POST + DELETE route for `/api/admin/backups/[fileName]/safe`**

```typescript
// app/api/admin/backups/[fileName]/safe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { markBackupAsSafe, unmarkBackupAsSafe } from "@/lib/backups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ fileName: string }> };

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileName } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { label?: string; notes?: string };
  const entry = await markBackupAsSafe(fileName, {
    label: body.label,
    notes: body.notes,
    markedBy: "admin",
  });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { fileName } = await context.params;
  await unmarkBackupAsSafe(fileName);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Add GET `/api/admin/backups/safe` route**

This can be handled by adding to the main backups route or creating a separate handler. Add to `app/api/admin/backups/route.ts`:

Add a new GET handler that checks for `?safe=true`:

```typescript
// Inside app/api/admin/backups/route.ts, add to existing GET:
import { getSafeBackups } from "@/lib/backups";

// Add before the main list handler:
export async function GET(request: NextRequest) {
  // ... existing auth check ...
  
  const url = new URL(request.url);
  if (url.searchParams.get("safe") === "true") {
    const safeBackups = await getSafeBackups();
    return NextResponse.json({ ok: true, safeBackups });
  }
  
  // ... rest of existing GET handler ...
}
```

---

### Task 4: Emergency Page

**Files:**
- Create: `app/admin/backups/emergency/page.tsx`

- [ ] **Step 1: Create the emergency page**

A server component that:
1. Fetches all backups via `listBackupSnapshots()`
2. Fetches safe backups via `getSafeBackups()`
3. Shows a header with warning icon
4. Shows a table of safe-marked backups with their labels
5. Each row has a "Mark As Unsafe" button and a "Restore" button
6. Shows a "Mark as Safe" form section where admin can select a backup from a dropdown and add a label
7. Big visual distinction between safe backups section and other backups

```tsx
// app/admin/backups/emergency/page.tsx
import { TriangleAlert, ShieldCheck, ShieldX, History, Plus } from "lucide-react";
import { getSafeBackups, listBackupSnapshots } from "@/lib/backups";
import { VerifyBackupButton } from "../VerifyBackupButton";
import { RestoreBackupButton } from "../RestoreBackupButton";
import { MarkSafePanel } from "./MarkSafePanel";
import { SafeBackupRow } from "./SafeBackupRow";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

export default async function EmergencyPage() {
  const [backups, safeBackups] = await Promise.all([
    listBackupSnapshots(),
    getSafeBackups(),
  ]);

  const safeFileNames = new Set(safeBackups.map((s) => s.backupFileName));
  const safeBackupSet = backups.filter((b) => safeFileNames.has(b.fileName));

  return (
    <>
      <div className="dashboard-head emergency-head">
        <div>
          <span className="eyebrow">Emergency Recovery</span>
          <h1>نظام الطوارئ</h1>
          <p>استعادة الموقع بالكامل من نسخة احتياطية موثوقة في حالات الطوارئ</p>
        </div>
        <span className="admin-health-pill danger">
          <TriangleAlert size={16} />
          وضع الطوارئ
        </span>
      </div>

      <div className="panel emergency-warning">
        <TriangleAlert size={22} />
        <div>
          <strong>تحذير: هذا القسم مخصص لحالات الطوارئ فقط</strong>
          <p>استخدام الاستعادة سيحذف جميع البيانات الحالية (العملاء، الدعوات، تأكيدات الحضور، الطلبات، الإحصائيات، إلخ) ويستبدلها بالكامل ببيانات النسخة المختارة. هذا الإجراء لا يمكن التراجع عنه!</p>
        </div>
      </div>

      <MarkSafePanel backups={backups} safeFileNames={safeFileNames} />

      <div className="panel">
        <div className="admin-card-head">
          <ShieldCheck size={22} />
          <div>
            <span className="eyebrow">Verified Safe Backups</span>
            <h2>النسخ الموثوقة</h2>
            <p>هذه النسخ تم تحديدها كنسخ سليمة يمكن استعادتها في حالات الطوارئ</p>
          </div>
        </div>

        {safeBackupSet.length === 0 ? (
          <div className="admin-empty-state">
            <ShieldX size={32} />
            <strong>لا توجد نسخ موثوقة حتى الآن</strong>
            <p>استخدم الزر أعلاه لإضافة نسخة احتياطية موثوقة.</p>
          </div>
        ) : (
          <div className="backup-table-wrapper">
            <table className="backup-table emergency-table">
              <thead>
                <tr>
                  <th>الاسم / التصنيف</th>
                  <th>الملف</th>
                  <th>تاريخ التحديد</th>
                  <th>الحجم</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {safeBackupSet.map((backup) => {
                  const safe = safeBackups.find((s) => s.backupFileName === backup.fileName)!;
                  return (
                    <SafeBackupRow
                      key={backup.fileName}
                      backup={backup}
                      safeEntry={safe}
                      formatDate={formatDate}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `SafeBackupRow` client component**

Create `app/admin/backups/emergency/SafeBackupRow.tsx`:

```tsx
"use client";

import { ShieldX, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RestoreBackupButton } from "../RestoreBackupButton";

type BackupData = {
  fileName: string;
  status: string;
  sizeBytes: number;
  createdAt: string;
};

type SafeEntry = {
  id: string;
  backupFileName: string;
  label: string | null;
  notes: string | null;
  markedAt: string;
  markedBy: string | null;
};

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function SafeBackupRow({
  backup,
  safeEntry,
  formatDate,
}: {
  backup: BackupData;
  safeEntry: SafeEntry;
  formatDate: (iso: string) => string;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);

  async function handleUnmark() {
    setRemoving(true);
    try {
      await fetch(`/api/admin/backups/${encodeURIComponent(backup.fileName)}/safe`, {
        method: "DELETE",
      });
      router.refresh();
    } catch {
      setRemoving(false);
    }
  }

  return (
    <tr>
      <td>
        <span className="safe-backup-label">{safeEntry.label || "بدون تصنيف"}</span>
      </td>
      <td>
        <span className="backup-file-name">{backup.fileName}</span>
      </td>
      <td>{formatDate(safeEntry.markedAt)}</td>
      <td style={{ direction: "ltr", textAlign: "right" }}>{formatBytes(backup.sizeBytes)}</td>
      <td>
        <div className="button-row">
          <RestoreBackupButton fileName={backup.fileName} />
          <button
            className="btn btn-soft btn-icon"
            type="button"
            onClick={handleUnmark}
            disabled={removing}
            title="إزالة من الموثوقة"
          >
            <ShieldX size={17} />
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: Create `MarkSafePanel` client component**

Create `app/admin/backups/emergency/MarkSafePanel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";

type BackupData = {
  fileName: string;
  status: string;
  createdAt: string;
};

type Props = {
  backups: BackupData[];
  safeFileNames: Set<string>;
};

export function MarkSafePanel({ backups, safeFileNames }: Props) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const eligibleBackups = backups.filter(
    (b) => b.status === "SUCCESS" && !safeFileNames.has(b.fileName)
  );

  async function handleMark() {
    if (!selectedFile || !label.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/backups/${encodeURIComponent(selectedFile)}/safe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      setMessage({ type: "success", text: "تمت إضافة النسخة إلى الموثوقة بنجاح" });
      setSelectedFile("");
      setLabel("");
      setTimeout(() => router.refresh(), 1000);
    } catch {
      setMessage({ type: "error", text: "فشلت إضافة النسخة" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel emergency-mark-panel">
      <div className="admin-card-head">
        <ShieldCheck size={22} />
        <div>
          <span className="eyebrow">Mark Backup as Safe</span>
          <h2>إضافة نسخة موثوقة</h2>
          <p>حدد نسخة احتياطية سليمة وأضف تصنيفًا واضحًا (مثلاً: &quot;قبل تعديلات الدعوات&quot;)</p>
        </div>
      </div>

      <div className="emergency-mark-form">
        <div className="emergency-mark-field">
          <label>اختر النسخة</label>
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            disabled={saving}
          >
            <option value="">-- اختر نسخة --</option>
            {eligibleBackups.map((b) => (
              <option key={b.fileName} value={b.fileName}>
                {b.fileName}
              </option>
            ))}
          </select>
        </div>
        <div className="emergency-mark-field">
          <label>تصنيف (مثال: &quot;نسخة نظيفة قبل التعديلات&quot;)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="مثال: نسخة نظيفة قبل تعديلات يونيو"
            disabled={saving}
          />
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={handleMark}
          disabled={!selectedFile || !label.trim() || saving}
        >
          {saving ? "جاري الحفظ..." : <><Plus size={18} /> إضافة إلى الموثوقة</>}
        </button>
      </div>

      {message ? (
        <div className={`emergency-mark-message ${message.type}`}>
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
```

---

### Task 5: Navigation

**Files:**
- Modify: `components/DashboardShell.tsx`

- [ ] **Step 1: Add "طوارئ" link under the backups section**

Change the `sync` section links:

```typescript
links: [
  { href: "/admin/sync", label: "مركز النسخ والمزامنة", icon: DatabaseBackup },
  { href: "/admin/backups", label: "النسخ الاحتياطي", icon: DatabaseBackup },
  { href: "/admin/backups/emergency", label: "طوارئ", icon: TriangleAlert },
  { href: "/admin/sync-history", label: "سجل GitHub", icon: History },
  { href: "/admin/sync-settings", label: "GitHub", icon: Github },
  { href: "/admin/tasks", label: "المهام المجدولة", icon: CalendarClock },
],
```

Need to import `TriangleAlert` at the top.

---

### Task 6: Integrate "Mark Safe" into Main Backup Page

**Files:**
- Modify: `app/admin/backups/page.tsx`

- [ ] **Step 1: Add safe backup data fetching**

In the main backups page, fetch safe backups and pass to the table:

```typescript
// In page.tsx, add to imports:
import { getSafeBackups } from "@/lib/backups";
import { MarkSafeButton } from "./MarkSafeButton";

// In the main component, fetch safe data:
const safeBackups = await getSafeBackups();
const safeFileNames = new Set(safeBackups.map((s) => s.backupFileName));

// In the table row, add safety indicator and Mark Safe button
```

- [ ] **Step 2: Create `MarkSafeButton` component**

Create `app/admin/backups/MarkSafeButton.tsx`:

```tsx
"use client";

import { ShieldCheck, ShieldPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkSafeButton({
  fileName,
  isSafe,
  label,
}: {
  fileName: string;
  isSafe: boolean;
  label: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (isSafe) {
        await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}/safe`, {
          method: "DELETE",
        });
      } else {
        const lbl = prompt("تصنيف النسخة (مثال: نسخة نظيفة قبل التعديلات):");
        if (!lbl || !lbl.trim()) {
          setLoading(false);
          return;
        }
        await fetch(`/api/admin/backups/${encodeURIComponent(fileName)}/safe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: lbl.trim() }),
        });
      }
      router.refresh();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={`btn btn-icon ${isSafe ? "btn-soft" : "btn-ghost"}`}
      type="button"
      onClick={handleToggle}
      disabled={loading}
      title={isSafe ? "إزالة من الموثوقة" : "تحديد كنسخة موثوقة"}
    >
      {loading ? (
        <span className="sync-spin">...</span>
      ) : isSafe ? (
        <ShieldCheck size={17} />
      ) : (
        <ShieldPlus size={17} />
      )}
    </button>
  );
}
```

---

### Task 7: CSS Styles

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add emergency page CSS classes**

Add at the end of the backup section (after existing backup CSS):

```css
/* ── Emergency / Safe Backups ── */
.emergency-head .admin-health-pill.danger {
  background: rgba(255, 68, 68, 0.15);
  color: #ff4444;
  border: 1px solid rgba(255, 68, 68, 0.3);
}

.emergency-warning {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: rgba(255, 68, 68, 0.08);
  border: 1px solid rgba(255, 68, 68, 0.25);
  border-radius: 12px;
  padding: 18px 20px;
  margin-bottom: 20px;
}
.emergency-warning svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #ff4444;
}
.emergency-warning strong {
  display: block;
  margin-bottom: 4px;
  color: #ff4444;
}
.emergency-warning p {
  margin: 0;
  color: rgba(245, 234, 214, 0.7);
  line-height: 1.7;
  font-size: 0.85rem;
}

.emergency-mark-panel {
  margin-bottom: 20px;
}
.emergency-mark-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-top: 14px;
}
.emergency-mark-field {
  flex: 1;
  min-width: 220px;
}
.emergency-mark-field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(245, 234, 214, 0.7);
  margin-bottom: 4px;
}
.emergency-mark-field select,
.emergency-mark-field input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(245, 234, 214, 0.15);
  background: rgba(0, 0, 0, 0.3);
  color: rgba(245, 234, 214, 0.9);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}
.emergency-mark-field select:focus,
.emergency-mark-field input:focus {
  border-color: rgba(168, 130, 72, 0.5);
}

.emergency-table th:first-child,
.emergency-table td:first-child {
  padding-left: 16px;
  padding-right: 0;
}

.safe-backup-label {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.12);
  color: #22c55e;
  font-size: 0.8rem;
  font-weight: 600;
}

.emergency-mark-message {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85rem;
}
.emergency-mark-message.success {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}
.emergency-mark-message.error {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
  border: 1px solid rgba(255, 68, 68, 0.2);
}
```

---

### Task 8: Verify Build

- [ ] **Step 1: Build**

Run: `npx next build`
Expected: Success with no errors

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors
