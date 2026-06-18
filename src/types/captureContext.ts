import type { StoreSessionStaff, StoreSessionStore } from "@/types/storeSession";

export type CaptureStore = Pick<
  StoreSessionStore,
  | "id"
  | "storeCode"
  | "storeName"
  | "displayName"
  | "logoUrl"
  | "frameUrl"
  | "themeColor"
  | "printTemplateType"
  | "timezone"
>;

export type CaptureStaff = Pick<
  StoreSessionStaff,
  "id" | "staffCode" | "displayName" | "roleLabel" | "canApproveSns"
>;
