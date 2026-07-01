import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OldNewDiscountPromoCodePage() {
  redirect("/admin/promo-codes/discounts");
}
