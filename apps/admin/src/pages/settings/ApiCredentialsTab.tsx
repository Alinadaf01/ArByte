import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CredentialFormModal } from "@/pages/settings/CredentialFormModal";
import { listCredentials, deleteCredential, sendTestSms } from "@/lib/api";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/lib/ToastContext";
import {
  API_CREDENTIAL_SERVICE_LABELS,
  type ApiCredential,
} from "@/types/settings";

export function ApiCredentialsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formState, setFormState] = useState<{
    open: boolean;
    credential: ApiCredential | null;
  }>({
    open: false,
    credential: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<ApiCredential | null>(null);

  const {
    data: credentials,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["credentials"],
    queryFn: listCredentials,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.showSuccess("کلید حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  const rows = credentials ?? [];
  const [testPhone, setTestPhone] = useState("");
  const testMutation = useMutation({
    mutationFn: () => sendTestSms(testPhone.trim()),
    onSuccess: (result) =>
      result.status === "sent"
        ? toast.showSuccess("پیامک آزمایشی ارسال شد.")
        : toast.showError(`ارسال ناموفق: ${result.error || "خطای نامشخص"}`),
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ارسال ناموفق بود.",
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <section className="glass-card flex flex-col gap-3 p-5">
        <h2 className="m-0 text-sm font-bold text-white">
          ارسال پیامک آزمایشی (کاوه‌نگار)
        </h2>
        <p className="m-0 text-xs text-slate-500">
          قالب «کد ورود» با کد ۱۲۳۴۵ به این شماره فرستاده می‌شود؛ نتیجه‌ی
          کاوه‌نگار همین‌جا نشان داده می‌شود.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="w-48"
            dir="ltr"
            placeholder="09xxxxxxxxx"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
          />
          <Button
            size="sm"
            disabled={
              !/^09\d{9}$/.test(testPhone.trim()) || testMutation.isPending
            }
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? "در حال ارسال…" : "ارسال"}
          </Button>
        </div>
      </section>
      <div className="flex justify-end">
        <Button onClick={() => setFormState({ open: true, credential: null })}>
          + کلید جدید
        </Button>
      </div>

      <section className="glass-card overflow-hidden p-0">
        {isError ? (
          <ErrorState
            description="دریافت کلیدهای API ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && rows.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="هنوز کلیدی ثبت نشده"
            description="برای فعال کردن پیامک یا درگاه پرداخت، کلید مربوطه را اضافه کنید."
            action={
              <Button
                onClick={() => setFormState({ open: true, credential: null })}
              >
                + کلید جدید
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                  <th className="px-6 py-3 font-medium">سرویس</th>
                  <th className="px-4 py-3 font-medium">وضعیت کلید</th>
                  <th className="px-4 py-3 font-medium">فعال</th>
                  <th className="px-4 py-3 font-medium">آزمایشی</th>
                  <th className="px-4 py-3 font-medium">عملیات</th>
                </tr>
              </thead>
              {isPending ? (
                <TableSkeleton rows={3} cols={5} />
              ) : (
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((cred) => (
                    <tr key={cred.id}>
                      <td className="px-6 py-3">
                        <p className="m-0 font-semibold text-white">
                          {API_CREDENTIAL_SERVICE_LABELS[cred.service]}
                        </p>
                        {cred.label && (
                          <p className="m-0 text-[11px] text-slate-500">
                            {cred.label}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Chip
                          tone={cred.isConfigured ? "success" : "neutral"}
                          dot
                        >
                          {cred.isConfigured ? "تنظیم شده" : "تنظیم نشده"}
                        </Chip>
                        {Object.entries(cred.maskedCredentials ?? {}).map(
                          ([key, masked]) => (
                            <p
                              key={key}
                              className="m-0 mt-1 font-mono text-[11px] text-slate-500"
                              dir="ltr"
                            >
                              {key}: {masked}
                            </p>
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={cred.isActive ? "success" : "neutral"}>
                          {cred.isActive ? "فعال" : "غیرفعال"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <Chip tone={cred.isSandbox ? "warning" : "neutral"}>
                          {cred.isSandbox ? "آزمایشی" : "واقعی"}
                        </Chip>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setFormState({ open: true, credential: cred })
                            }
                            aria-label="ویرایش"
                            className="icon-btn !h-8 !w-8"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cred)}
                            aria-label="حذف"
                            className="icon-btn !h-8 !w-8 hover:!text-danger"
                          >
                            <svg
                              className="size-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.8"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </section>

      <CredentialFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false, credential: null })}
        credential={formState.credential}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف کلید «${deleteTarget ? API_CREDENTIAL_SERVICE_LABELS[deleteTarget.service] : ""}»`}
        description="پس از حذف، این سرویس تا افزودن کلید جدید غیرفعال می‌ماند."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
