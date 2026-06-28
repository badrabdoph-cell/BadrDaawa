export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkAndRunAutoBackup } = await import("./lib/auto-backup");
    await checkAndRunAutoBackup().catch((error) => {
      console.error("[Instrumentation] auto-backup error:", error);
    });
  }
}
