import { Star } from "lucide-react";
import type { AdminFavoriteEntityType } from "@/lib/types";

export function FavoriteToggleButton({
  entityType,
  entityId,
  label,
  href,
  returnTo,
  active,
  iconOnly = false,
}: {
  entityType: AdminFavoriteEntityType;
  entityId: string;
  label: string;
  href: string;
  returnTo: string;
  active: boolean;
  iconOnly?: boolean;
}) {
  const className = [
    "btn",
    "btn-soft",
    iconOnly ? "btn-icon" : "",
    "favorite-toggle",
    active ? "active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form action="/api/admin/favorites" method="post">
      <input type="hidden" name="action" value="toggle" />
      <input type="hidden" name="entityType" value={entityType} />
      <input type="hidden" name="entityId" value={entityId} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="href" value={href} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button className={className} type="submit" title={active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"} aria-pressed={active}>
        <Star size={17} fill={active ? "currentColor" : "none"} />
        {iconOnly ? <span className="sr-only">{active ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}</span> : <span>{active ? "مفضلة" : "أضف للمفضلة"}</span>}
      </button>
    </form>
  );
}
