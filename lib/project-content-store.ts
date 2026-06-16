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
  let saved: T | null = null;
  try {
    saved = await readAppSetting<T>(definition.appSettingKey);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn(`[Project Content] Database error for ${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (saved !== null) {
    console.log(`[Project Content] ${key} loaded from database`);
    return normalize(saved);
  }
  if (process.env.NODE_ENV === "production") {
    console.log(`[Project Content] ${key} not in database, using defaults`);
    return normalize(fallback);
  }
  console.log(`[Project Content] ${key} loading from legacy file: ${definition.repoPath}`);
  const legacy = await readLegacyJson<T>(definition.legacyPath, fallback);
  return normalize(legacy);
}

export async function writeProjectContentSetting<T>(key: ProjectContentKey, value: T): Promise<T> {
  const definition = getDefinition(key);
  try {
    await writeAppSetting(definition.appSettingKey, value);
    console.log(`[Project Content] ${key} saved to database`);
    return value;
  } catch (dbError) {
    if (process.env.NODE_ENV === "production") throw dbError;
    console.warn(`[Project Content] Database write failed for ${key}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    try {
      await mkdir(path.dirname(definition.legacyPath), { recursive: true });
      await writeFile(definition.legacyPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      console.log(`[Project Content] ${key} saved to legacy file as fallback: ${definition.repoPath}`);
      return value;
    } catch (fileError) {
      console.error(`[Project Content] CRITICAL: Failed to save ${key} to both database and file: ${fileError instanceof Error ? fileError.message : String(fileError)}`);
      throw new Error(`Failed to save ${key}: both database and file write failed`);
    }
  }
}

export async function readProjectContentExportFiles() {
  const files: Array<{ repoPath: string; bytes: Buffer }> = [];
  for ( const definition of definitions) {
    const saved = await readAppSetting<unknown>(definition.appSettingKey).catch((error) => {
      if (process.env.NODE_ENV === "production") throw error;
      console.warn(`[Project Content] Export fallback for ${definition.repoPath}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
    if (saved === null || saved === undefined) continue;
    files.push({
      repoPath: definition.repoPath,
      bytes: Buffer.from(`${JSON.stringify(saved, null, 2)}\n`, "utf8"),
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
