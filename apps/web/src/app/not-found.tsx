import { StorefrontShell } from "@/components/shell/StorefrontShell";
import { NotFoundContent } from "./not-found-content";

export default function NotFound() {
  return (
    <StorefrontShell>
      <div dir="rtl" className="bg-paper text-primary font-sans">
        <NotFoundContent />
      </div>
    </StorefrontShell>
  );
}
