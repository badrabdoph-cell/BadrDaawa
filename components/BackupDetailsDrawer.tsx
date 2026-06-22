"use client";

import { X, Archive, Database, CloudUpload, CheckCircle2, XCircle, Github, HardDrive, FileText, UsersRound, Calendar, MessageCircleHeart, BarChart3, Bell, Clock, Download, ExternalLink } from "lucide-react";
import { formatBytes, formatDuration, formatDate, formatCompressionRatio, truncateSha, formatBackupStatus, formatBackupType, type BackupDisplayRow } from "@/lib/backup-display";
import { useEffect, useRef } from "react";

interface BackupDetailsDrawerProps {
  backup: BackupDisplayRow | null;
  onClose: () => void;
}

function GridRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="backup-detail-row">
      <span className="backup-detail-label">{label}</span>
      <span className="backup-detail-value" style={mono ? { fontFamily: "var(--font-jetbrains-mono, ui-monospace, monospace)", fontSize: "0.78rem", direction: "ltr", textAlign: "left", overflowWrap: "anywhere" } : {}}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="backup-detail-section-title">
      <Icon size={16} />
      <span>{title}</span>
    </div>
  );
}

export function BackupDetailsDrawer({ backup, onClose }: BackupDetailsDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (backup) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [backup]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handler = () => onClose();
    dialog.addEventListener("close", handler);
    return () => dialog.removeEventListener("close", handler);
  }, [onClose]);

  if (!backup) return null;

  const status = formatBackupStatus(backup.status);
  const isSuccess = backup.status === "SUCCESS" || backup.status === "ok" || backup.status === "success";
  const BackupTypeIcon = backup.type === "database" ? Database : backup.type === "uploads" ? CloudUpload : Archive;

  const recordFields: Array<{ key: string; label: string; icon: React.ElementType }> = [
    { key: "Invitation", label: "الدعوات", icon: Archive },
    { key: "Customer", label: "العملاء", icon: UsersRound },
    { key: "Order", label: "الطلبات", icon: FileText },
    { key: "Rsvp", label: "RSVPs", icon: Calendar },
    { key: "Message", label: "الرسائل", icon: MessageCircleHeart },
    { key: "AnalyticsEvent", label: "Analytics", icon: BarChart3 },
    { key: "Notification", label: "الإشعارات", icon: Bell },
  ];

  return (
    <dialog ref={dialogRef} className="backup-details-dialog" onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}>
      <div className="backup-details-content">
        <div className="backup-details-header">
          <div className="backup-details-header-info">
            <BackupTypeIcon size={24} />
            <div>
              <span className="eyebrow">Backup Details</span>
              <h3>{formatBackupType(backup.type)}</h3>
            </div>
          </div>
          <button className="backup-details-close" type="button" onClick={onClose} aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>

        <div className="backup-details-status">
          {isSuccess ? <CheckCircle2 size={20} color="#4caf87" /> : <XCircle size={20} color="#d9534f" />}
          <span style={{ color: status.color, fontWeight: 800 }}>{status.label}</span>
        </div>

        <div className="backup-details-body">
          <SectionTitle icon={Clock} title="معلومات أساسية" />
          <div className="backup-detail-grid">
            <GridRow label="النوع" value={formatBackupType(backup.type)} />
            <GridRow label="الحالة" value={<span style={{ color: status.color }}>{status.label}</span>} />
            <GridRow label="تاريخ الإنشاء" value={formatDate(backup.createdAt)} />
            <GridRow label="المدة" value={formatDuration(backup.durationMs)} />
            <GridRow label="اسم الملف" value={backup.fileName} mono />
          </div>

          <SectionTitle icon={HardDrive} title="أحجام النسخة" />
          <div className="backup-detail-grid">
            <GridRow label="الحجم" value={formatBytes(backup.sizeBytes)} />
            {backup.compressedSizeBytes ? (
              <>
                <GridRow label="بعد الضغط" value={formatBytes(backup.compressedSizeBytes)} />
                <GridRow label="نسبة الضغط" value={formatCompressionRatio(backup.sizeBytes, backup.compressedSizeBytes)} />
              </>
            ) : null}
          </div>

          {backup.recordCounts && Object.keys(backup.recordCounts).length > 0 ? (
            <>
              <SectionTitle icon={BarChart3} title="معلومات البيانات" />
              <div className="backup-detail-grid">
                {recordFields.map(({ key, label, icon: Icon }) => {
                  const count = backup.recordCounts![key];
                  if (count === undefined) return null;
                  return (
                    <div key={key} className="backup-detail-row">
                      <span className="backup-detail-label"><Icon size={14} /> {label}</span>
                      <span className="backup-detail-value">{count.toLocaleString("ar-EG")}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          <SectionTitle icon={CloudUpload} title="معلومات الملفات" />
          <div className="backup-detail-grid">
            <GridRow label="عدد الملفات" value={backup.uploadsCount.toLocaleString("ar-EG")} />
            <GridRow label="حجم الملفات" value={formatBytes(backup.uploadsSizeBytes)} />
          </div>

          <SectionTitle icon={Github} title="معلومات GitHub" />
          <div className="backup-detail-grid">
            <GridRow label="Commit SHA" value={truncateSha(backup.commitSha)} mono />
            {backup.repoPath ? (
              <GridRow label="GitHub Path" value={backup.repoPath} mono />
            ) : null}
          </div>

          {backup.error ? (
            <div className="backup-details-error">
              <XCircle size={16} />
              <span>{backup.error}</span>
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
