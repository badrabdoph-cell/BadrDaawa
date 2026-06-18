import { getAdminCustomers, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { getAdminFavorites } from "@/lib/admin-favorites";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import type { AdminFavorite, AdminFavoriteEntityType } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";
import { AdminFavoritesClient } from "@/components/AdminFavoritesClient";

export const dynamic = "force-dynamic";

type FavoritesPageParams = {
  q?: string;
  type?: string;
};

function normalizeType(value?: string): AdminFavoriteEntityType | undefined {
  return value === "invitation" || value === "order" || value === "customer" ? value : undefined;
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<FavoritesPageParams>;
}) {
  const params = await searchParams;
  const selectedType = normalizeType(params.type);
  const query = (params.q || "").trim().toLowerCase();
  const [favorites, invitations, orders, customers] = await Promise.all([
    getAdminFavorites({ entityType: selectedType }),
    getAdminInvitations(),
    getAdminOrders(),
    getAdminCustomers(),
  ]);
  const invitationByCode = new Map(invitations.map((invitation) => [invitation.code, invitation]));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const filteredFavorites = favorites.filter((favorite) => !query || searchableFavorite(favorite).includes(query));
  const favoriteCounts = {
    invitation: favorites.filter((favorite) => favorite.entityType === "invitation").length,
    order: favorites.filter((favorite) => favorite.entityType === "order").length,
    customer: favorites.filter((favorite) => favorite.entityType === "customer").length,
  };

  async function favoriteHref(favorite: AdminFavorite) {
    if (favorite.entityType !== "invitation") return favorite.href;
    const invitation = invitationByCode.get(favorite.entityId);
    return invitation ? getInvitationManagePath(invitation.code) : favorite.href;
  }

  function favoriteSubtitle(favorite: AdminFavorite) {
    if (favorite.entityType === "invitation") {
      const invitation = invitationByCode.get(favorite.entityId);
      return invitation ? `${invitation.venue} - ${new Date(invitation.weddingDate).toLocaleDateString("ar-EG-u-nu-latn")}` : "دعوة غير موجودة أو محذوفة";
    }
    if (favorite.entityType === "order") {
      const order = orderById.get(favorite.entityId);
      return order ? `${order.phone} - ${order.status}` : "طلب غير موجود أو محذوف";
    }
    const customer = customerById.get(favorite.entityId);
    return customer ? `${customer.phone} - ${formatArabicNumber(customer.invitations)} دعوة` : "عميل غير موجود أو محذوف";
  }

  const favoriteCards = await Promise.all(
    filteredFavorites.map(async (favorite) => ({
      favorite,
      href: await favoriteHref(favorite),
      subtitle: favoriteSubtitle(favorite),
    })),
  );
  const groupedFavorites = favoriteCards.reduce((map, item) => {
    const current = map.get(item.favorite.entityType) || [];
    current.push(item);
    map.set(item.favorite.entityType, current);
    return map;
  }, new Map<AdminFavoriteEntityType, typeof favoriteCards>());

  return (
    <AdminFavoritesClient
      groupedFavorites={Array.from(groupedFavorites.entries())}
      favoriteCounts={favoriteCounts}
      totalCount={favorites.length}
      query={query}
      selectedType={selectedType}
    />
  );
}

function searchableFavorite(favorite: AdminFavorite) {
  return [favorite.label, favorite.entityId, favorite.entityType, favorite.href].join(" ").toLowerCase();
}
