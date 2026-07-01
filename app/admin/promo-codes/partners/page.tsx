import { redirect } from "next/navigation";
import { logLegacyPromoRouteAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function OldPartnerPromoCodesPage() {
  await logLegacyPromoRouteAction("/admin/promo-codes/partners");
  redirect("/admin/promo-codes/photographers");
}
