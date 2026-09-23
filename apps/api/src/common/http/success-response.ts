/** بند ۸.۹۲ — پوشش پاسخ موفق استاندارد، با `requestId` واقعیِ همان درخواست (RequestIdMiddleware). */
export function successResponse<T>(data: T, requestId: string) {
  return { data, meta: { requestId } };
}

/** بند ۸.۹۳ — پوشش فهرست صفحه‌بندی‌شده، همان شکل `paginatedResponseSchema` در packages/contracts. */
export function paginatedResponse<T>(
  data: T[],
  requestId: string,
  pagination: { page: number; perPage: number; total: number },
) {
  return {
    data,
    meta: {
      requestId,
      pagination: {
        ...pagination,
        totalPages: Math.ceil(pagination.total / pagination.perPage),
      },
    },
  };
}
