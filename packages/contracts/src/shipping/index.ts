import { z } from "zod";
import { successResponseSchema } from "../common/response";

/**
 * روش ارسال — E-02 §۳/۴. عمومی (بدون نیاز به ورود)؛ `GET /cart` هم از همان
 * منبع cost/freeAboveAmount برای محاسبه‌ی shippingCost می‌خواند
 * (apps/public_api/cart_service.py's to_cart_response()) — فرانت هرگز این
 * محاسبه را خودش تکرار نمی‌کند (قانون ۴).
 */
export const ShippingMethodSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** برخلاف اکثر مبلغ‌های پول (`MoneyAmountSchema`، همیشه مثبت)، اینجا صفر
   * هم معتبر است — یعنی «رایگان» (مثلاً «تحویل حضوری»). */
  cost: z.number().int().nonnegative(),
  freeAboveAmount: z.number().int().positive().nullable(),
  estimatedDays: z.string(),
});
export type ShippingMethod = z.infer<typeof ShippingMethodSchema>;

// GET /shipping-methods
export const ShippingMethodListResponseSchema = successResponseSchema(
  z.array(ShippingMethodSchema),
);
