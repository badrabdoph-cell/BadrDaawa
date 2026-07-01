import { getPostImageTemplate } from "./registry";
import type { PostImageRenderPayload } from "./types";

export function renderPostImageSvg(payload: PostImageRenderPayload): string {
  return getPostImageTemplate(payload.templateId).renderSvg(payload);
}
