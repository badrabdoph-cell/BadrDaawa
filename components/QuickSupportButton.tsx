import { MessageCircle } from "lucide-react";

export function QuickSupportButton({ whatsappUrl }: { whatsappUrl?: string | null }) {
  if (!whatsappUrl) return null;
  return (
    <a
      className="btn btn-gold quick-support-btn"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <MessageCircle size={17} />
      خدمة العملاء
    </a>
  );
}
