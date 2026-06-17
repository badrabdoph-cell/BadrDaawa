import Link from "next/link";
import { Archive, ExternalLink, FileText, Search, Star, UsersRound } from "lucide-react";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { getAdminCustomers, getAdminInvitations, getAdminOrders } from "@/lib/admin-data";
import { getAdminFavorites } from "@/lib/admin-favorites";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import type { AdminFavorite, AdminFavoriteEntityType } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type FavoritesPageParams = {
  q?: string;
  type?: string;
  favoriteStatus?: string;
};

const typeLabels: Record<AdminFavoriteEntityType, string> = {
  invitation: "الدعوات",
  order: "الطلبات",
  customer: "العملاء",
};

const typeIcons = {
  invitation: Archive,
  order: FileText,
  customer: UsersRound,
};

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" }).format(date);
}

function favoriteStatusMessage(value?: string) {
  if (value === "added") return "تمت إضافة العنصر إلى المفضلة.";
  if (value === "removed") return "تمت إزالة العنصر من المفضلة.";
  if (value === "missing") return "العنصر غير موجود في المفضلة.";
  if (value === "invalid") return "تعذر تحديث المفضلة.";
  return "";
}

function normalizeType(value?: string): AdminFavoriteEntityType | undefined {
  return value === "invitation" || value === "order" || value === "customer" ? value : undefined;
}

function searchableFavorite(favorite: AdminFavorite) {
  return [favorite.label, favorite.entityId, favorite.entityType, favorite.href].join(" ").toLowerCase();
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
  const favoriteMessage = favoriteStatusMessage(params.favoriteStatus);
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
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Favorites</span>
          <h1>المفضلة</h1>
          <p>وصول سريع للدعوات والطلبات والعملاء المهمين بدون البحث في كل مرة.</p>
        </div>
      </div>

      {favoriteMessage ? <div className={params.favoriteStatus === "added" || params.favoriteStatus === "removed" ? "notice success" : "notice danger"}>{favoriteMessage}</div> : null}

      <section className="admin-list-overview" aria-label="ملخص المفضلة">
        <div className="admin-list-stat warning">
          <Star size={19} />
          <span>كل المفضلة</span>
          <strong>{formatArabicNumber(favorites.length)}</strong>
        </div>
        <div className="admin-list-stat">
          <Archive size={19} />
          <span>دعوات</span>
          <strong>{formatArabicNumber(favoriteCounts.invitation)}</strong>
        </div>
        <div className="admin-list-stat">
          <FileText size={19} />
          <span>طلبات</span>
          <strong>{formatArabicNumber(favoriteCounts.order)}</strong>
        </div>
        <div className="admin-list-stat">
          <UsersRound size={19} />
          <span>عملاء</span>
          <strong>{formatArabicNumber(favoriteCounts.customer)}</strong>
        </div>
      </section>

      <form className="admin-table-toolbar" action="/admin/favorites" method="get">
        <label className="admin-search-field">
          <Search size={17} />
          <input name="q" placeholder="ابحث داخل المفضلة" defaultValue={params.q || ""} />
        </label>
        <label className="admin-select-field">
          <Star size={17} />
          <select name="type" defaultValue={selectedType || "all"} aria-label="فلترة نوع المفضلة">
            <option value="all">كل الأنواع</option>
            <option value="invitation">الدعوات</option>
            <option value="order">الطلبات</option>
            <option value="customer">العملاء</option>
          </select>
        </label>
        <button className="btn btn-soft" type="submit">تطبيق</button>
        {query || selectedType ? <Link className="btn btn-soft" href="/admin/favorites">مسح</Link> : null}
      </form>

      <section className="favorites-layout" aria-label="قائمة المفضلة">
        {(["invitation", "order", "customer"] as AdminFavoriteEntityType[]).map((entityType) => {
          const items = groupedFavorites.get(entityType) || [];
          const Icon = typeIcons[entityType];
          if (!items.length) return null;
          return (
            <div className="favorites-group" key={entityType}>
              <div className="favorites-group-head">
                <div>
                  <Icon size={20} />
                  <h2>{typeLabels[entityType]}</h2>
                </div>
                <strong>{formatArabicNumber(items.length)}</strong>
              </div>
              <div className="favorites-list">
                {items.map(({ favorite, href, subtitle }) => {
                    return (
                      <article className="favorite-card" key={favorite.id}>
                        <div>
                          <span>{typeLabels[favorite.entityType]}</span>
                          <h3>{favorite.label}</h3>
                          <p>{subtitle}</p>
                          <small>أضيفت: {formatAdminDate(favorite.createdAt)}</small>
                        </div>
                        <div className="favorite-card-actions">
                          <Link className="btn btn-soft" href={href}>
                            <ExternalLink size={16} />
                            فتح
                          </Link>
                          <FavoriteToggleButton
                            entityType={favorite.entityType}
                            entityId={favorite.entityId}
                            label={favorite.label}
                            href={favorite.href}
                            returnTo="/admin/favorites"
                            active
                          />
                        </div>
                      </article>
                    );
                })}
              </div>
            </div>
          );
        })}
        {!filteredFavorites.length ? (
          <div className="admin-empty-state compact">
            <Star size={24} />
            <strong>لا توجد عناصر في المفضلة</strong>
            <p>استخدم علامة النجمة داخل الدعوات أو الطلبات أو العملاء لإضافتها هنا.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
