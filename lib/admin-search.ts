import { unstable_noStore as noStore } from "next/cache";
import { getAdminCustomers, getAdminGuests, getAdminInvitations, getAdminOrders } from "./admin-data";
import { getTemplatesWithSettings } from "./template-settings";
import { searchContentTexts, collectAllTextEntries } from "./content-text-registry";
import type { GuestRsvp, Invitation, OrderRequest, TemplateDefinition } from "./types";
import type { ContentTextEntry } from "./content-text-registry";

export type AdminSearchKind = "invitations" | "customers" | "orders" | "guests" | "templates" | "content" | "admin-ui";

export type AdminSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
  source?: string;
  editable?: boolean;
};

export type AdminSearchGroup = {
  kind: AdminSearchKind;
  label: string;
  total: number;
  results: AdminSearchResult[];
};

export type AdminSearchResponse = {
  query: string;
  total: number;
  groups: AdminSearchGroup[];
};

const groupLabels: Record<AdminSearchKind, string> = {
  invitations: "الدعوات",
  customers: "العملاء",
  orders: "الطلبات",
  guests: "الحضور",
  templates: "القوالب",
  content: "المحتوى",
  "admin-ui": "نصوص الإدارة",
};

function normalizeSearchText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}@._+\-\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string) {
  return normalizeSearchText(query)
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2);
}

function matchesSearch(queryTokens: string[], values: unknown[]) {
  if (!queryTokens.length) return false;
  const haystack = normalizeSearchText(values.filter(Boolean).join(" "));
  return queryTokens.every((token) => haystack.includes(token));
}

function limitResults<T>(items: T[], limit: number) {
  return items.slice(0, limit);
}

function invitationStatusLabel(invitation: Invitation) {
  if (invitation.disabledAt) return "🔴 معطلة";
  if (invitation.status === "archived") return "مؤرشفة";
  if (invitation.status === "paused" || !invitation.isActive) return "متوقفة";
  return "نشطة";
}

function orderStatusLabel(status: OrderRequest["status"]) {
  const labels: Record<OrderRequest["status"], string> = {
    new: "جديد",
    reviewing: "قيد المراجعة",
    edited: "معدل",
    published: "منشور",
    rejected: "مرفوض",
    accepted: "مقبول",
    converted: "محول",
  };
  return labels[status] || status;
}

function buildInvitationResult(invitation: Invitation): AdminSearchResult {
  return {
    id: invitation.code,
    title: `${invitation.groomName} و ${invitation.brideName}`,
    subtitle: invitation.code,
    meta: `${invitation.venue}${invitation.city ? ` - ${invitation.city}` : ""} - ${invitationStatusLabel(invitation)}`,
    href: `/admin/invitations/${encodeURIComponent(invitation.code)}`,
  };
}

function buildOrderResult(order: OrderRequest): AdminSearchResult {
  return {
    id: order.id,
    title: `${order.groomName} و ${order.brideName}`,
    subtitle: order.orderNumber || order.id,
    meta: `${order.phone} - ${order.venue} - ${orderStatusLabel(order.status)}`,
    href: "/admin/orders",
  };
}

function buildTemplateResult(template: TemplateDefinition): AdminSearchResult {
  return {
    id: template.slug,
    title: template.arabicName,
    subtitle: template.name,
    meta: `${template.category} - ${template.enabled ? "مفعل" : "متوقف"}`,
    href: `/admin/templates#template-${template.slug}`,
  };
}

function buildGuestResult(guest: GuestRsvp): AdminSearchResult {
  return {
    id: guest.id,
    title: guest.name,
    subtitle: guest.phone,
    meta: `${guest.invitationCode} - ${guest.status === "confirmed" ? "حاضر" : "معتذر"} - ${guest.attendees} فرد`,
    href: `/admin/analytics?q=${encodeURIComponent(guest.name)}`,
  };
}

function buildContentTextResult(entry: ContentTextEntry): AdminSearchResult {
  return {
    id: entry.id,
    title: entry.title,
    subtitle: entry.text.slice(0, 120),
    meta: `${entry.sourceLabel} - ${entry.groupLabel}`,
    href: entry.href,
    source: entry.source,
    editable: entry.editable,
  };
}

export async function getGlobalAdminSearchResults(query: string, limitPerGroup = 8): Promise<AdminSearchResponse> {
  noStore();
  const cleanQuery = query.trim();
  const queryTokens = tokenize(cleanQuery);

  const [invitations, customers, orders, guests, templates] = await Promise.all([
    getAdminInvitations(),
    getAdminCustomers(),
    getAdminOrders(),
    getAdminGuests(),
    getTemplatesWithSettings(),
  ]);

  if (!queryTokens.length) {
    return {
      query: cleanQuery,
      total: 0,
      groups: (Object.keys(groupLabels) as AdminSearchKind[]).map((kind) => ({
        kind,
        label: groupLabels[kind],
        total: 0,
        results: [],
      })),
    };
  }

  const allContentTextMatches = await searchContentTexts(cleanQuery);
  const contentTextMatches = allContentTextMatches.filter((e) => e.source !== "admin-ui");
  const adminUiTextMatches = allContentTextMatches.filter((e) => e.source === "admin-ui");

  const invitationMatches = invitations.filter((invitation) =>
    matchesSearch(queryTokens, [
      invitation.code,
      invitation.groomName,
      invitation.brideName,
      invitation.venue,
      invitation.city,
      invitation.templateSlug,
      invitation.status,
      invitation.weddingDate,
    ]),
  );
  const customerMatches = customers.filter((customer) =>
    matchesSearch(queryTokens, [customer.name, customer.phone, customer.email, customer.username, customer.isActive ? "نشط active" : "متوقف inactive"]),
  );
  const orderMatches = orders.filter((order) =>
    matchesSearch(queryTokens, [
      order.id,
      order.orderNumber,
      order.groomName,
      order.brideName,
      order.phone,
      order.venue,
      order.status,
      order.notes,
      order.publishedInvitationCode,
      order.templateSlug,
    ]),
  );
  const guestMatches = guests.filter((guest) => matchesSearch(queryTokens, [guest.name, guest.phone, guest.invitationCode, guest.status, guest.note, guest.attendees]));
  const templateMatches = templates.filter((template) =>
    matchesSearch(queryTokens, [
      template.slug,
      template.name,
      template.arabicName,
      template.category,
      template.style,
      template.concept,
      template.opening,
      template.layout,
      template.typography,
      template.enabled ? "مفعل enabled" : "متوقف disabled",
    ]),
  );

  const groups: AdminSearchGroup[] = [
    {
      kind: "invitations",
      label: groupLabels.invitations,
      total: invitationMatches.length,
      results: limitResults(invitationMatches, limitPerGroup).map(buildInvitationResult),
    },
    {
      kind: "customers",
      label: groupLabels.customers,
      total: customerMatches.length,
      results: limitResults(customerMatches, limitPerGroup).map((customer) => ({
        id: customer.id,
        title: customer.name,
        subtitle: customer.username,
        meta: `${customer.phone}${customer.email ? ` - ${customer.email}` : ""} - ${customer.invitations} دعوة`,
        href: `/admin/customers/${encodeURIComponent(customer.id)}`,
      })),
    },
    {
      kind: "orders",
      label: groupLabels.orders,
      total: orderMatches.length,
      results: limitResults(orderMatches, limitPerGroup).map(buildOrderResult),
    },
    {
      kind: "guests",
      label: groupLabels.guests,
      total: guestMatches.length,
      results: limitResults(guestMatches, limitPerGroup).map(buildGuestResult),
    },
    {
      kind: "templates",
      label: groupLabels.templates,
      total: templateMatches.length,
      results: limitResults(templateMatches, limitPerGroup).map(buildTemplateResult),
    },
    {
      kind: "content",
      label: groupLabels.content,
      total: contentTextMatches.length,
      results: limitResults(contentTextMatches, limitPerGroup).map(buildContentTextResult),
    },
    {
      kind: "admin-ui",
      label: groupLabels["admin-ui"],
      total: adminUiTextMatches.length,
      results: limitResults(adminUiTextMatches, limitPerGroup).map(buildContentTextResult),
    },
  ];

  return {
    query: cleanQuery,
    total: groups.reduce((sum, group) => sum + group.total, 0),
    groups,
  };
}
