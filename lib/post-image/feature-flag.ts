import type { SiteSettings } from "../site-settings";

type PostImageFeatureSettings = Pick<SiteSettings, "order">;

export function isPostImageFeatureEnabled(settings?: PostImageFeatureSettings | null) {
  return settings?.order?.postImageEnabled !== false;
}
