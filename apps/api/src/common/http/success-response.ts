/** بند ۸.۹۲ — پوشش پاسخ موفق استاندارد، با `requestId` واقعیِ همان درخواست (RequestIdMiddleware). */
export function successResponse<T>(data: T, requestId: string) {
  return { data, meta: { requestId } };
}
