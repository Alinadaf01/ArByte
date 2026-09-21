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
};

export function getPageMeta(pathname: string): PageMeta {
  return pageMetaByPath[pathname] ?? DEFAULT_PAGE_META;
}
