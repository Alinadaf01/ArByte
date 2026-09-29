import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { AdminAuthProvider } from "@/lib/AdminAuthContext";
import { ToastProvider } from "@/lib/ToastContext";
import { router } from "@/app/router";

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
