"use client";

import { Banknote, Gift, Landmark, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/CopyButton";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import { normalizeInvitationGift } from "@/lib/invitation-texts";
import type { InvitationGift, Language } from "@/lib/types";

type GiftRow = {
  key: keyof InvitationGift;
  label: string;
  value: string;
  icon: ReactNode;
};

export function InviteGift({ gift, locale = "ar" }: { gift?: InvitationGift | null; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const cleanGift = normalizeInvitationGift(gift);
  const rows: GiftRow[] = [
    {
      key: "vodafoneCash" as const,
      label: t("invitation.gift.vodafoneCash"),
      value: cleanGift.vodafoneCash || "",
      icon: <Smartphone size={18} />,
    },
    {
      key: "instapay" as const,
      label: t("invitation.gift.instapay"),
      value: cleanGift.instapay || "",
      icon: <Banknote size={18} />,
    },
    {
      key: "bankAccount" as const,
      label: t("invitation.gift.bankAccount"),
      value: cleanGift.bankAccount || "",
      icon: <Landmark size={18} />,
    },
    {
      key: "customText" as const,
      label: t("invitation.gift.customText"),
      value: cleanGift.customText || "",
      icon: <Gift size={18} />,
    },
  ].filter((row) => row.value);

  if (!rows.length) return null;

  return (
    <section className="invite-gift-card" aria-label={t("invitation.gift.label")}>
      <div className="invite-gift-head">
        <span>
          <Gift size={16} />
          {t("invitation.gift.label")}
        </span>
        <h2>{t("invitation.gift.title")}</h2>
      </div>
      <div className="invite-gift-list">
        {rows.map((row) => (
          <article className="invite-gift-row" key={row.key}>
            <div className="invite-gift-icon" aria-hidden="true">
              {row.icon}
            </div>
            <div>
              <span>{row.label}</span>
              <strong dir={row.key === "customText" ? "auto" : "ltr"}>{row.value}</strong>
            </div>
            <CopyButton value={row.value} label={t("invitation.gift.copy")} copiedLabel={t("invitation.gift.copied")} className="invite-gift-copy" />
          </article>
        ))}
      </div>
    </section>
  );
}
