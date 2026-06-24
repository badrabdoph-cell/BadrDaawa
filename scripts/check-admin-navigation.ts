import fs from "node:fs";
import path from "node:path";
import {
  adminSections,
  allAdminLinks,
  findActiveAdminLink,
  mobilePrimaryLinks,
  shortcutHrefByKey,
} from "../lib/admin-navigation";

const adminRoot = path.join(process.cwd(), "app", "admin");
const excludedPageRoutes = new Set([
  "/admin/login",
  "/admin/backups/v2",
]);

function collectPageRoutes(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectPageRoutes(entryPath);
    if (entry.name !== "page.tsx") return [];

    const relativeDir = path.relative(adminRoot, dir);
    if (!relativeDir) return ["/admin"];
    if (relativeDir.split(path.sep).some((segment) => segment.startsWith("["))) return [];
    return [`/admin/${relativeDir.split(path.sep).join("/")}`];
  });
}

const pageRoutes = collectPageRoutes(adminRoot)
  .filter((route) => !excludedPageRoutes.has(route))
  .sort();
const linkedRoutes = new Set(allAdminLinks.map((link) => link.href));
const missingRoutes = pageRoutes.filter((route) => !linkedRoutes.has(route));
const duplicateRoutes = allAdminLinks
  .map((link) => link.href)
  .filter((href, index, hrefs) => hrefs.indexOf(href) !== index);
const shortcutTargets = Object.values(shortcutHrefByKey);
const missingShortcutTargets = shortcutTargets.filter((href) => !linkedRoutes.has(href));

if (missingRoutes.length) {
  throw new Error(`Admin navigation is missing routes:\n${missingRoutes.join("\n")}`);
}

if (duplicateRoutes.length) {
  throw new Error(`Admin navigation has duplicate links:\n${Array.from(new Set(duplicateRoutes)).join("\n")}`);
}

if (mobilePrimaryLinks.length > 5) {
  throw new Error(`Mobile primary navigation must leave one slot for More; found ${mobilePrimaryLinks.length} primary links.`);
}

if (missingShortcutTargets.length) {
  throw new Error(`Shortcut targets are not present in admin navigation:\n${missingShortcutTargets.join("\n")}`);
}

if (findActiveAdminLink("/admin/cleanup/database")?.href !== "/admin/cleanup/database") {
  throw new Error("Nested admin routes must select the deepest matching navigation link.");
}

if (adminSections.length < 6) {
  throw new Error("Admin navigation should remain grouped into operational sections.");
}

console.log(`Admin navigation covers ${pageRoutes.length} page routes across ${adminSections.length} sections.`);
