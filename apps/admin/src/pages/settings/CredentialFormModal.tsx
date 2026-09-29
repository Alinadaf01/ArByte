import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Switch } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { createCredential, updateCredential } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import {
  API_CREDENTIAL_SERVICE_LABELS,
  type ApiCredential,
  type ApiCredentialService,
} from "@/types/settings";

interface KeyValueRow {
  key: string;
  value: string;
}

// The key-name editor below is generic (any service, any key) with a
// placeholder that only ever shows "apiKey" as an example -- so an admin
// setting up Zarinpal naturally typed a key named "apiKey" there, but
// apps/orders/providers/zarinpal.py only ever reads credentials["merchantId"].
// The request silently went out with an empty merchant_id and Zarinpal
// rejected it -- confirmed live as exactly why "I set the apikey but it
// doesn't work" happened despite the row showing as configured. Same
// mismatch risk exists for every other service, so show the real expected
// key name(s) per service instead of a generic example.
const REQUIRED_CREDENTIAL_KEYS: Record<ApiCredentialService, string[]> = {
  kavenegar: ["apiKey"],
  zarinpal: ["merchantId"],
  idpay: ["apiKey"],
  snapppay: ["clientId", "clientSecret", "username", "password"],
  digipay: ["clientId", "clientSecret"],
};

export function CredentialFormModal({
  open,
  onClose,
  credential,
}: {
  open: boolean;
  onClose: () => void;
  credential: ApiCredential | null;
}) {
  const isEdit = !!credential;
  const queryClient = useQueryClient();
  const toast = useToast();

  const [service, setService] = useState<ApiCredentialService>("kavenegar");
  const [label, setLabel] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSandbox, setIsSandbox] = useState(false);
  const [order, setOrder] = useState(0);
  const [editingKeys, setEditingKeys] = useState(!isEdit);
  const [rows, setRows] = useState<KeyValueRow[]>([{ key: "", value: "" }]);

  useEffect(() => {
    if (!open) return;
    setService(credential?.service ?? "kavenegar");
    setLabel(credential?.label ?? "");
    setIsActive(credential?.isActive ?? true);
    setIsSandbox(credential?.isSandbox ?? false);
    setOrder(credential?.order ?? 0);
    setEditingKeys(!credential);
    setRows([{ key: "", value: "" }]);
  }, [open, credential]);

  const mutation = useMutation({
    mutationFn: async () => {
      const credentialsObject = editingKeys
        ? Object.fromEntries(
            rows
              .filter((r) => r.key.trim())
              .map((r) => [r.key.trim(), r.value]),
          )
        : undefined;
      if (isEdit) {
        return updateCredential(credential!.id, {
          label,
          isActive,
          isSandbox,
          order,
          ...(credentialsObject && Object.keys(credentialsObject).length > 0
            ? { credentials: credentialsObject }
            : {}),
        });
      }
      return createCredential({
        service,
        label,
        isActive,
        isSandbox,
        order,
        credentials: credentialsObject ?? {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      toast.showSuccess(isEdit ? "کلید ویرایش شد." : "کلید افزوده شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "ویرایش کلید" : "کلید جدید"}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="سرویس" htmlFor="cred-service" required>
            <Select
              id="cred-service"
              value={service}
              onChange={(e) =>
                setService(e.target.value as ApiCredentialService)
              }
              disabled={isEdit}
            >
              {Object.entries(API_CREDENTIAL_SERVICE_LABELS).map(
                ([value, l]) => (
                  <option key={value} value={value}>
                    {l}
                  </option>
                ),
              )}
            </Select>
          </Field>
          <Field label="برچسب" htmlFor="cred-label">
            <Input
              id="cred-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="اختیاری"
            />
          </Field>
        </div>

        <div className="flex items-center gap-4">
          <Switch checked={isActive} onChange={setIsActive} label="فعال" />
          <Switch
            checked={isSandbox}
            onChange={setIsSandbox}
            label="حالت آزمایشی (sandbox)"
          />
        </div>

        <Field label="ترتیب" htmlFor="cred-order">
          <Input
            id="cred-order"
            type="number"
            value={order}
            onChange={(e) => setOrder(Number(e.target.value))}
            className="w-24"
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">کلیدها</span>
            {isEdit && (
              <div className="flex items-center gap-2">
                {credential!.isConfigured && (
                  <Chip tone="success">تنظیم شده</Chip>
                )}
                {!editingKeys && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingKeys(true)}
                  >
                    تغییر کلیدها
                  </Button>
                )}
              </div>
            )}
          </div>
          {editingKeys ? (
            <div className="flex flex-col gap-2">
              <p className="m-0 text-[11px] text-slate-500">
                نام کلید
                {REQUIRED_CREDENTIAL_KEYS[service].length > 1
                  ? "‌های"
                  : ""}{" "}
                مورد نیاز این سرویس:{" "}
                <span dir="ltr" className="font-mono text-slate-300">
                  {REQUIRED_CREDENTIAL_KEYS[service].join(", ")}
                </span>
              </p>
              {rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`نام کلید (مثلاً ${REQUIRED_CREDENTIAL_KEYS[service][0]})`}
                    dir="ltr"
                    value={row.key}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, key: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <Input
                    placeholder="مقدار"
                    dir="ltr"
                    value={row.value}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, value: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) => prev.filter((_, i) => i !== index))
                    }
                    aria-label="حذف ردیف"
                    className="icon-btn !h-10 !w-10 shrink-0 hover:!text-danger"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  setRows((prev) => [...prev, { key: "", value: "" }])
                }
              >
                + افزودن کلید
              </Button>
            </div>
          ) : (
            <p className="m-0 text-xs text-slate-500">
              کلیدها فقط نوشتنی‌اند و هرگز نمایش داده نمی‌شوند.
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
