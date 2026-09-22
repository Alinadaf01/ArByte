import { z } from "zod";
import { successResponseSchema } from "../common/response";

export const PermissionSchema = z.object({
  id: z.string(),
  key: z.string(),
  description: z.string().nullable(),
});
export const PermissionListResponseSchema = successResponseSchema(
  z.array(PermissionSchema),
);

export const AdminRoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  permissions: z.array(z.string()), // permission keys
});
export const AdminRoleListResponseSchema = successResponseSchema(
  z.array(AdminRoleSchema),
);
export const AdminRoleDetailResponseSchema =
  successResponseSchema(AdminRoleSchema);

export const CreateRoleBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissionKeys: z.array(z.string()).default([]),
});
export const UpdateRoleBodySchema = CreateRoleBodySchema.partial().extend({
  isActive: z.boolean().optional(),
});
