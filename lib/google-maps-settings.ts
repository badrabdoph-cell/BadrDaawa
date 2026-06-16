import { readProjectContentSetting, writeProjectContentSetting } from "./project-content-store";

export type GoogleMapsSettings = {
  apiKey: string;
};

const defaults: GoogleMapsSettings = {
  apiKey: "",
};

function normalize(input: unknown): GoogleMapsSettings {
  const raw = input as Partial<GoogleMapsSettings> | null;
  return {
    apiKey: typeof raw?.apiKey === "string" ? raw.apiKey.trim() : "",
  };
}

export async function getGoogleMapsSettings(): Promise<GoogleMapsSettings> {
  return readProjectContentSetting("google-maps", defaults, normalize);
}

export async function updateGoogleMapsSettings(input: { apiKey: string }): Promise<GoogleMapsSettings> {
  const next = normalize(input);
  await writeProjectContentSetting("google-maps", next);
  return next;
}
