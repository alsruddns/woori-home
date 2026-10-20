import { notFound } from "next/navigation";
import { isLocale } from "@/lib/site";
import { PlatformLayout } from "../platform-layout";
import "../platform.css";

export default async function DataPlatformLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <PlatformLayout locale={locale}>{children}</PlatformLayout>;
}
