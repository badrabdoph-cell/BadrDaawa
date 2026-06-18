import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createBackupSnapshot } from "@/lib/backups";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    if (!action) {
      return NextResponse.json({ ok: false, error: "لا يوجد إجراء محدد" }, { status: 400 });
    }

    const backup = await createBackupSnapshot(`db-cleanup-${action}`);
    const details: string[] = [];
    let deletedCount = 0;

    if (action === "old-analytics" || action === "all") {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      if (prisma) {
        const result = await prisma.analyticsEvent.deleteMany({
          where: { createdAt: { lt: ninetyDaysAgo } },
        });
        if (result.count > 0) {
          details.push(`تم حذف ${result.count} سجل تحليلات`);
          deletedCount += result.count;
        }
      }
    }

    if (action === "expired-trash" || action === "all") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (prisma) {
        const invitations = await prisma.invitation.deleteMany({
          where: { deletedAt: { lt: thirtyDaysAgo } },
        });
        if (invitations.count > 0) {
          details.push(`تم حذف ${invitations.count} دعوة منتهية`);
          deletedCount += invitations.count;
        }
        const orders = await prisma.orderRequest.deleteMany({
          where: { deletedAt: { lt: thirtyDaysAgo } },
        });
        const customers = await prisma.customer.deleteMany({
          where: { deletedAt: { lt: thirtyDaysAgo } },
        });
        if (orders.count > 0) {
          details.push(`تم حذف ${orders.count} طلب منتهي`);
          deletedCount += orders.count;
        }
        if (customers.count > 0) {
          details.push(`تم حذف ${customers.count} عميل منتهي`);
          deletedCount += customers.count;
        }
      }
    }

    if (action === "orphans" || action === "all") {
      if (prisma) {
        const invitationCodes = (await prisma.invitation.findMany({ select: { code: true } })).map((i) => i.code);
        const aliasSet = new Set(invitationCodes);

        const orphanGuestBook = await prisma.guestBookMessage.deleteMany({
          where: { invitationCode: { notIn: invitationCodes } },
        });
        if (orphanGuestBook.count > 0) {
          details.push(`تم حذف ${orphanGuestBook.count} رسالة تهنئة يتيمة`);
          deletedCount += orphanGuestBook.count;
        }

        const orphanCheckIns = await prisma.invitationCheckIn.deleteMany({
          where: { invitationCode: { notIn: invitationCodes } },
        });
        if (orphanCheckIns.count > 0) {
          details.push(`تم حذف ${orphanCheckIns.count} تسجيل حضور يتيم`);
          deletedCount += orphanCheckIns.count;
        }

        const orphanMessages = await prisma.clientMessage.deleteMany({
          where: { invitationCode: { notIn: invitationCodes } },
        });
        if (orphanMessages.count > 0) {
          details.push(`تم حذف ${orphanMessages.count} رسالة عميل يتيمة`);
          deletedCount += orphanMessages.count;
        }
      }
    }

    revalidatePath("/admin/cleanup");
    revalidatePath("/admin/cleanup/database");
    revalidatePath("/admin/cleanup/scan");

    return NextResponse.json({
      ok: true,
      action,
      deletedCount,
      details,
      backupFileName: backup.fileName,
      redirect: `/admin/cleanup/database?status=cleaned&count=${deletedCount}`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
