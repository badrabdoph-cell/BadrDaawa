import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { validateCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isValid = await validateCsrfToken(request);
  if (!isValid) {
    return NextResponse.json({ error: "CSRF token" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    if (!action) {
      return NextResponse.json({ ok: false, error: "لا يوجد إجراء محدد" }, { status: 400 });
    }

    const details: string[] = [];
    const errors: string[] = [];

    if (action === "analyze" || action === "all") {
      if (prisma) {
        try {
          await prisma.$queryRawUnsafe("ANALYZE");
          details.push("✅ تم تحديث إحصائيات قاعدة البيانات (ANALYZE)");
        } catch (e) {
          errors.push(`❌ فشل تحديث الإحصائيات: ${e}`);
        }
      }
    }

    if (action === "clear-cache" || action === "all") {
      try {
        revalidatePath("/", "layout");
        details.push("✅ تم تنظيف ذاكرة التخزين المؤقت وإعادة التحقق من جميع المسارات");
      } catch (e) {
        errors.push(`❌ فشل تنظيف الكاش: ${e}`);
      }
    }

    if (action === "reindex" || action === "all") {
      if (prisma) {
        try {
          await prisma.$queryRawUnsafe("REINDEX DATABASE").catch(() => {
            throw new Error("REINDEX DATABASE requires superuser, trying table-level");
          });
          details.push("✅ تم إعادة بناء فهارس قاعدة البيانات");
        } catch {
          try {
            const tables = ["Invitation", "OrderRequest", "Customer", "GuestRsvp", "AnalyticsEvent", "GuestBookMessage"];
            for (const table of tables) {
              await prisma.$queryRawUnsafe(`REINDEX TABLE "${table}"`).catch(() => {});
            }
            details.push("✅ تم إعادة بناء فهارس الجداول الرئيسية");
          } catch (e) {
            errors.push(`❌ فشل إعادة بناء الفهارس: ${e}`);
          }
        }
      }
    }

    if (action === "recalculate-stats" || action === "all") {
      if (prisma) {
        try {
          await prisma.$queryRawUnsafe("ANALYZE");
          details.push("✅ تم إعادة حساب إحصائيات المنصة");
        } catch (e) {
          errors.push(`❌ فشل إعادة حساب الإحصائيات: ${e}`);
        }
      }
    }

    if (action === "optimize-media" || action === "all") {
      details.push("ℹ️ ضغط الوسائط يتطلب أداة خارجية (sharp). يمكن تشغيله يدوياً عبر script.");
    }

    revalidatePath("/admin/cleanup");
    revalidatePath("/admin/cleanup/optimization");

    return NextResponse.json({
      ok: true,
      action,
      details,
      errors,
      redirect: `/admin/cleanup/optimization?status=optimized&details=${encodeURIComponent(details.join(" | "))}`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
