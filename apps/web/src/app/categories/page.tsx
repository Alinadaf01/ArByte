import { Breadcrumb } from "@arbyte/ui";
import { categoriesPage } from "@arbyte/contracts";
import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { CategoryCard } from "@/components/category/CategoryCard";
import { getTopLevelCategories } from "@/lib/catalog";

export const metadata = {
  title: `${categoriesPage.breadcrumb.current} | آربایت`,
  description: categoriesPage.subtitle,
};

/** T-202 §۲.۱ — فهرست دسته‌بندی‌های سطح یک، طبق Categories.dc.html. */
export default async function CategoriesPage() {
  const categories = await getTopLevelCategories();

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
          {categoriesPage.subtitle}
        </p>
      </section>

      <section className="px-[5vw] py-8 md:py-11">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>
    </StorefrontShell>
  );
}
