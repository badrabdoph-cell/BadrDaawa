import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readAppSetting, writeAppSetting } from "./app-settings";

export type ProjectContentKey =
  | "site-settings"
  | "home-content"
  | "home-preview-settings"
  | "template-settings"
  | "template-preview-info"
  | "templates-preview-music"
  | "music-library"
  | "legal-pages"
  | "message-templates"
  | "content-presets"
  | "custom-templates";

export type ProjectContentDefinition = {
  key: ProjectContentKey;
  appSettingKey: string;
  legacyPath: string;
  repoPath: string;
};

const definitions: ProjectContentDefinition[] = [
  "site-settings",
  "home-content",
  "home-preview-settings",
  "template-settings",
  "template-preview-info",
  "templates-preview-music",
  "music-library",
  "legal-pages",
  "message-templates",
  "content-presets",
  "custom-templates",
].map((key) => ({
  key: key as ProjectContentKey,
  appSettingKey: `project-content:${key}`,
  legacyPath: path.join(process.cwd(), "data", `${key}.json`),
  repoPath: `data/${key}.json`,
}));

const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
const projectContentAppSettingKeys = new Set(definitions.map((definition) => definition.appSettingKey));

function getDefinition(key: ProjectContentKey) {
  const definition = definitionByKey.get(key);
  if (!definition) throw new Error(`Unknown project content key: ${key}`);
  return definition;
}

async function readLegacyJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function isProjectContentAppSettingKey(key: string) {
  return projectContentAppSettingKeys.has(key);
}

export function getProjectContentDefinitions() {
  return definitions;
}

export async function readProjectContentSetting<T>(
  key: ProjectContentKey,
  fallback: T,
  normalize: (value: unknown) => T,
): Promise<T> {
  const definition = getDefinition(key);
  const saved = await readAppSetting<T>(definition.appSettingKey).catch((error) => {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn(`[Project Content] Falling back to legacy ${definition.repoPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  if (saved !== null) return normalize(saved);
  const legacy = await readLegacyJson<T>(definition.legacyPath, fallback);
  return normalize(legacy);
}

export async function writeProjectContentSetting<T>(key: ProjectContentKey, value: T): Promise<T> {
  const definition = getDefinition(key);
  return writeAppSetting(definition.appSettingKey, value);
}

export async function readProjectContentExportFiles() {
  const files: Array<{ repoPath: string; bytes: Buffer }> = [];
  for (const definition of definitions) {
    const saved = await readAppSetting<unknown>(definition.appSettingKey).catch((error) => {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn(`[Project Content] Export fallback for ${definition.repoPath}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    const value = saved ?? (await readLegacyJson<unknown>(definition.legacyPath, null));
    if (value === null || value === undefined) continue;
    files.push({
      repoPath: definition.repoPath,
      bytes: Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"),
    });
  }
  return files;
}

export async function writeLegacyProjectContentSnapshotForLocalReview() {
  for (const definition of definitions) {
    const saved = await readAppSetting<unknown>(definition.appSettingKey);
    if (saved === null) continue;
    await mkdir(path.dirname(definition.legacyPath), { recursive: true });
    await writeFile(definition.legacyPath, `${JSON.stringify(saved, null, 2)}\n`, "utf8");
  }
}
