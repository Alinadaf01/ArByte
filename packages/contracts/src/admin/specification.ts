import { z } from "zod";
import { successResponseSchema } from "../common/response";
import { SpecificationTypeSchema } from "../common/enums";

export const AdminSpecificationValueSchema = z.object({
  id: z.string(),
  value: z.string(),
  swatchHex: z.string().nullable(),
  sortOrder: z.number().int(),
});

export const AdminSpecificationDefinitionSchema = z.object({
  id: z.string(),
  key: z.string(),
  nameFa: z.string(),
  type: SpecificationTypeSchema,
  unit: z.string().nullable(),
  categoryId: z.string().nullable(),
  isRequired: z.boolean(),
  isFilterable: z.boolean(),
  isSearchable: z.boolean(),
  isVariantAxis: z.boolean(),
  sortOrder: z.number().int(),
  values: z.array(AdminSpecificationValueSchema),
});

export const AdminSpecificationListResponseSchema = successResponseSchema(
  z.array(AdminSpecificationDefinitionSchema),
);

export const CreateSpecificationDefinitionBodySchema = z.object({
  key: z.string().min(1),
  nameFa: z.string().min(1),
  type: SpecificationTypeSchema,
  unit: z.string().optional(),
  categoryId: z.string().optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  isVariantAxis: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export const UpdateSpecificationDefinitionBodySchema =
  CreateSpecificationDefinitionBodySchema.partial();

export const CreateSpecificationValueBodySchema = z.object({
  value: z.string().min(1),
  /** فقط برای مشخصات نوع COLOR (سند مقایسه‌ی وایب‌شاپ). */
  swatchHex: z.string().optional(),
  sortOrder: z.number().int().default(0),
});
