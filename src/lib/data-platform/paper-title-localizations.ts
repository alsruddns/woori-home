import type { Locale } from "@/lib/site";
import curatedTitles from "@/data/paper-title-localizations.json";

export type PaperTitleRecord = {
  id: string;
  doi: string;
  title: string;
  originalTitle?: string;
  originalLanguage?: string;
  localizedTitles?: Partial<Record<Locale, string>>;
  translationStatus?: "draft" | "pending";
  translationMethod?: "development-draft" | "pending";
  translationUpdatedAt?: string | null;
};

export const paperTitleLocalizations = curatedTitles as Record<string, Record<Locale, string>>;

export function paperLocalizedTitle(paper: PaperTitleRecord, locale: Locale) {
  return paper.localizedTitles?.[locale]?.trim() || paper.originalTitle?.trim() || paper.title;
}

export function hasPaperTitleTranslation(paper: PaperTitleRecord, locale: Locale) {
  return Boolean(paper.localizedTitles?.[locale]?.trim());
}
