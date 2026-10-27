type SidebarCategory = { id: string; path: string };

export function isSidebarCategoryActive(pathname: string, locale: string, category: SidebarCategory): boolean {
  const localizedHome = `/${locale}`;
  const hrefs = [`${localizedHome}${category.path}`, ...(category.id === "finance" ? [`${localizedHome}/markets`] : [])];

  if (category.id === "finance" && pathname === localizedHome) return true;
  return hrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}
