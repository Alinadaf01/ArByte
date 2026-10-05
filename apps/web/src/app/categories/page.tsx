import type { Metadata } from "next";
import { Breadcrumb } from "@arbyte/ui";
import { categoriesPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { CategoryCard } from "@/components/category/CategoryCard";
import { FeaturedCategoryTile } from "@/components/category/FeaturedCategoryTile";
import { UseCaseSwitcher } from "@/components/category/UseCaseSwitcher";
import { getTopLevelCategories } from "@/lib/catalog";
import { SITE_OPEN_GRAPH } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const categories = await getTopLevelCategories();
  return {
    title: `${categoriesPage.breadcrumb.current} | آربایت`,
    description: categoriesPage.subtitle(categories.length),
    alternates: { canonical: "/categories" },
    openGraph: {
      ...SITE_OPEN_GRAPH,
      title: `${categoriesPage.breadcrumb.current} | آربایت`,
      description: categoriesPage.subtitle(categories.length),
      url: "/categories",
    },
  };
}

/**
 * T-202 §۲.۱ / T-213 §۸ — فهرست دسته‌بندی‌های سطح یک، هم‌تراز
 * `Categories.dc.html`: یک کارت بزرگ (دسته‌ی با بیشترین `productCount`) +
 * گرید بقیه + سوییچر کاربری. دسته‌ها واقعی‌اند (۵ عدد)، بدون هیچ عدد
 * ساختگی طراحی.
 */
export default async function CategoriesPage() {
  const categories = await getTopLevelCategories();
  const [featured, ...rest] = [...categories].sort(
    (a, b) => b.productCount - a.productCount,
  );

  return (
    <StorefrontShell headerActive="categories" navActive="categories">
      <section className="border-border border-b bg-surface px-[5vw] py-8 md:py-11">
        <Breadcrumb
          items={[
            { label: categoriesPage.breadcrumb.home, href: "/" },
            { label: categoriesPage.breadcrumb.current },
          ]}
          className="mb-4"
        />
        <h1 className="text-hero text-primary font-heading tracking-tight">
          {categoriesPage.title}
        </h1>
        <p className="text-body text-secondary mt-2 max-w-[56ch]">
          {categoriesPage.subtitle(categories.length)}
        </p>
      </section>

      <section className="flex flex-col gap-5 px-[5vw] py-8 md:py-11">
        {featured ? <FeaturedCategoryTile category={featured} /> : null}

        {rest.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : null}

        <UseCaseSwitcher />
      </section>
    </StorefrontShell>
  );
}
