import { AdminSearchClient } from "@/components/AdminSearchClient";
import { getGlobalAdminSearchResults } from "@/lib/admin-search";

export const dynamic = "force-dynamic";

type SearchPageParams = {
  q?: string;
};

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageParams>;
}) {
  const params = await searchParams;
  const query = (params.q || "").trim();
  const results = await getGlobalAdminSearchResults(query);

  return <AdminSearchClient initialQuery={query} initialResults={results} />;
}
