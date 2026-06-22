import { defineRailway, project, service, postgres } from "railway/iac";

export default defineRailway((ctx) => {
  const db = postgres("postgres");
  const domain = "https://${{RAILWAY_PUBLIC_DOMAIN}}";

  const web = service("web", {
    start: "pnpm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: domain,
      NEXTAUTH_URL: domain,
      APP_URL: domain,

      GITHUB_SYNC_ENABLED: "true",
      GITHUB_SYNC_BRANCH: "main",
      GITHUB_SYNC_REPO: "badrabdoph-cell/BadrDaawa",

      AUTO_RESTORE_FROM_GITHUB: "true",

      BACKUP_CRON_URL: domain,

      SHOW_PHOTOGRAPHER_CARD: "true",
      ENABLE_LEGACY_FILE_STORE: "false",
      NODE_ENV: "production",
      PORT: "8080",
    },
  });

  return project("badr-daawa", {
    resources: [db, web],
  });
});
