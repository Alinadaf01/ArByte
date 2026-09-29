import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="m-0 font-mono text-sm text-brand-400">۴۰۴</p>
      <h1 className="m-0 text-xl font-extrabold text-white">
        این صفحه پیدا نشد
      </h1>
      <Link
        to="/"
        className="mt-2 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-bold text-ink-950 no-underline shadow-glow"
      >
        بازگشت به داشبورد
      </Link>
    </div>
  );
}
