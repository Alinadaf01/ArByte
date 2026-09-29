import { z } from "zod";

export const createUserFormSchema = z
  .object({
    phone: z
      .string()
      .regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09123456789)."),
    firstName: z.string(),
    lastName: z.string(),
    email: z.union([z.literal(""), z.string().email("ایمیل معتبر نیست.")]),
    isVerified: z.boolean(),
    isStaff: z.boolean(),
    roleId: z.string().nullable(),
  })
  // §7.5: role selection is mandatory when creating a staff user.
  .refine((data) => !data.isStaff || !!data.roleId, {
    message: "انتخاب نقش الزامی است.",
    path: ["roleId"],
  });

export type CreateUserFormSchemaValues = z.infer<typeof createUserFormSchema>;

export const updateUserFormSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.union([z.literal(""), z.string().email("ایمیل معتبر نیست.")]),
    isVerified: z.boolean(),
    isActive: z.boolean(),
    isStaff: z.boolean(),
    roleId: z.string().nullable(),
  })
  .refine((data) => !data.isStaff || !!data.roleId, {
    message: "انتخاب نقش الزامی است.",
    path: ["roleId"],
  });

export type UpdateUserFormSchemaValues = z.infer<typeof updateUserFormSchema>;
