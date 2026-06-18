import { getErrorEvents } from "@/lib/error-tracking";
import { AdminErrorLogClient } from "@/components/AdminErrorLogClient";

export const dynamic = "force-dynamic";

type ErrorsPageParams = {
  q?: string;
  route?: string;
  user?: string;
};

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<ErrorsPageParams>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const route = (params.route || "").trim();
  const user = (params.user || "").trim();
  const events = await getErrorEvents({ q, route, user });

  return <AdminErrorLogClient events={events} q={q} route={route} user={user} />;
}
