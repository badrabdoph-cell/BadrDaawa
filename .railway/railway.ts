import { defineRailway, project, service, postgres } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const web = service("web", {
    start: "pnpm start",
    healthcheck: "/api/health",
    healthcheckTimeout: 300,
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      NEXT_PUBLIC_SITE_URL: "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      GITHUB_SYNC_ENABLED: "true",
      GITHUB_SYNC_BRANCH: "main",
      AUTO_RESTORE_FROM_GITHUB: "true",
      AUTO_RESTORE_ONLY_IF_DB_EMPTY: "true",
      ALLOW_DESTRUCTIVE_RESTORE: "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL",
      NODE_ENV: "production",
      PORT: "8080",
    },
  });

  return project("badr-daawa", {
    resources: [db, web],
  });
});
