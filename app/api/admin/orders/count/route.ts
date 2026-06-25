import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAdminOrders } from "@/lib/admin-data";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (prisma) {
    try {
      const count = await Promise.race([
        prisma.orderRequest.count({
          where: {
            deletedAt: null,
            status: {
              in: ["NEW", "REVIEWING", "EDITED", "ACCEPTED"] as never,
            },
          },
        }),
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      return NextResponse.json({ count });
    } catch (error) {
      console.error("Failed to count admin order requests from database", error);
    }
  }

  try {
    const orders = await getAdminOrders();
    const count = orders.filter((order) => !["published", "converted", "rejected"].includes(order.status)).length;
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
