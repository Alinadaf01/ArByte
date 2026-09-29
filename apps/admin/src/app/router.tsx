import { createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/app/AdminLayout";
import { RequireStaffAuth } from "@/app/RequireStaffAuth";
import LoginPage from "@/pages/LoginPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import DashboardPage from "@/pages/DashboardPage";
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/orders/OrderDetailPage";
// F-02: import ProductsPage from "@/pages/ProductsPage";
// F-02: import ProductFormPage from "@/pages/products/ProductFormPage";
// F-02: import HomepagePage from "@/pages/HomepagePage";
// F-02: import PricingPage from "@/pages/PricingPage";
import CategoriesPage from "@/pages/CategoriesPage";
// F-02: import SpecsPage from "@/pages/SpecsPage";
// F-02: import InventoryPage from "@/pages/InventoryPage";
// F-02: import StockLedgerPage from "@/pages/StockLedgerPage";
import UsersPage from "@/pages/UsersPage";
import UserDetailPage from "@/pages/users/UserDetailPage";
import MessagesPage from "@/pages/MessagesPage";
import MessageDetailPage from "@/pages/messages/MessageDetailPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReviewsPage from "@/pages/ReviewsPage";
import BlogPage from "@/pages/BlogPage";
import CouponsPage from "@/pages/CouponsPage";
import ReturnsPage from "@/pages/ReturnsPage";
import SearchConsolePage from "@/pages/SearchConsolePage";
import RolesPage from "@/pages/RolesPage";
import ActivityLogPage from "@/pages/ActivityLogPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ComingSoonPage from "@/pages/ComingSoonPage";

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
          { path: "products", element: <ComingSoonPage /> },
          { path: "products/new", element: <ComingSoonPage /> },
          { path: "products/:id", element: <ComingSoonPage /> },
          { path: "pricing", element: <ComingSoonPage /> },
          { path: "homepage", element: <ComingSoonPage /> },
          { path: "categories", element: <CategoriesPage /> },
          { path: "specs", element: <ComingSoonPage /> },
          { path: "inventory", element: <ComingSoonPage /> },
          { path: "stock-ledger", element: <ComingSoonPage /> },
          { path: "users", element: <UsersPage /> },
          { path: "users/:id", element: <UserDetailPage /> },
          { path: "messages", element: <MessagesPage /> },
          { path: "messages/:id", element: <MessageDetailPage /> },
          { path: "reports", element: <ReportsPage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "reviews", element: <ReviewsPage /> },
          { path: "blog", element: <BlogPage /> },
          { path: "coupons", element: <CouponsPage /> },
          { path: "returns", element: <ReturnsPage /> },
          { path: "search-console", element: <SearchConsolePage /> },
          { path: "roles", element: <RolesPage /> },
          { path: "activity-log", element: <ActivityLogPage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
