/** E-05 §۱ — دانلود فایل باینری (فاکتور/کارت گارانتی PDF) از پشت پراکسی
 * (کوکی httpOnly، همان الگوی بقیه‌ی `/api/proxy/*`). نام فایل از
 * `Content-Disposition` سرور خوانده می‌شود؛ اگر نبود، `fallbackName`. */
export async function downloadProxyFile(
  path: string,
  fallbackName: string,
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetch(`/api/proxy${path}`);
  } catch {
    return false;
  }
  if (!res.ok) return false;

  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackName;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
