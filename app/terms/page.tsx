import type { Metadata } from "next";
import { LegalPageView } from "@/components/LegalPageView";
import { getLegalPage } from "@/lib/legal-pages";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLegalPage("terms");
  return { title: page.title, description: page.description };
}

export default async function TermsPage() {
  return <LegalPageView page={await getLegalPage("terms")} />;
}
