export interface AdminRedirect {
  id: number;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  isActive: boolean;
  isAuto: boolean;
  hits: number;
  lastHitAt: string | null;
  createdAt: string;
}

export type RedirectFormValues = Pick<
  AdminRedirect,
  "fromPath" | "toPath" | "statusCode" | "isActive"
>;
