import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/app/AdminLayout";
import { RequireStaffAuth } from "@/app/RequireStaffAuth";
import LoginPage from "@/pages/LoginPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/orders/OrderDetailPage";
import ProductsPage from "@/pages/ProductsPage";
import ProductFormPage from "@/pages/products/ProductFormPage";
import HomepagePage from "@/pages/HomepagePage";
import PricingPage from "@/pages/PricingPage";
import CategoriesPage from "@/pages/CategoriesPage";
import SpecsPage from "@/pages/SpecsPage";
import InventoryPage from "@/pages/InventoryPage";
import StockLedgerPage from "@/pages/StockLedgerPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/users/UserDetailPage";
import MessagesPage from "@/pages/MessagesPage";
import MessageDetailPage from "@/pages/messages/MessageDetailPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReviewsPage from "@/pages/ReviewsPage";
import BlogPage from "@/pages/BlogPage";
import ContentPagesPage from "@/pages/ContentPagesPage";
import RedirectsPage from "@/pages/RedirectsPage";
import CouponsPage from "@/pages/CouponsPage";
import ReturnsPage from "@/pages/ReturnsPage";
import SearchConsolePage from "@/pages/SearchConsolePage";
import TorobPage from "@/pages/TorobPage";
import RolesPage from "@/pages/RolesPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import NotFoundPage from "@/pages/NotFoundPage";
import BrandsPage from "@/pages/BrandsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import ImportPage from "@/pages/ImportPage";
import CampaignsPage from "@/pages/CampaignsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireStaffAuth />,
    children: [
      { path: "/change-password", element: <ChangePasswordPage /> },
      {
        path: "/",
        element: <AdminLayout />,
        errorElement: <NotFoundPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "orders", element: <OrdersPage /> },
          { path: "orders/:id", element: <OrderDetailPage /> },
          { path: "products", element: <ProductsPage /> },
          { path: "products/new", element: <ProductFormPage /> },
          { path: "products/:id", element: <ProductFormPage /> },
          { path: "pricing", element: <PricingPage /> },
          { path: "homepage", element: <HomepagePage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "brands", element: <BrandsPage /> },
          { path: "suppliers", element: <SuppliersPage /> },
          { path: "import", element: <ImportPage /> },
          { path: "campaigns", element: <CampaignsPage /> },
          { path: "specs", element: <SpecsPage /> },
          { path: "inventory", element: <InventoryPage /> },
          { path: "stock-ledger", element: <StockLedgerPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "users/:id", element: <UserDetailPage /> },
          { path: "messages", element: <MessagesPage /> },
          { path: "messages/:id", element: <MessageDetailPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "reviews", element: <ReviewsPage /> },
          { path: "blog", element: <BlogPage /> },
          { path: "content-pages", element: <ContentPagesPage /> },
          { path: "redirects", element: <RedirectsPage /> },
          { path: "coupons", element: <CouponsPage /> },
          { path: "returns", element: <ReturnsPage /> },
          { path: "search-console", element: <SearchConsolePage /> },
          { path: "torob", element: <TorobPage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "activity-log", element: <ActivityLogPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
