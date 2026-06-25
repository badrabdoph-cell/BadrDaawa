import { BroadcastStudio } from "@/components/BroadcastStudio";
import { collectAllTextEntries } from "@/lib/content-text-registry";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [params, textEntries] = await Promise.all([searchParams, collectAllTextEntries()]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Broadcast Studio</span>
          <h1>شاشة بث الموقع</h1>
          <p>الموقع الحقيقي داخل لوحة الأدمن. تصفح جميع الصفحات واضغط على علامة القلم بجانب أي نص لتعديله مباشرة.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم حفظ التعديل وتحديث الموقع وإرساله للمزامنة التلقائية.</div> : null}
      {params.error ? <div className="notice danger">تعذر حفظ التعديل. اختر عنصرًا صالحًا وحاول مرة أخرى.</div> : null}

      <BroadcastStudio
        textEntries={textEntries.filter((entry) => entry.editable)}
      />
    </>
  );
}
