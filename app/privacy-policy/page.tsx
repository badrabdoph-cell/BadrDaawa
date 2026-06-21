import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getPublishedLegalPages } from "@/lib/legal-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pages = await getPublishedLegalPages();
  const page = pages["privacy-policy"];
  return { title: page.title, description: page.description };
}

export default async function PrivacyPolicyPage() {
  const pages = await getPublishedLegalPages();
  return <LegalPageView page={pages["privacy-policy"]} />;
}
