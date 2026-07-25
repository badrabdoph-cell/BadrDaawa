export const DEFAULT_ORDER_TRIAL_DAYS = 3;
export const MIN_ORDER_TRIAL_DAYS = 1;
export const MAX_ORDER_TRIAL_DAYS = 10;

export function normalizeOrderTrialDays(value: unknown, fallback = DEFAULT_ORDER_TRIAL_DAYS) {
  const parsed = typeof value === "number" ? value : Number(value);
  const safeFallback = Number.isFinite(fallback) ? Math.trunc(fallback) : DEFAULT_ORDER_TRIAL_DAYS;
  if (!Number.isFinite(parsed)) return Math.min(MAX_ORDER_TRIAL_DAYS, Math.max(MIN_ORDER_TRIAL_DAYS, safeFallback));
  return Math.min(MAX_ORDER_TRIAL_DAYS, Math.max(MIN_ORDER_TRIAL_DAYS, Math.trunc(parsed)));
}

export function getTrialEndsAt(trialDays: unknown, now = new Date()) {
  return new Date(now.getTime() + normalizeOrderTrialDays(trialDays) * 24 * 60 * 60 * 1000);
}

export function buildTrialWindow(trialDays: unknown, now = new Date()) {
  const normalizedDays = normalizeOrderTrialDays(trialDays);
  return {
    trialDays: normalizedDays,
    trialEndsAt: getTrialEndsAt(normalizedDays, now),
  };
}
