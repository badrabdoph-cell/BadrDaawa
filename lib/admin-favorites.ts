import { readFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import { readAppSettingOrSeed, writeAppSetting } from "./app-settings";
import type { AdminFavorite, AdminFavoriteEntityType } from "./types";

const favoritesPath = path.join(process.cwd(), "data", "admin-favorites.json");
const favoritesKey = "admin-favorites";
const maxStoredFavorites = 1000;

type AdminFavoriteInput = {
  id?: unknown;
  entityType?: unknown;
  entityId?: unknown;
  label?: unknown;
  href?: unknown;
  createdAt?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function createFavoriteId() {
  return `favorite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeEntityType(value: unknown): AdminFavoriteEntityType | null {
  return value === "order" || value === "invitation" || value === "customer" ? value : null;
}

function normalizeHref(value: unknown) {
  const href = cleanText(value, 400);
  if (!href.startsWith("/") || href.startsWith("//")) return "";
  return href;
}

function normalizeFavorite(value: AdminFavoriteInput): AdminFavorite | null {
  const entityType = normalizeEntityType(value.entityType);
  const entityId = cleanText(value.entityId, 180);
  const label = cleanText(value.label, 180);
  const href = normalizeHref(value.href);
  if (!entityType || !entityId || !label || !href) return null;
  return {
    id: cleanText(value.id, 120) || createFavoriteId(),
    entityType,
    entityId,
    label,
    href,
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : nowIso(),
  };
}

function favoriteKey(entityType: AdminFavoriteEntityType, entityId: string) {
  return `${entityType}:${entityId}`;
}

function sortFavorites(favorites: AdminFavorite[]) {
  return [...favorites].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

async function readFavoritesRaw() {
  return readAppSettingOrSeed(favoritesKey, async () => {
    try {
    const raw = await readFile(favoritesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortFavorites(parsed.map((item) => normalizeFavorite(item as AdminFavoriteInput)).filter(Boolean) as AdminFavorite[]);
    } catch {
    return [];
    }
  });
}

async function writeFavorites(favorites: AdminFavorite[]) {
  await writeAppSetting(favoritesKey, sortFavorites(favorites).slice(0, maxStoredFavorites));
}

export async function getAdminFavorites(filters: { entityType?: AdminFavoriteEntityType; q?: string } = {}) {
  noStore();
  const favorites = await readFavoritesRaw();
  const query = cleanText(filters.q, 180).toLowerCase();
  return favorites.filter((favorite) => {
    const haystack = [favorite.label, favorite.entityId, favorite.entityType, favorite.href].join(" ").toLowerCase();
    return (!filters.entityType || favorite.entityType === filters.entityType) && (!query || haystack.includes(query));
  });
}

export async function addAdminFavorite(input: {
  entityType: unknown;
  entityId: unknown;
  label: unknown;
  href: unknown;
}) {
  const favorite = normalizeFavorite({
    id: createFavoriteId(),
    entityType: input.entityType,
    entityId: input.entityId,
    label: input.label,
    href: input.href,
    createdAt: nowIso(),
  });
  if (!favorite) return null;

  const favorites = await readFavoritesRaw();
  const key = favoriteKey(favorite.entityType, favorite.entityId);
  const next = [favorite, ...favorites.filter((item) => favoriteKey(item.entityType, item.entityId) !== key)];
  await writeFavorites(next);
  return favorite;
}

export async function removeAdminFavorite(entityType: unknown, entityId: unknown) {
  const normalizedType = normalizeEntityType(entityType);
  const normalizedId = cleanText(entityId, 180);
  if (!normalizedType || !normalizedId) return false;
  const favorites = await readFavoritesRaw();
  const key = favoriteKey(normalizedType, normalizedId);
  const next = favorites.filter((favorite) => favoriteKey(favorite.entityType, favorite.entityId) !== key);
  if (next.length === favorites.length) return false;
  await writeFavorites(next);
  return true;
}

export async function toggleAdminFavorite(input: {
  entityType: unknown;
  entityId: unknown;
  label: unknown;
  href: unknown;
}) {
  const normalizedType = normalizeEntityType(input.entityType);
  const normalizedId = cleanText(input.entityId, 180);
  if (!normalizedType || !normalizedId) return null;
  const favorites = await readFavoritesRaw();
  const exists = favorites.some((favorite) => favorite.entityType === normalizedType && favorite.entityId === normalizedId);
  if (exists) {
    await removeAdminFavorite(normalizedType, normalizedId);
    return { favorited: false };
  }
  const favorite = await addAdminFavorite(input);
  return favorite ? { favorited: true, favorite } : null;
}

export function isAdminFavorite(favorites: AdminFavorite[], entityType: AdminFavoriteEntityType, entityId: string) {
  return favorites.some((favorite) => favorite.entityType === entityType && favorite.entityId === entityId);
}

export function groupAdminFavoritesByType(favorites: AdminFavorite[]) {
  return favorites.reduce((map, favorite) => {
    const current = map.get(favorite.entityType) || [];
    current.push(favorite);
    map.set(favorite.entityType, current);
    return map;
  }, new Map<AdminFavoriteEntityType, AdminFavorite[]>());
}
