import { dictionary } from "@/lib/dictionary";
import { StorefrontShell } from "@/components/shell/StorefrontShell";

export default function HomePage() {
  return (
    <StorefrontShell navActive="home">
      <main className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="rounded-card bg-surface shadow-card flex flex-col items-start gap-4 p-8">
          <h1 className="text-h2 text-primary font-heading">
            {dictionary.home.title}
          </h1>
          <p className="text-body text-secondary">{dictionary.home.status}</p>
          <button
            type="button"
            className="rounded-pill bg-brand shadow-button-accent text-on-dark px-6 py-3 text-body font-emphasis"
          >
            {dictionary.home.cta}
          </button>
        </div>
      </main>
    </StorefrontShell>
  );
}
