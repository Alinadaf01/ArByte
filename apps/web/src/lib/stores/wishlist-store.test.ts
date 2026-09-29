// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  describe("syncAfterLogin — E-02 §۱", () => {
    it("از /api/proxy رد می‌شود (نه مستقیم Django) و بعد از موفقیت store محلی را پاک می‌کند", async () => {
      wishlistStore.addItem("product-a", 150_000_000);
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(null, { status: 200 }));

      const ok = await wishlistStore.syncAfterLogin();

      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/proxy/account/wishlist/merge",
        expect.objectContaining({ method: "POST" }),
      );
      expect(wishlistStore.getSnapshot()).toHaveLength(0);
      fetchMock.mockRestore();
    });

    it("سبد خالی → true بدون هیچ فراخوانی شبکه", async () => {
      const fetchMock = vi.spyOn(global, "fetch");
      const ok = await wishlistStore.syncAfterLogin();
      expect(ok).toBe(true);
      expect(fetchMock).not.toHaveBeenCalled();
      fetchMock.mockRestore();
    });

    it("خطای شبکه/سرور → false، store محلی دست‌نخورده می‌ماند", async () => {
      wishlistStore.addItem("product-a", 150_000_000);
      const fetchMock = vi
        .spyOn(global, "fetch")
        .mockResolvedValue(new Response(null, { status: 500 }));

      const ok = await wishlistStore.syncAfterLogin();

      expect(ok).toBe(false);
      expect(wishlistStore.getSnapshot()).toHaveLength(1);
      fetchMock.mockRestore();
    });
  });
});
