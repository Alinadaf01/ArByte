import { dictionary } from "./dictionary";

export interface PageMeta {
  title: string;
  subtitle: string;
}

export const DEFAULT_PAGE_META: PageMeta = {
  title: dictionary.dashboard.title,
  subtitle: dictionary.dashboard.subtitle,
};

const pageMetaByPath: Record<string, PageMeta> = {
  "/": DEFAULT_PAGE_META,
  "/settings": {
    title: dictionary.settings.title,
    subtitle: dictionary.settings.subtitle,
  },
  "/categories": {
    title: dictionary.categories.title,
    subtitle: dictionary.categories.subtitle,
  },
  "/brands": {
    title: dictionary.brands.title,
    subtitle: dictionary.brands.subtitle,
  },
  "/specifications": {
    title: dictionary.specifications.title,
    subtitle: dictionary.specifications.subtitle,
  },
};

export function getPageMeta(pathname: string): PageMeta {
  return pageMetaByPath[pathname] ?? DEFAULT_PAGE_META;
}
