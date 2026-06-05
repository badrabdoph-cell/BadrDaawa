import { CloudDownload, DatabaseBackup, RotateCcw } from "lucide-react";

const backups = [
  { file: "hourly-2026-06-05-18.dump.gz", type: "Hourly", status: "SUCCESS", size: "18 MB" },
  { file: "daily-2026-06-05.dump.gz", type: "Daily Full", status: "SUCCESS", size: "122 MB" },
  { file: "hourly-2026-06-05-17.dump.gz", type: "Hourly", status: "SUCCESS", size: "18 MB" },
];

export default function BackupsPage() {
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Backups</span>
          <h1>النسخ الاحتياطي</h1>
        </div>
        <button className="btn btn-gold" type="button">
          <DatabaseBackup size={18} />
          نسخة يدوية
        </button>
      </div>
      <div className="grid-3" style={{ marginBottom: 18 }}>
        <div className="panel">
          <h3>كل ساعة</h3>
          <p>Workflow مجدول يحفظ نسخة مضغوطة إلى GitHub.</p>
        </div>
        <div className="panel">
          <h3>يومي كامل</h3>
          <p>نسخة كاملة يومية يمكن استخدامها للاسترجاع.</p>
        </div>
        <div className="panel">
          <h3>استرجاع</h3>
          <p>الاسترجاع يتم عبر pg_restore بعد اختيار ملف النسخة.</p>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الملف</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الحجم</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.file}>
                <td>{backup.file}</td>
                <td>{backup.type}</td>
                <td>
                  <span className="status success">{backup.status}</span>
                </td>
                <td>{backup.size}</td>
                <td>
                  <div className="button-row">
                    <button className="btn btn-soft btn-icon" type="button" title="تحميل">
                      <CloudDownload size={17} />
                    </button>
                    <button className="btn btn-soft btn-icon" type="button" title="استرجاع">
                      <RotateCcw size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
