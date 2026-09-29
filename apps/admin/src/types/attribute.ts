export type AttributeInputType = "select" | "text" | "number" | "boolean";

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  unit: string;
  inputType: AttributeInputType;
  categories: number[];
  isRequired: boolean;
  order: number;
}

export interface AttributeFormValues {
  name: string;
  slug: string;
  unit: string;
  inputType: AttributeInputType;
  categories: number[];
  isRequired: boolean;
  order: number;
}

export interface AttributeValue {
  id: string;
  value: string;
  order: number;
}
