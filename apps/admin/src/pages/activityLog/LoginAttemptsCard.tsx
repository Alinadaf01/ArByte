import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@/components/ui/Chip";
import { Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { listLoginAttempts } from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";

const REASON: Record<string, string> = {
  bad_credentials: "رمز/شماره اشتباه",
  not_staff: "کاربر غیرمدیر",
  locked: "قفل موقت",
};
const PAGE_SIZE = 10;

/** G-03 — ورودهای پنل: موفق، ناموفق و قفل موقت (بعد از چند تلاش ناموفق). */
export function LoginAttemptsCard() {
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState("");
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["login-attempts", page, success],
    queryFn: () =>
      listLoginAttempts({
        page,
        pageSize: PAGE_SIZE,
        success: success || undefined,
      }),
  });
  return (
    <section className="glass-card overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
        <h2 className="m-0 text-sm font-bold text-white">ورودهای پنل</h2>
        <Select
          className="w-auto"
          aria-label="فیلتر نتیجه‌ی ورود"
          value={success}
          onChange={(e) => {
            setSuccess(e.target.value);
            setPage(1);
          }}
        >
          <option value="">همه</option>
          <option value="true">موفق</option>
          <option value="false">ناموفق</option>
        </Select>
      </div>
      {isError ? (
        <ErrorState
          description="دریافت لاگ ورود ناموفق بود."
          onRetry={() => refetch()}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                <th className="px-6 py-3 font-medium">زمان</th>
                <th className="px-4 py-3 font-medium">شماره</th>
                <th className="px-4 py-3 font-medium">آی‌پی</th>
                <th className="px-4 py-3 font-medium">نتیجه</th>
              </tr>
            </thead>
            {isPending ? (
              <TableSkeleton rows={4} cols={4} />
            ) : (
              <tbody className="divide-y divide-white/[0.04]">
                {data.results.map((a) => (
                  <tr key={a.id}>
                    <td className="px-6 py-3 text-xs text-slate-400">
                      {formatJalaliDateTime(a.createdAt)}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-300"
                      dir="ltr"
                    >
                      {a.phone}
                      {a.userName && (
                        <span className="block text-[10px] text-slate-500">
                          {a.userName}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-400"
                      dir="ltr"
                    >
                      {a.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Chip
                        tone={
                          a.success
                            ? "success"
                            : a.reason === "locked"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {a.success ? "موفق" : (REASON[a.reason] ?? "ناموفق")}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      )}
      {data && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          count={data.count}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
