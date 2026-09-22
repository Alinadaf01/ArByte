import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { z } from "zod";
import {
  ApiErrorSchema,
  CartResponseSchema,
  AddCartItemBodySchema,
  CreateOrderBodySchema,
  CreateOrderResponseSchema,
  OrderListResponseSchema,
  OrderDetailResponseSchema,
  OtpRequestBodySchema,
  OtpRequestResponseSchema,
  OtpVerifyBodySchema,
  OtpVerifyResponseSchema,
  MeResponseSchema,
  ProductDetailResponseSchema,
  ProductListQuerySchema,
  ProductListResponseSchema,
  ProfileResponseSchema,
  UpdateProfileBodySchema,
  AddressListResponseSchema,
  CreateAddressBodySchema,
  WishlistResponseSchema,
  HomepageResponseSchema,
  InitiatePaymentResponseSchema,
  PaymentCallbackBodySchema,
  PaymentCallbackResponseSchema,
  AdminProductListResponseSchema,
  AdminProductDetailResponseSchema,
  CreateProductBodySchema,
  AdminOrderListResponseSchema,
  UpdateOrderStatusBodySchema,
  AdminHomepageBlockListResponseSchema,
  CreateHomepageBlockBodySchema,
  IssueImpersonationTicketResponseSchema,
  ImpersonateExchangeBodySchema,
  ImpersonateExchangeResponseSchema,
} from "@arbyte/contracts";

/**
 * Swagger از همان اسکیماهای Zod تولید می‌شود (T-004 §۷، بند ۱۲.۱۵) — نه از
 * `@ApiProperty()` دستی روی DTOها. `extendZodWithOpenApi` باید قبل از هر
 * `.openapi()` صدا زده شود؛ چون schemaهای `@arbyte/contracts` خودشان
 * `.openapi()` صدا نمی‌زنند (آن پکیج نباید به این کتابخانه وابسته شود —
 * apps/web/admin هم از @arbyte/contracts استفاده می‌کنند و OpenAPI لازم
 * ندارند)، این ثبت‌نام کاملاً در apps/api انجام می‌شود.
 *
 * ⚠️ محدوده: این تسک (T-004) فقط قرارداد است، نه پیاده‌سازی endpoint. یک
 * مسیر نماینده از هر دامنه اینجا ثبت شده تا خط‌لوله‌ی Zod→OpenAPI روی
 * شکل‌های واقعی (union تفکیک‌شده، schema بازگشتی با z.lazy، تودرتو) تست
 * شود؛ وقتی T-004-next هر endpoint را واقعاً پیاده می‌کند، ثبت‌نام کامل
 * طبیعتاً همراهش کنار هر Controller اضافه می‌شود.
 */
extendZodWithOpenApi(z);

export function buildOpenApiDocument(): OpenAPIObject {
  const registry = new OpenAPIRegistry();

  const errorResponse = {
    description: "خطا (بند ۸.۹۳)",
    content: { "application/json": { schema: ApiErrorSchema } },
  };

  // ---------- auth ----------
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/otp/request",
    tags: ["auth"],
    summary: "درخواست کد OTP",
    request: {
      body: {
        content: { "application/json": { schema: OtpRequestBodySchema } },
      },
    },
    responses: {
      200: {
        description: "OTP ارسال شد",
        content: { "application/json": { schema: OtpRequestResponseSchema } },
      },
      400: errorResponse,
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/otp/verify",
    tags: ["auth"],
    summary: "تأیید OTP و ورود",
    request: {
      body: {
        content: { "application/json": { schema: OtpVerifyBodySchema } },
      },
    },
    responses: {
      200: {
        description: "ورود موفق",
        content: { "application/json": { schema: OtpVerifyResponseSchema } },
      },
      400: errorResponse,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/auth/me",
    tags: ["auth"],
    summary: "اطلاعات کاربر جاری",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "کاربر جاری",
        content: { "application/json": { schema: MeResponseSchema } },
      },
      401: errorResponse,
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/impersonate/exchange",
    tags: ["auth"],
    summary: "تبدیل بلیت جعل‌هویت به سشن محدود (الحاقیه §۶)",
    request: {
      body: {
        content: {
          "application/json": { schema: ImpersonateExchangeBodySchema },
        },
      },
    },
    responses: {
      200: {
        description: "سشن جعل‌هویت صادر شد",
        content: {
          "application/json": { schema: ImpersonateExchangeResponseSchema },
        },
      },
      400: errorResponse,
    },
  });

  // ---------- catalog (عمومی) ----------
  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/products",
    tags: ["catalog"],
    summary:
      "فهرست محصولات (کارت با defaultVariant/hasMultipleVariants — الحاقیه §۲)",
    request: { query: ProductListQuerySchema },
    responses: {
      200: {
        description: "فهرست صفحه‌بندی‌شده",
        content: { "application/json": { schema: ProductListResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/catalog/products/{slug}",
    tags: ["catalog"],
    summary: "جزئیات محصول (واریانت‌ها/label ساخته‌شده‌ی سرور — الحاقیه §۱)",
    request: { params: z.object({ slug: z.string() }) },
    responses: {
      200: {
        description: "محصول",
        content: {
          "application/json": { schema: ProductDetailResponseSchema },
        },
      },
      404: errorResponse,
    },
  });
  // `GET /catalog/categories` عمداً اینجا ثبت *نشده*: پاسخش
  // (`CategoryTreeResponseSchema`) از `z.lazy` برای بازگشتی‌بودن استفاده
  // می‌کند (دسته می‌تواند فرزند داشته باشد که خودش دسته‌ست، §۸.۱۸/تصمیم ه
  // در T-003) — این کتابخانه (zod-to-openapi v7) خودارجاعی z.lazy را حتی
  // با `.openapi()` صریح حل نمی‌کند («Unknown zod object type»؛ محدودیت
  // شناخته‌شده‌ی ابزارهای Zod→OpenAPI برای schemaهای بازگشتی عمومی، نه
  // باگ این پروژه). خودِ Zod schema در packages/contracts کاملاً درست و
  // کاملاً بازگشتی می‌ماند — فقط نمایش این یک اندپوینت در Swagger UI به
  // پیاده‌سازی واقعی (T-004-next) موکول شده. جزئیات در docs/api/README.md.

  // ---------- cart ----------
  registry.registerPath({
    method: "get",
    path: "/api/v1/cart",
    tags: ["cart"],
    summary: "سبد خرید جاری",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "سبد خرید",
        content: { "application/json": { schema: CartResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/cart/items",
    tags: ["cart"],
    summary: "افزودن به سبد (§۸.۵۵ — بدون قیمت در بدنه)",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: AddCartItemBodySchema } },
      },
    },
    responses: {
      200: {
        description: "سبد به‌روزشده",
        content: { "application/json": { schema: CartResponseSchema } },
      },
      409: errorResponse,
    },
  });

  // ---------- order ----------
  registry.registerPath({
    method: "post",
    path: "/api/v1/orders",
    tags: ["order"],
    summary: "ثبت سفارش (PRICE_CHANGED اگر قیمت عوض شده باشد — T-004 §۲)",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateOrderBodySchema } },
      },
    },
    responses: {
      201: {
        description: "سفارش ثبت شد",
        content: { "application/json": { schema: CreateOrderResponseSchema } },
      },
      409: errorResponse,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/orders",
    tags: ["order"],
    summary: "فهرست سفارش‌های کاربر",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "فهرست سفارش‌ها",
        content: { "application/json": { schema: OrderListResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/orders/{orderNumber}",
    tags: ["order"],
    summary: "جزئیات سفارش",
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ orderNumber: z.string() }) },
    responses: {
      200: {
        description: "سفارش",
        content: { "application/json": { schema: OrderDetailResponseSchema } },
      },
      404: errorResponse,
    },
  });

  // ---------- account ----------
  registry.registerPath({
    method: "get",
    path: "/api/v1/account/profile",
    tags: ["account"],
    summary: "پروفایل کاربر",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "پروفایل",
        content: { "application/json": { schema: ProfileResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/account/profile",
    tags: ["account"],
    summary: "ویرایش پروفایل (سشن جعل‌هویت مسدود — الحاقیه §۶)",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: UpdateProfileBodySchema } },
      },
    },
    responses: {
      200: {
        description: "پروفایل به‌روزشده",
        content: { "application/json": { schema: ProfileResponseSchema } },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/account/addresses",
    tags: ["account"],
    summary: "فهرست آدرس‌ها",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "آدرس‌ها",
        content: { "application/json": { schema: AddressListResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/account/addresses",
    tags: ["account"],
    summary: "افزودن آدرس",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateAddressBodySchema } },
      },
    },
    responses: {
      201: {
        description: "آدرس ساخته شد",
        content: { "application/json": { schema: AddressListResponseSchema } },
      },
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/account/wishlist",
    tags: ["account"],
    summary: "علاقه‌مندی‌ها",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "فهرست علاقه‌مندی",
        content: { "application/json": { schema: WishlistResponseSchema } },
      },
    },
  });

  // ---------- content ----------
  registry.registerPath({
    method: "get",
    path: "/api/v1/content/homepage",
    tags: ["content"],
    summary: "محتوای صفحه‌ی اصلی — حل‌شده، نه ارجاع (الحاقیه §۸)",
    responses: {
      200: {
        description: "بلوک‌های صفحه‌ی اصلی",
        content: { "application/json": { schema: HomepageResponseSchema } },
      },
    },
  });

  // ---------- payment (درگاه — فقط شکل) ----------
  registry.registerPath({
    method: "post",
    path: "/api/v1/orders/{orderNumber}/payment/initiate",
    tags: ["payment"],
    summary: "شروع پرداخت از درگاه (الحاقیه §۷ — فقط شکل، بدون منطق)",
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ orderNumber: z.string() }) },
    responses: {
      200: {
        description: "redirectUrl درگاه",
        content: {
          "application/json": { schema: InitiatePaymentResponseSchema },
        },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/callback/{provider}",
    tags: ["payment"],
    summary: "وب‌هوک درگاه — تنها منبع تأیید پرداخت (نه بازگشت مرورگر)",
    request: {
      params: z.object({ provider: z.string() }),
      body: {
        content: { "application/json": { schema: PaymentCallbackBodySchema } },
      },
    },
    responses: {
      200: {
        description: "دریافت شد",
        content: {
          "application/json": { schema: PaymentCallbackResponseSchema },
        },
      },
    },
  });

  // ---------- admin ----------
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/products",
    tags: ["admin:products"],
    summary:
      "فهرست محصولات — نمای ادمین (شامل supplierPrice/profit، هرگز عمومی)",
    security: [{ bearerAuth: [] }],
    request: {
      query: z.object({
        page: z.coerce.number().optional(),
        perPage: z.coerce.number().optional(),
      }),
    },
    responses: {
      200: {
        description: "فهرست ادمین",
        content: {
          "application/json": { schema: AdminProductListResponseSchema },
        },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/products",
    tags: ["admin:products"],
    summary: "ساخت محصول (حداقل یک Variant — الحاقیه §۱)",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: { "application/json": { schema: CreateProductBodySchema } },
      },
    },
    responses: {
      201: {
        description: "محصول ساخته شد",
        content: {
          "application/json": { schema: AdminProductDetailResponseSchema },
        },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/orders",
    tags: ["admin:orders"],
    summary: "فهرست سفارش‌ها — نمای ادمین",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "فهرست سفارش‌ها",
        content: {
          "application/json": { schema: AdminOrderListResponseSchema },
        },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "patch",
    path: "/api/v1/admin/orders/{orderNumber}/status",
    tags: ["admin:orders"],
    summary: "تغییر وضعیت سفارش — فقط از طریق transitionTo (الحاقیه §۵)",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({ orderNumber: z.string() }),
      body: {
        content: {
          "application/json": { schema: UpdateOrderStatusBodySchema },
        },
      },
    },
    responses: {
      200: { description: "وضعیت تغییر کرد" },
      409: {
        description: "گذار نامعتبر (INVALID_STATUS_TRANSITION)",
        content: { "application/json": { schema: ApiErrorSchema } },
      },
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/users/{id}/impersonate",
    tags: ["admin:users"],
    summary:
      "صدور بلیت جعل‌هویت — حساس‌ترین اندپوینت (الحاقیه §۶، پیش‌فرض فقط سوپرادمین)",
    security: [{ bearerAuth: [] }],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        description: "بلیت ۶۰ثانیه‌ای یک‌بارمصرف",
        content: {
          "application/json": {
            schema: IssueImpersonationTicketResponseSchema,
          },
        },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "get",
    path: "/api/v1/admin/homepage/blocks",
    tags: ["admin:content"],
    summary: "بلوک‌های صفحه‌ی اصلی — نمای ادمین",
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "فهرست بلوک‌ها",
        content: {
          "application/json": { schema: AdminHomepageBlockListResponseSchema },
        },
      },
      403: errorResponse,
    },
  });
  registry.registerPath({
    method: "post",
    path: "/api/v1/admin/homepage/blocks",
    tags: ["admin:content"],
    summary: "ساخت بلوک صفحه‌ی اصلی",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": { schema: CreateHomepageBlockBodySchema },
        },
      },
    },
    responses: {
      201: {
        description: "بلوک ساخته شد",
        content: {
          "application/json": { schema: AdminHomepageBlockListResponseSchema },
        },
      },
      403: errorResponse,
    },
  });

  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "ArByte API",
      description:
        "مستندات API فروشگاه ArByte — تولیدشده از اسکیماهای Zod در @arbyte/contracts (بند ۱۲.۱۵).",
      version: "1.0.0",
    },
  });
}
