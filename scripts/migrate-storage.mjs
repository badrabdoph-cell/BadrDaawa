import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

const cwd = process.cwd();

const VOLUME_MOUNT_PATH = (
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.argv.find((a) => a.startsWith("--volume="))?.slice("--volume=".length) ||
  "/data/uploads"
);

const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("--dry");

const SOURCE_ROOTS = [
  { root: path.join(cwd, "public", "assets", "admin"), prefix: "assets/admin" },
  { root: path.join(cwd, "public", "uploads"), prefix: "" },
];

let totalCopied = 0;
let totalSkippedUpToDate = 0;
let totalSkippedSameSize = 0;
let totalErrors = 0;
let totalBytes = 0;
const errors = [];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

async function ensureDir(dir) {
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // exists
  }
}

async function walkDir(dir) {
  const entries = [];
  try {
    const dirents = await readdir(dir, { withFileTypes: true });
    for (const entry of dirents) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        entries.push(...(await walkDir(fullPath)));
      } else if (entry.isFile()) {
        entries.push(fullPath);
      }
    }
  } catch {
    // dir doesn't exist, skip
  }
  return entries;
}

function getSourceRelative(filePath, root) {
  return path.relative(root, filePath);
}

function getDestPath(relativePath, prefix) {
  const normalized = relativePath.split(path.sep).join("/");
  const destRelative = prefix ? `${prefix}/${normalized}` : normalized;
  return path.join(VOLUME_MOUNT_PATH, destRelative);
}

async function needsCopy(sourcePath, destPath) {
  try {
    const srcStat = await stat(sourcePath);
    let destStat;
    try {
      destStat = await stat(destPath);
    } catch {
      // dest doesn't exist, definitely needs copy
      return { needs: true, srcStat, destStat: null };
    }

    if (!srcStat.isFile()) return { needs: false };

    // Same size and same mtime → skip
    if (srcStat.size === destStat.size && Math.abs(srcStat.mtimeMs - destStat.mtimeMs) < 1000) {
      return { needs: false, skipReason: "identical", srcStat, destStat };
    }

    // Source older than dest → skip
    if (srcStat.mtimeMs <= destStat.mtimeMs) {
      return { needs: false, skipReason: "dest_newer", srcStat, destStat };
    }

    // Source is newer → copy
    return { needs: true, srcStat, destStat };
  } catch (error) {
    return { needs: false, error: error.message };
  }
}

async function copyFile(sourcePath, destPath) {
  await ensureDir(path.dirname(destPath));
  await pipeline(createReadStream(sourcePath), createWriteStream(destPath));
}

async function verifyFile(destPath) {
  try {
    const st = await stat(destPath);
    return st.isFile();
  } catch {
    return false;
  }
}

async function migrate() {
  const startTime = Date.now();

  console.log("══════════════════════════════════════════════");
  console.log("  Storage Migration Script");
  console.log("══════════════════════════════════════════════");
  console.log();
  console.log(`  Volume path: ${VOLUME_MOUNT_PATH}`);
  console.log(`  Dry run:     ${DRY_RUN ? "YES (no files will be written)" : "NO"}`);
  console.log();

  for (const sourceRoot of SOURCE_ROOTS) {
    console.log(`  ── Scanning: ${sourceRoot.root}`);
    const files = await walkDir(sourceRoot.root);
    console.log(`     Found: ${files.length} file(s)\n`);

    for (const filePath of files) {
      const relativePath = getSourceRelative(filePath, sourceRoot.root);
      const destPath = getDestPath(relativePath, sourceRoot.prefix);
      const destRelative = path.relative(VOLUME_MOUNT_PATH, destPath);

      const result = await needsCopy(filePath, destPath);

      if (result.error) {
        totalErrors++;
        errors.push({ file: relativePath, error: result.error });
        console.log(`  ⚠  ERROR  ${relativePath}`);
        console.log(`             ${result.error}`);
        continue;
      }

      if (!result.needs) {
        if (result.skipReason === "identical") {
          totalSkippedSameSize++;
        } else {
          totalSkippedUpToDate++;
        }
        console.log(`  SKIP     ${relativePath}  →  ${destRelative}`);
        continue;
      }

      const size = result.srcStat.size;
      totalBytes += size;

      if (DRY_RUN) {
        console.log(`  COPY     ${relativePath}  (${formatBytes(size)})  →  ${destRelative}`);
        totalCopied++;
        continue;
      }

      try {
        await copyFile(filePath, destPath);
        const verified = await verifyFile(destPath);
        if (verified) {
          totalCopied++;
          console.log(`  ✅  DONE  ${relativePath}  (${formatBytes(size)})  →  ${destRelative}`);
        } else {
          totalErrors++;
          errors.push({ file: relativePath, error: "File not found after copy" });
          console.log(`  ⚠  ERROR  ${relativePath}  →  written but verification failed`);
        }
      } catch (error) {
        totalErrors++;
        errors.push({ file: relativePath, error: error.message });
        console.log(`  ⚠  ERROR  ${relativePath}  →  ${error.message}`);
      }
    }
  }

  // ── Verification pass ──
  if (!DRY_RUN) {
    console.log();
    console.log("  ── Verification: checking all copied files are readable ──");
    let verifiedCount = 0;
    let verifyErrors = 0;

    for (const sourceRoot of SOURCE_ROOTS) {
      const files = await walkDir(sourceRoot.root);
      for (const filePath of files) {
        const relativePath = getSourceRelative(filePath, sourceRoot.root);
        const destPath = getDestPath(relativePath, sourceRoot.prefix);
        const ok = await verifyFile(destPath);
        if (ok) {
          verifiedCount++;
        } else {
          verifyErrors++;
          console.log(`  ⚠  VERIFY FAILED  ${relativePath}`);
        }
      }
    }

    console.log(`     Verified: ${verifiedCount} file(s) readable`);
    if (verifyErrors > 0) {
      console.log(`     Failed:   ${verifyErrors} file(s) NOT found`);
    }
  }

  // ── Summary ──
  const duration = Date.now() - startTime;
  console.log();
  console.log("══════════════════════════════════════════════");
  console.log("  Migration Summary");
  console.log("══════════════════════════════════════════════");
  console.log();
  console.log(`  Copied:           ${totalCopied} file(s)`);
  console.log(`  Total size:       ${formatBytes(totalBytes)}`);
  console.log(`  Skipped (same):   ${totalSkippedSameSize} file(s)`);
  console.log(`  Skipped (newer):  ${totalSkippedUpToDate} file(s)`);
  console.log(`  Errors:           ${totalErrors}`);
  console.log(`  Duration:         ${formatDuration(duration)}`);
  console.log();

  if (errors.length > 0) {
    console.log("  Errors Detail:");
    for (const err of errors) {
      console.log(`    - ${err.file}: ${err.error}`);
    }
    console.log();
  }

  console.log(`  Volume path: ${VOLUME_MOUNT_PATH}`);

  const sourceRootsSummary = SOURCE_ROOTS
    .filter((sr) => sr.root)
    .map((sr) => `    ${sr.root}  →  ${path.join(VOLUME_MOUNT_PATH, sr.prefix)}`);

  console.log("  Mapping:");
  for (const line of sourceRootsSummary) {
    console.log(line);
  }

  console.log();
  console.log("  To activate the new storage, set in Railway:");
  console.log("    STORAGE_PROVIDER=railway-volume");
  console.log("    RAILWAY_VOLUME_MOUNT_PATH=/data/uploads");
  console.log();
  console.log("  Done.");
}

migrate().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
