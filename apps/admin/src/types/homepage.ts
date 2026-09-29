export interface HeroSectionData {
  image: string | null;
  imageMobile: string | null;
  imageAlt: string;
  title: string;
  subtitle: string;
  caption: string;
  ctaLabel: string;
  ctaUrl: string;
  isActive: boolean;
}

export interface HeroFormValues {
  imageAlt: string;
  title: string;
  subtitle: string;
  caption: string;
  ctaLabel: string;
  ctaUrl: string;
  isActive: boolean;
}

export interface ShowcaseSpec {
  label: string;
  value: string;
}

export interface ShowcaseProductDetail {
  id: string;
  name: string;
  sku: string;
  slug: string;
  isActive: boolean;
  thumbnail: string;
}

export interface HomeShowcaseData {
  id: string;
  order: number;
  product: string | null;
  productDetail: ShowcaseProductDetail | null;
  image: string | null;
  imageAlt: string;
  title: string;
  description: string;
  specs: ShowcaseSpec[];
  ctaLabel: string;
  ctaUrl: string;
  theme: "light" | "dark";
  isActive: boolean;
  resolvedImage: string;
  resolvedTitle: string;
  resolvedCtaUrl: string;
}

export interface ShowcaseFormValues {
  order: number;
  product: string | null;
  imageAlt: string;
  title: string;
  description: string;
  specs: ShowcaseSpec[];
  ctaLabel: string;
  ctaUrl: string;
  theme: "light" | "dark";
  isActive: boolean;
}

export interface CommunityTileData {
  id: string;
  order: number;
  image: string | null;
  imageAlt: string;
  linkUrl: string;
  isActive: boolean;
}
