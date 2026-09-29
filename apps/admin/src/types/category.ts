export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  parent: number | null;
  order: number;
  isActive: boolean;
}

export interface CategoryFormValues {
  slug: string;
  name: string;
  description: string;
  parent: number | null;
  order: number;
  isActive: boolean;
}
