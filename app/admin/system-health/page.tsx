import { getSystemHealthSnapshot } from "@/lib/system-health";
import { SystemHealthClient } from "@/components/SystemHealthClient";

export const dynamic = "force-dynamic";

export default async function SystemHealthPage() {
  const snapshot = await getSystemHealthSnapshot();
  return <SystemHealthClient initialSnapshot={snapshot} />;
}
