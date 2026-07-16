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
  | "custom-templates"
  | "site-text-overrides";

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
  "site-text-overrides",
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

function draftAppSettingKey(key: ProjectContentKey): string {
  return `project-content:draft:${key}`;
}

function publishedAppSettingKey(key: ProjectContentKey): string {
  return `project-content:published:${key}`;
}

export async function readDraftContent<T>(
  key: ProjectContentKey,
  fallback: T,
  normalize: (value: unknown) => T,
): Promise<T> {
  const definition = getDefinition(key);
  let saved: T | null = null;
  try {
    saved = await readAppSetting<T>(draftAppSettingKey(key));
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
  }
  if (saved !== null) return normalize(saved);
  const legacy = await readLegacyJson<T>(definition.legacyPath, fallback);
  return normalize(legacy);
}

export async function readPublishedContent<T>(
  key: ProjectContentKey,
  fallback: T,
  normalize: (value: unknown) => T,
): Promise<T> {
  const definition = getDefinition(key);
  let saved: T | null = null;
  try {
    saved = await readAppSetting<T>(publishedAppSettingKey(key));
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
  }
  if (saved !== null) return normalize(saved);
  const legacy = await readLegacyJson<T>(definition.legacyPath, fallback);
  return normalize(legacy);
}

export async function writeDraftContent<T>(key: ProjectContentKey, value: T): Promise<T> {
  try {
    await writeAppSetting(draftAppSettingKey(key), value);
    const pendingKey = "publish-pending-changes";
    const existing = await readAppSetting<Record<string, unknown>>(pendingKey).catch(() => ({}));
    await writeAppSetting(pendingKey, { ...(existing || {}), [key]: { changedAt: new Date().toISOString() } });
    console.log(`[Project Content] Draft ${key} saved`);
    return value;
  } catch (dbError) {
    if (process.env.NODE_ENV === "production") throw dbError;
    const definition = getDefinition(key);
    await mkdir(path.dirname(definition.legacyPath), { recursive: true });
    await writeFile(definition.legacyPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    return value;
  }
}

export type PublishMeta = {
  hasUnpublishedChanges: boolean;
  pendingChanges: Record<string, unknown>;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  autoPublishEnabled: boolean;
  autoPublishIntervalMinutes: number;
};

const PUBLISH_META_KEY = "publish-meta";
const defaultPublishMeta: PublishMeta = {
  hasUnpublishedChanges: false,
  pendingChanges: {},
  lastPublishedAt: null,
  lastPublishedBy: null,
  autoPublishEnabled: false,
  autoPublishIntervalMinutes: 30,
};

export async function getPublishMeta(): Promise<PublishMeta> {
  const saved = await readAppSetting<PublishMeta>(PUBLISH_META_KEY).catch(() => null);
  const pendingChanges = await readAppSetting<Record<string, unknown>>("publish-pending-changes").catch(() => ({}));
  const meta = saved ?? defaultPublishMeta;
  return {
    ...meta,
    pendingChanges: pendingChanges || {},
    hasUnpublishedChanges: Object.keys(pendingChanges || {}).length > 0,
  };
}

export async function updatePublishMeta(input: { lastPublishedAt: string; lastPublishedBy: string }): Promise<void> {
  const current = await getPublishMeta();
  const next: PublishMeta = {
    ...current,
    lastPublishedAt: input.lastPublishedAt,
    lastPublishedBy: input.lastPublishedBy,
    hasUnpublishedChanges: false,
    pendingChanges: {},
  };
  await writeAppSetting(PUBLISH_META_KEY, next);
  await writeAppSetting("publish-pending-changes", {});
}

const LOCK_KEY = "publish-lock";

export async function acquirePublishLock(): Promise<boolean> {
  const existing = await readAppSetting<{ lockedAt: string | null }>(LOCK_KEY).catch(() => null);
  if (existing?.lockedAt) {
    const age = Date.now() - new Date(existing.lockedAt).getTime();
    if (age < 5 * 60 * 1000) return false;
  }
  await writeAppSetting(LOCK_KEY, { lockedAt: new Date().toISOString() });
  return true;
}

export async function releasePublishLock(): Promise<void> {
  await writeAppSetting(LOCK_KEY, { lockedAt: null }).catch(() => {});
}

export async function promoteDraftToPublished(key: ProjectContentKey): Promise<void> {
  const draftValue = await readAppSetting<unknown>(draftAppSettingKey(key));
  if (draftValue !== null) {
    await writeAppSetting(publishedAppSettingKey(key), draftValue);
  }
}

export async function clearPendingChanges(): Promise<void> {
  await writeAppSetting("publish-pending-changes", {});
}

export async function getAllDraftContent(): Promise<Record<ProjectContentKey, unknown>> {
  const result: Record<string, unknown> = {};
  for (const def of definitions) {
    const value = await readAppSetting<unknown>(draftAppSettingKey(def.key)).catch(() => null);
    if (value !== null) result[def.key] = value;
  }
  return result as Record<ProjectContentKey, unknown>;
}
