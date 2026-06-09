import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "./db";
import { getFileCustomers, getFileGuestsByInvitation, getFileInvitations } from "./file-store";
import { getPublicTemplatesWithSettings } from "./template-settings";

export type HomePlatformStats = {
  invitations: number;
  customers: number;
  templates: number;
  confirmedRsvps: number;
};

async function getFileConfirmedRsvps() {
  const invitations = await getFileInvitations();
  const groups = await Promise.all(invitations.map((invitation) => getFileGuestsByInvitation(invitation.code)));
  return groups.flat().filter((guest) => guest.status === "confirmed").length;
}

export async function getHomePlatformStats(): Promise<HomePlatformStats> {
  noStore();
  const templatesPromise = getPublicTemplatesWithSettings();

  if (!prisma) {
    const [invitations, customers, templates, confirmedRsvps] = await Promise.all([getFileInvitations(), getFileCustomers(), templatesPromise, getFileConfirmedRsvps()]);
    return {
      invitations: invitations.filter((invitation) => !invitation.deletedAt).length,
      customers: customers.length,
      templates: templates.length,
      confirmedRsvps,
    };
  }

  try {
    const [invitations, customers, templates, confirmedRsvps] = await Promise.all([
      prisma.invitation.count({ where: { deletedAt: null } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      templatesPromise,
      prisma.guestRsvp.count({
        where: {
          status: "CONFIRMED",
          invitation: { deletedAt: null },
        },
      }),
    ]);

    return {
      invitations,
      customers,
      templates: templates.length,
      confirmedRsvps,
    };
  } catch (error) {
    console.error("Failed to load home platform stats", error);
    const [invitations, customers, templates, confirmedRsvps] = await Promise.all([getFileInvitations(), getFileCustomers(), templatesPromise, getFileConfirmedRsvps()]);
    return {
      invitations: invitations.filter((invitation) => !invitation.deletedAt).length,
      customers: customers.length,
      templates: templates.length,
      confirmedRsvps,
    };
  }
}
