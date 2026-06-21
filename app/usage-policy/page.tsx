import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getPublishedLegalPages } from "@/lib/legal-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pages = await getPublishedLegalPages();
  const page = pages["usage-policy"];
  return { title: page.title, description: page.description };
}

export default async function UsagePolicyPage() {
  const pages = await getPublishedLegalPages();
  return <LegalPageView page={pages["usage-policy"]} />;
}
