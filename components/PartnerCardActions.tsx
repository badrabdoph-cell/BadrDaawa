import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { updatePartnerStatusAction } from "@/app/admin/partners/actions";

type PartnerCardActionsProps = {
  partnerId: string;
  partnerStatus: string;
  promoCode?: string;
  shortUrl?: string;
  shortPath?: string;
  qrCodeUrl?: string;
};

export function PartnerCardActions({ partnerId, partnerStatus, promoCode, shortUrl, shortPath, qrCodeUrl }: PartnerCardActionsProps) {
  const nextStatus = partnerStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";

  return (
    <details className="partner-card-actions">
      <summary aria-label="إجراءات الشريك">
        <MoreHorizontal size={18} />
      </summary>
      <div>
        <Link href={`/admin/partners/${partnerId}`}>عرض</Link>
        <Link href={`/admin/partners/${partnerId}/edit`}>تعديل</Link>
        {promoCode ? <CopyButton value={promoCode} label="نسخ البروموكود" className="partner-action-item" /> : null}
        {shortUrl ? <CopyButton value={shortUrl} label="نسخ الرابط" className="partner-action-item" /> : null}
        {shortPath ? <Link href={shortPath} target="_blank">فتح الرابط</Link> : null}
        {qrCodeUrl ? <Link href={qrCodeUrl} target="_blank">تنزيل QR</Link> : null}
        <form action={updatePartnerStatusAction}>
          <input type="hidden" name="id" value={partnerId} />
          <input type="hidden" name="returnTo" value="/admin/partners/directory" />
          <input type="hidden" name="status" value={nextStatus} />
          <button type="submit">{partnerStatus === "ACTIVE" ? "تعطيل" : "تفعيل"}</button>
        </form>
        <form action={updatePartnerStatusAction}>
          <input type="hidden" name="id" value={partnerId} />
          <input type="hidden" name="returnTo" value="/admin/partners/directory" />
          <input type="hidden" name="status" value="ARCHIVED" />
          <button type="submit">حذف</button>
        </form>
        <Link href={`/admin/partners/${partnerId}?tab=messages`}>إرسال رسالة</Link>
      </div>
    </details>
  );
}
