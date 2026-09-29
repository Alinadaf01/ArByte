export type SectionAction = "view" | "create" | "edit" | "delete";

export interface AdminSection {
  key: string;
  label: string;
  actions: SectionAction[];
  sensitive: boolean;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  grants: Record<string, SectionAction[]>;
}

export interface AdminRoleFormValues {
  name: string;
  description: string;
  grants: Record<string, SectionAction[]>;
}

export interface MyPermissions {
  isSuperuser: boolean;
  grants: Record<string, SectionAction[]>;
}
