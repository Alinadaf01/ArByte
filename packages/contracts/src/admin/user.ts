import { z } from "zod";
import {
  successResponseSchema,
  paginatedResponseSchema,
} from "../common/response";
import { PaginationQuerySchema } from "../common/pagination";
import { UserStatusSchema } from "../common/enums";
import { MobileSchema } from "../validators";

export const AdminUserSchema = z.object({
  id: z.string(),
  mobile: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  status: UserStatusSchema,
  roles: z.array(z.object({ id: z.string(), name: z.string() })),
  lastLoginAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export const AdminUserListQuerySchema = PaginationQuerySchema.extend({
  status: UserStatusSchema.optional(),
  q: z.string().optional(),
});
export const AdminUserListResponseSchema =
  paginatedResponseSchema(AdminUserSchema);
export const AdminUserDetailResponseSchema =
  successResponseSchema(AdminUserSchema);

export const CreateUserBodySchema = z.object({
  mobile: MobileSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
});
export const UpdateUserBodySchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: UserStatusSchema.optional(),
  roleIds: z.array(z.string()).optional(),
});
