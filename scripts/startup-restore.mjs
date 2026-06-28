import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

async function main() {
  const root = process.cwd();
  const tsxBin = path.join(root, "node_modules", ".bin", "tsx");

  if (!existsSync(tsxBin)) {
    console.warn("[startup-restore] tsx not found — skipping auto-restore");
    return;
  }

  const secretsFile = path.join(root, "data", ".secrets.env");
  const secrets = {};
  if (existsSync(secretsFile)) {
    const lines = readFileSync(secretsFile, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      const idx = line.indexOf("=");
      if (idx !== -1) secrets[line.slice(0, idx)] = line.slice(idx + 1);
    }
  }

  const result = spawnSync(tsxBin, [path.join(root, "lib", "startup-restore.ts")], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...secrets },
    timeout: 180000,
  });

  if (result.status === 0) {
    console.log("[startup-restore] Completed successfully");
  } else if (result.status === 1) {
    console.warn(`[startup-restore] Exited with code ${result.status} (non-fatal)`);
  } else {
    console.warn(`[startup-restore] Exited with code ${result.status || "signal"} (non-fatal)`);
  }
}

main().catch((err) => {
  console.warn(`[startup-restore] Unhandled error (non-fatal): ${err.message}`);
});
