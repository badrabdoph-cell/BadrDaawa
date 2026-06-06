export function getAdminUsernames() {
  return [process.env.ADMIN_USERNAME, process.env.ADMIN_EMAIL, process.env.NODE_ENV === "production" ? undefined : "admin"].filter(
    (value): value is string => Boolean(value),
  );
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin12345");
}

export function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-admin-local";
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminUsernames().length && getAdminPassword());
}

export function getClientSessionSecret() {
  return process.env.CLIENT_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-client-local";
}
