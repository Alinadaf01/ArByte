import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/json-ld";

/**
 * G-02 — صفحه‌های خصوصی/تراکنشی و URLهای فیلتر/مرتب‌سازی (محتوای تکراری)
 * بسته‌اند؛ خود صفحه‌ها هم `noindex` دارند (دو لایه).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/cart",
          "/checkout",
          "/account",
          "/orders",
          "/login",
          "/wishlist",
          "/compare",
          "/track-order",
          "/search",
          "/impersonate",
          "/api/",
          // فیلترهای فهرست (ShopProductGrid): ترکیب‌های بی‌نهایت از یک صفحه.
          "/*?*sort=",
          "/*?*brand=",
          "/*?*maxPrice=",
          "/*?*inStock=",
          "/*?*spec",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
