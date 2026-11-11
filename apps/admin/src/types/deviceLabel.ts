export interface AdminDeviceLabel {
  id: string;
  code: string;
  deviceName: string;
  modelNumber: string;
  cpu: string;
  ram: string;
  storage: string;
  display: string;
  batteryHealthPercent: number | null;
  batteryCycleCount: number | null;
  grade: string;
  gradeDisplay: string;
  defectNotes: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceLabelFormValues = Omit<
  AdminDeviceLabel,
  "id" | "gradeDisplay" | "createdAt" | "updatedAt"
>;

export const PRODUCT_GRADE_OPTIONS = [
  "A",
  "A+",
  "A++",
  "A+++",
  "B",
  "B+",
  "OPENBOX",
  "KY.PEN.A",
  "KY.PEN.A+",
  "BOX",
  "A++BOX",
];
