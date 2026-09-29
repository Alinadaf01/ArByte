import { z } from "zod";

export const staffLoginSchema = z.object({
  phone: z
    .string()
    .regex(/^09\d{9}$/, "شماره موبایل باید به‌صورت ۰۹xxxxxxxxx باشد."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});
export type StaffLoginValues = z.infer<typeof staffLoginSchema>;
