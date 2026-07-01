import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function PromoCodesRootPage() {
  redirect("/admin/promo-codes/photographers");
}
