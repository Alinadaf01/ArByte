export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="m-0 text-xl font-extrabold text-white sm:text-2xl">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-slate-400">
          {description}
        </p>
      </div>

      <section className="glass-card flex flex-col items-center gap-3 p-10 text-center sm:p-16">
        <span className="grid size-14 place-items-center rounded-2xl border border-white/[0.08] bg-ink-800/60 text-brand-400">
          <svg
            className="size-7"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.6"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94M12 8.25v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </span>
        <p className="m-0 max-w-sm text-sm leading-7 text-slate-500">
          این بخش هنوز فعال نشده است.
        </p>
      </section>
    </div>
  );
}
