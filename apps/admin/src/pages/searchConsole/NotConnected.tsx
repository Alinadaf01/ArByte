import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/Stateviews";

export function SearchConsoleNotConnected() {
  return (
    <EmptyState
      icon={Search}
      title="سرچ کنسول متصل نیست"
      description="این بخش به راه‌اندازی Google Search Console توسط کارفرما و اجرای همگام‌سازی شبانه وابسته است. پس از اتصال، داده‌ها به‌طور خودکار اینجا نمایش داده می‌شود."
    />
  );
}
