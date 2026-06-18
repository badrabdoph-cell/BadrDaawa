import { prisma } from "@/lib/db";

export function generateCheckInCode(invitationCode: string, guestId: string): string {
  const data = `${invitationCode}:${guestId}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${invitationCode}-${Math.abs(hash).toString(36)}-${guestId.slice(0, 8)}`;
}

export async function checkInGuest(checkInCode: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!prisma) return { success: false, message: "قاعدة البيانات غير متصلة" };
    
    const parts = checkInCode.split("-");
    if (parts.length < 3) return { success: false, message: "رمز غير صالح" };
    
    const guestId = parts[parts.length - 1];
    
    const rsvp = await prisma.guestRsvp.findUnique({
      where: { id: guestId },
      select: { id: true, name: true, invitationId: true },
    });
    
    if (!rsvp) return { success: false, message: "الضيف غير موجود" };
    
    await prisma.invitationCheckIn.create({
      data: {
        id: `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        invitationCode: checkInCode.split("-")[0],
        visitorKey: `qr-${guestId}`,
        userAgent: "QR-CheckIn",
      },
    });
    
    return { success: true, message: `تم تسجيل دخول ${rsvp.name}` };
  } catch (err) {
    console.error("Check-in failed:", err);
    return { success: false, message: "حدث خطأ أثناء تسجيل الدخول" };
  }
}
