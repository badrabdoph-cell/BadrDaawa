export function getAdminUsernames() {
  return [process.env.ADMIN_USERNAME, process.env.ADMIN_USER, process.env.ADMIN_EMAIL, process.env.NODE_ENV === "production" ? undefined : "admin"].filter(
    (value): value is string => Boolean(value),
  );
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || (process.env.NODE_ENV === "production" ? "" : "admin12345");
}

export function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASS_HASH || "";
}

export function getAdminSessionSecret() {
  const configuredSecret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (configuredSecret) return configuredSecret;
  return process.env.NODE_ENV === "production" ? "" : "badrdaawa-admin-local-secret";
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminUsernames().length && (getAdminPassword() || getAdminPasswordHash()) && getAdminSessionSecret().length >= 16);
}

export function getClientSessionSecret() {
  return process.env.CLIENT_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-client-local";
}
