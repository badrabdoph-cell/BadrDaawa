import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
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
  draftAppSettingKey: string;
  publishedAppSettingKey: string;
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
  draftAppSettingKey: `project-content:draft:${key}`,
  publishedAppSettingKey: `project-content:published:${key}`,
  legacyPath: path.join(process.cwd(), "data", `${key}.json`),
  repoPath: `data/${key}.json`,
}));

const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]));
const projectContentAppSettingKeys = new Set(definitions.map((definition) => definition.appSettingKey));

// Meta keys for publish system
const PUBLISH_META_KEYS = {
  pendingChanges: "project-content:meta:pendingChanges",
  lastPublishedAt: "project-content:meta:lastPublishedAt",
  lastPublishedBy: "project-content:meta:lastPublishedBy",
  hasUnpublishedChanges: "project-content:meta:hasUnpublishedChanges",
  publishLock: "project-content:publish-lock",
  autoPublishEnabled: "project-content:meta:autoPublishEnabled",
  autoPublishIntervalMinutes: "project-content:meta:autoPublishIntervalMinutes",
} as const;

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
    return normalize(saved);
  }
  console.log(`[Project Content] ${key} loading from file: ${definition.repoPath}`);
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

// ─── Draft / Publish System ─────────────────────────────────────────────────────

export type PendingChanges = Record<string, { key: ProjectContentKey; timestamp: number }>;

export type PublishMeta = {
  pendingChanges: PendingChanges;
  lastPublishedAt: string | null;
  lastPublishedBy: string | null;
  hasUnpublishedChanges: boolean;
  autoPublishEnabled: boolean;
  autoPublishIntervalMinutes: number;
};

export async function readDraftContent<T>(key: ProjectContentKey, fallback: T, normalize: (value: unknown) => T): Promise<T> {
  const definition = getDefinition(key);
  let saved: T | null = null;
  try {
    saved = await readAppSetting<T>(definition.draftAppSettingKey);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn(`[Project Content Draft] Database error for ${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (saved !== null) {
    console.log(`[Project Content Draft] ${key} loaded from database`);
    return normalize(saved);
  }
  // If draft doesn't exist, fall back to published, then to legacy
  const published = await readPublishedContent(key, fallback, normalize);
  console.log(`[Project Content Draft] ${key} falling back to published`);
  return published;
}

export async function readPublishedContent<T>(key: ProjectContentKey, fallback: T, normalize: (value: unknown) => T): Promise<T> {
  const definition = getDefinition(key);
  let saved: T | null = null;
  try {
    saved = await readAppSetting<T>(definition.publishedAppSettingKey);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn(`[Project Content Published] Database error for ${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (saved !== null) {
    return normalize(saved);
  }
  console.log(`[Project Content Published] ${key} loading from file: ${definition.repoPath}`);
  const legacy = await readLegacyJson<T>(definition.legacyPath, fallback);
  return normalize(legacy);
}

export async function writeDraftContent<T>(key: ProjectContentKey, value: T): Promise<T> {
  const definition = getDefinition(key);
  try {
    await writeAppSetting(definition.draftAppSettingKey, value);
    console.log(`[Project Content Draft] ${key} saved to database`);
    // Update pending changes
    await updatePendingChanges(key);
    return value;
  } catch (dbError) {
    if (process.env.NODE_ENV === "production") throw dbError;
    console.warn(`[Project Content Draft] Database write failed for ${key}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    throw dbError;
  }
}

export async function writePublishedContent<T>(key: ProjectContentKey, value: T): Promise<T> {
  const definition = getDefinition(key);
  try {
    await writeAppSetting(definition.publishedAppSettingKey, value);
    console.log(`[Project Content Published] ${key} saved to database`);
    return value;
  } catch (dbError) {
    if (process.env.NODE_ENV === "production") throw dbError;
    console.warn(`[Project Content Published] Database write failed for ${key}: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
    throw dbError;
  }
}

export async function promoteDraftToPublished(key: ProjectContentKey): Promise<void> {
  const definition = getDefinition(key);
  const draft = await readAppSetting<unknown>(definition.draftAppSettingKey);
  if (draft === null) {
    console.log(`[Project Content] No draft found for ${key}, skipping promotion`);
    return;
  }
  await writePublishedContent(key, draft);
  await writeAppSetting(definition.appSettingKey, draft);
  console.log(`[Project Content] Promoted draft to published for ${key}`);
}

export async function getAllDraftContent(): Promise<Record<ProjectContentKey, unknown>> {
  const result: Partial<Record<ProjectContentKey, unknown>> = {};
  for (const definition of definitions) {
    const draft = await readAppSetting<unknown>(definition.draftAppSettingKey);
    if (draft !== null) {
      result[definition.key] = draft;
    }
  }
  return result as Record<ProjectContentKey, unknown>;
}

async function updatePendingChanges(key: ProjectContentKey): Promise<void> {
  const pendingChanges = await readAppSetting<PendingChanges>(PUBLISH_META_KEYS.pendingChanges) || {};
  pendingChanges[key] = { key, timestamp: Date.now() };
  await writeAppSetting(PUBLISH_META_KEYS.pendingChanges, pendingChanges);
  await writeAppSetting(PUBLISH_META_KEYS.hasUnpublishedChanges, true);
  console.log(`[Project Content] Updated pending changes for ${key}`);
}

export async function clearPendingChanges(): Promise<void> {
  await writeAppSetting(PUBLISH_META_KEYS.pendingChanges, {});
  await writeAppSetting(PUBLISH_META_KEYS.hasUnpublishedChanges, false);
  console.log(`[Project Content] Cleared pending changes`);
}

export async function getPublishMeta(): Promise<PublishMeta> {
  const [pendingChanges, lastPublishedAt, lastPublishedBy, hasUnpublishedChanges, autoPublishEnabled, autoPublishIntervalMinutes] = await Promise.all([
    readAppSetting<PendingChanges>(PUBLISH_META_KEYS.pendingChanges).then((v) => v || {}),
    readAppSetting<string | null>(PUBLISH_META_KEYS.lastPublishedAt),
    readAppSetting<string | null>(PUBLISH_META_KEYS.lastPublishedBy),
    readAppSetting<boolean>(PUBLISH_META_KEYS.hasUnpublishedChanges).then((v) => v || false),
    readAppSetting<boolean>(PUBLISH_META_KEYS.autoPublishEnabled).then((v) => v || false),
    readAppSetting<number>(PUBLISH_META_KEYS.autoPublishIntervalMinutes).then((v) => v || 30),
  ]);

  return {
    pendingChanges: pendingChanges as PendingChanges,
    lastPublishedAt,
    lastPublishedBy,
    hasUnpublishedChanges,
    autoPublishEnabled,
    autoPublishIntervalMinutes,
  };
}

export async function updatePublishMeta(data: Partial<{
  lastPublishedAt: string;
  lastPublishedBy: string;
  autoPublishEnabled: boolean;
  autoPublishIntervalMinutes: number;
}>): Promise<void> {
  if (data.lastPublishedAt !== undefined) {
    await writeAppSetting(PUBLISH_META_KEYS.lastPublishedAt, data.lastPublishedAt);
  }
  if (data.lastPublishedBy !== undefined) {
    await writeAppSetting(PUBLISH_META_KEYS.lastPublishedBy, data.lastPublishedBy);
  }
  if (data.autoPublishEnabled !== undefined) {
    await writeAppSetting(PUBLISH_META_KEYS.autoPublishEnabled, data.autoPublishEnabled);
  }
  if (data.autoPublishIntervalMinutes !== undefined) {
    await writeAppSetting(PUBLISH_META_KEYS.autoPublishIntervalMinutes, data.autoPublishIntervalMinutes);
  }
}

export async function acquirePublishLock(): Promise<boolean> {
  const currentLock = await readAppSetting<string | null>(PUBLISH_META_KEYS.publishLock);
  if (currentLock !== null) {
    // Check if lock is stale (older than 10 minutes)
    const lockTime = parseInt(currentLock, 10);
    if (Date.now() - lockTime < 10 * 60 * 1000) {
      console.log(`[Publish] Lock is active, skipping`);
      return false;
    }
  }
  await writeAppSetting(PUBLISH_META_KEYS.publishLock, String(Date.now()));
  console.log(`[Publish] Lock acquired`);
  return true;
}

export async function releasePublishLock(): Promise<void> {
  await writeAppSetting(PUBLISH_META_KEYS.publishLock, null);
  console.log(`[Publish] Lock released`);
}

export async function discardAllDrafts(): Promise<void> {
  for (const definition of definitions) {
    try {
      await writeAppSetting(definition.draftAppSettingKey, null);
    } catch (error) {
      console.error(`[Project Content] Failed to discard draft for ${definition.key}:`, error);
    }
  }
  await clearPendingChanges();
  console.log(`[Project Content] All drafts discarded`);
}
