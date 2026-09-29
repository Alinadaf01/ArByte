export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  newsletter: boolean;
  isRead: boolean;
  adminNote: string;
  ipAddress: string | null;
  submittedAt: string;
}
