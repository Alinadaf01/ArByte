import {
  Bell,
  Boxes,
  CreditCard,
  FileClock,
  FolderTree,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
  MessageSquare,
  Newspaper,
  Package,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  Ticket,
  Truck,
  Undo2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { dictionary } from "./dictionary";
import type { Permission } from "./permissions";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
}

export interface NavGroup {
  key: string;
  label?: string;
  items: NavItem[];
}

/**
 * ساختار ناوبری گروه‌بندی‌شده — بند ۷.۳ و ۵.۸۲ برند بوک. فقط «داشبورد» و
 * «تنظیمات» در T-100 صفحه‌ی واقعی دارند؛ بقیه طبق محدوده‌ی T-100 در فازهای
 * بعد ساخته می‌شوند (ر.ک. docs/design/admin — بخش ۶ تسک).
 */
export const navGroups: NavGroup[] = [
  {
    key: "top",
    items: [
      {
        key: "dashboard",
        label: dictionary.nav.items.dashboard,
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    key: "sales",
    label: dictionary.nav.groups.sales,
    items: [
      {
        key: "orders",
        label: dictionary.nav.items.orders,
        href: "/orders",
        icon: Receipt,
        permission: "orders.view",
      },
      {
        key: "payments",
        label: dictionary.nav.items.payments,
        href: "/payments",
        icon: CreditCard,
        permission: "payments.view",
      },
      {
        key: "shipping",
        label: dictionary.nav.items.shipping,
        href: "/shipping",
        icon: Truck,
        permission: "shipping.view",
      },
      {
        key: "returns",
        label: dictionary.nav.items.returns,
        href: "/returns",
        icon: Undo2,
        permission: "returns.view",
      },
    ],
  },
  {
    key: "catalog",
    label: dictionary.nav.groups.catalog,
    items: [
      {
        key: "products",
        label: dictionary.nav.items.products,
        href: "/products",
        icon: Package,
        permission: "products.view",
      },
      {
        key: "categories",
        label: dictionary.nav.items.categories,
        href: "/categories",
        icon: FolderTree,
        permission: "categories.view",
      },
      {
        key: "specifications",
        label: dictionary.nav.items.specifications,
        href: "/specifications",
        icon: ListChecks,
        permission: "specifications.view",
      },
      {
        key: "inventory",
        label: dictionary.nav.items.inventory,
        href: "/inventory",
        icon: Boxes,
        permission: "inventory.view",
      },
      {
        key: "brands",
        label: dictionary.nav.items.brands,
        href: "/brands",
        icon: Tag,
        permission: "brands.view",
      },
    ],
  },
  {
    key: "customers",
    label: dictionary.nav.groups.customers,
    items: [
      {
        key: "users",
        label: dictionary.nav.items.users,
        href: "/users",
        icon: Users,
        permission: "users.view",
      },
      {
        key: "reviews",
        label: dictionary.nav.items.reviews,
        href: "/reviews",
        icon: MessageSquare,
        permission: "reviews.view",
      },
      {
        key: "messages",
        label: dictionary.nav.items.messages,
        href: "/messages",
        icon: Mail,
        permission: "messages.view",
      },
    ],
  },
  {
    key: "marketing",
    label: dictionary.nav.groups.marketing,
    items: [
      {
        key: "campaigns",
        label: dictionary.nav.items.campaigns,
        href: "/campaigns",
        icon: Megaphone,
        permission: "campaigns.view",
      },
      {
        key: "coupons",
        label: dictionary.nav.items.coupons,
        href: "/coupons",
        icon: Ticket,
        permission: "coupons.view",
      },
      {
        key: "blog",
        label: dictionary.nav.items.blog,
        href: "/blog",
        icon: Newspaper,
        permission: "blog.view",
      },
      {
        key: "seo",
        label: dictionary.nav.items.seo,
        href: "/seo",
        icon: Search,
        permission: "seo.view",
      },
    ],
  },
  {
    key: "system",
    label: dictionary.nav.groups.system,
    items: [
      {
        key: "roles",
        label: dictionary.nav.items.roles,
        href: "/roles",
        icon: ShieldCheck,
        permission: "roles.view",
      },
      {
        key: "settings",
        label: dictionary.nav.items.settings,
        href: "/settings",
        icon: Settings2,
        permission: "settings.view",
      },
      {
        key: "notifications",
        label: dictionary.nav.items.notifications,
        href: "/notifications",
        icon: Bell,
        permission: "notifications.view",
      },
      {
        key: "logs",
        label: dictionary.nav.items.logs,
        href: "/logs",
        icon: FileClock,
        permission: "logs.view",
      },
    ],
  },
];
