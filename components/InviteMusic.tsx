"use client";

import { usePathname } from "next/navigation";
import { AudioPlayer } from "@/components/AudioPlayer";

const nonInvitationSegments = new Set(["", "admin", "api", "_next", "templates", "order", "pricing", "faq", "contact", "client", "client-invitations"]);

function isTemplatePreviewPath(segments: string[]) {
  return segments.length === 3 && segments[0]?.toLowerCase() === "templates" && Boolean(segments[1]) && segments[2]?.toLowerCase() === "preview";
}

function isMusicEnabledPath(pathname: string | null) {
  const segments = (pathname || "").split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (isTemplatePreviewPath(segments)) return true;
  if (segments.length !== 1) return false;
  return !nonInvitationSegments.has(segments[0].toLowerCase());
}

export function InviteMusic({ musicUrl }: { musicUrl?: string | null }) {
  const pathname = usePathname();
  const cleanMusicUrl = typeof musicUrl === "string" ? musicUrl.trim() : "";
  if (!cleanMusicUrl || !isMusicEnabledPath(pathname)) return null;
  return <AudioPlayer src={cleanMusicUrl} label="موسيقى الدعوة" floating />;
}
