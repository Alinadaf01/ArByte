export type ProductionStatus = "in_stock" | "made_to_order" | "discontinued";

export interface ProductImage {
  id: string;
  image: string;
  alt: string;
  order: number;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  inStock: boolean;
  order: number;
}

export interface ProductSpec {
  label: string;
  value: string;
  unit: string | null;
}

export interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  costPrice: number | null;
  category: number;
  images: ProductImage[];
  colors: ColorOption[];
  material: string;
  dimensions: { w: number; h: number; d: number };
  weight: number;
  stockCount: number;
  inStock: boolean;
  order: number;
  isActive: boolean;
  shippingTime: string;
  warrantyTerms: string;
  productionStatus: ProductionStatus;
  metaTitle: string;
  metaDescription: string;
  specs: ProductSpec[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormValues {
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  price: number;
  costPrice: number | null;
  category: number | null;
  material: string;
  dimensions: { w: number; h: number; d: number };
  weight: number;
  order: number;
  isActive: boolean;
  shippingTime: string;
  warrantyTerms: string;
  productionStatus: ProductionStatus;
  metaTitle: string;
  metaDescription: string;
}

export interface ProductSpecEntry {
  attributeId: number;
  valueOptionId?: number | null;
  valueText?: string | null;
}

export interface ProductSpecRow {
  id: number;
  attributeId: number;
  valueOptionId: number | null;
  valueText: string | null;
}
