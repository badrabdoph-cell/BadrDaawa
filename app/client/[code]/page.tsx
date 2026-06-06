import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function LegacyClientDashboard({ params }: PageProps) {
  const { code } = await params;
  redirect(`/${code}/ad_3399`);
}
