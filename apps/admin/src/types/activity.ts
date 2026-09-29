export interface AdminActivityLogEntry {
  id: string;
  user: string | null;
  action: string;
  modelName: string;
  objectId: string;
  changes: Record<string, [unknown, unknown]> | null;
  createdAt: string;
}
