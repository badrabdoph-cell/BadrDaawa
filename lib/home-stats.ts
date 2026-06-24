import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { getPublicTemplatesWithSettings } from "./template-settings";

export type HomePlatformStats = {
  invitations: number;
  customers: number;
  templates: number;
  confirmedRsvps: number;
  views: number;
  activeNow: number;
};

export async function getHomePlatformStats(): Promise<HomePlatformStats> {
  noStore();
  const templatesPromise = getPublicTemplatesWithSettings();

  if (!prisma) {
    const templates = await templatesPromise;
    return {
      invitations: 0,
      customers: 0,
      templates: templates.length,
      confirmedRsvps: 0,
      views: 0,
      activeNow: 0,
    };
  }

  try {
    const [invitations, customers, templates, confirmedRsvps, invitationViews] = await Promise.all([
      prisma.invitation.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      templatesPromise,
      prisma.guestRsvp.count({
        where: {
          status: "CONFIRMED",
          invitation: { deletedAt: null },
        },
      }),
      prisma.invitation.aggregate({
        where: { deletedAt: null },
        _sum: { viewCount: true },
      }),
    ]);

    return {
      invitations,
      customers,
      templates: templates.length,
      confirmedRsvps,
      views: invitationViews._sum.viewCount || 0,
      activeNow: 10,
    };
  } catch (error) {
    console.error("Failed to load home platform stats", error);
    const templates = await templatesPromise;
    return {
      invitations: 0,
      customers: 0,
      templates: templates.length,
      confirmedRsvps: 0,
      views: 0,
      activeNow: 0,
    };
  }
}
