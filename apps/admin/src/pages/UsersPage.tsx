import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { Pagination } from "@/components/ui/Pagination";
import { UserFormModal } from "@/pages/users/UserFormModal";
import { UserRow } from "@/pages/users/UserRow";
import { listUsers } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";

const PAGE_SIZE = 12;

export default function UsersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    search: "",
    isVerified: "",
  });
  const page = Number(filters.page) || 1;

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["users", filters],
    queryFn: () =>
      listUsers({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search || undefined,
        isVerified: filters.isVerified || undefined,
      }),
  });

  const users = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کاربران"
        description="لیست مشتریان با جزئیات، آدرس‌ها و افزودن دستی."
        actions={
          <Button onClick={() => setFormOpen(true)}>+ کاربر جدید</Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="جستجوی نام یا شماره…"
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setFilters({
                  search: (e.target as HTMLInputElement).value,
                  page: "1",
                });
            }}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select
            className="w-auto"
            value={filters.isVerified}
            onChange={(e) =>
              setFilters({ isVerified: e.target.value, page: "1" })
            }
          >
            <option value="">همه کاربران</option>
            <option value="true">تأیید‌شده</option>
            <option value="false">تأییدنشده</option>
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت کاربران ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="کاربری یافت نشد"
            description="با فیلترهای فعلی کاربری پیدا نشد."
            action={
              <Button onClick={() => setFormOpen(true)}>+ کاربر جدید</Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">کاربر</th>
                    <th className="px-4 py-3 font-medium">ایمیل</th>
                    <th className="px-4 py-3 font-medium">تاریخ عضویت</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={4} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.map((user) => (
                      <UserRow key={user.id} user={user} />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {data && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                count={data.count}
                onPageChange={(p) => setFilters({ page: String(p) })}
              />
            )}
          </>
        )}
      </section>

      <UserFormModal open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
