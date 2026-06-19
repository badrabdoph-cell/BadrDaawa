import { unstable_noStore as noStore } from "next/cache";
import { collectAllTextEntries, buildContentTextGroups } from "@/lib/content-text-registry";
import { AdminTextsClient } from "@/components/AdminTextsClient";

export const dynamic = "force-dynamic";

export default async function AdminTextsPage() {
  noStore();
  const entries = await collectAllTextEntries();
  const groups = buildContentTextGroups(entries);

  return <AdminTextsClient entries={entries} groups={Array.from(groups.entries()).map(([source, items]) => ({ source, items }))} />;
}
