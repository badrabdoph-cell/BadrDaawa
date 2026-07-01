import { createHash } from "node:crypto";

import { extractPostImageMonthYear } from "./date";
import type { PostImageSignatureInput } from "./types";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeUrl(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function normalizePostImageSignatureInput(input: PostImageSignatureInput) {
  const { month, year } = extractPostImageMonthYear(input.weddingDate);

  return {
    templateId: normalizeText(input.templateId),
    size: {
      id: normalizeText(input.size.id),
      width: input.size.width,
      height: input.size.height,
    },
    groomName: normalizeText(input.groomName),
    brideName: normalizeText(input.brideName),
    weddingMonth: month,
    weddingYear: year,
    coverImageUrl: normalizeUrl(input.coverImageUrl),
    invitationUrl: normalizeUrl(input.invitationUrl),
  };
}

export function createPostImageSignature(input: PostImageSignatureInput): string {
  const normalized = normalizePostImageSignatureInput(input);
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
