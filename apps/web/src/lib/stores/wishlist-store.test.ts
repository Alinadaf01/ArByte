// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { wishlistStore } from "./wishlist-store";

beforeEach(() => {
  window.localStorage.clear();
  wishlistStore.clear();
});

describe("wishlistStore", () => {
  it("محصول جدید اضافه می‌کند و priceAtSave/savedAt را نگه می‌دارد", () => {
    wishlistStore.addItem("product-a", 150_000_000);
    const [item] = wishlistStore.getSnapshot();
    expect(item?.productSlug).toBe("product-a");
    expect(item?.priceAtSave).toBe(150_000_000);
    expect(typeof item?.savedAt).toBe("string");
  });

  it("اضافه‌کردن دوباره‌ی همان محصول/واریانت تکراری نمی‌سازد", () => {
    wishlistStore.addItem("product-a", 150_000_000, "v1");
    wishlistStore.addItem("product-a", 160_000_000, "v1");
    expect(wishlistStore.getSnapshot()).toHaveLength(1);
  });

  it("همان محصول با واریانت متفاوت، ردیف جدا می‌شود", () => {
    wishlistStore.addItem("product-a", 150_000_000, "v1");
    wishlistStore.addItem("product-a", 160_000_000, "v2");
    expect(wishlistStore.getSnapshot()).toHaveLength(2);
  });

  it("has محصول موجود/ناموجود را درست تشخیص می‌دهد", () => {
    wishlistStore.addItem("product-a", 150_000_000, "v1");
    expect(wishlistStore.has("product-a", "v1")).toBe(true);
    expect(wishlistStore.has("product-a", "v2")).toBe(false);
    expect(wishlistStore.has("product-b")).toBe(false);
  });

  it("removeItem فقط همان ردیف را حذف می‌کند", () => {
    wishlistStore.addItem("product-a", 150_000_000, "v1");
    wishlistStore.addItem("product-a", 160_000_000, "v2");
    wishlistStore.removeItem("product-a", "v1");
    const items = wishlistStore.getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0]?.variantId).toBe("v2");
  });

  it("روی localStorage با کلید نسخه‌دار ذخیره می‌کند", () => {
    wishlistStore.addItem("product-a", 150_000_000);
    expect(window.localStorage.getItem("arbyte:wishlist:v1")).not.toBeNull();
  });
});
