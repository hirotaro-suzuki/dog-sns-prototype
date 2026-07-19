export type AdminTab = "assets" | "stores" | "frames";
export type AssetReviewStatus = "new" | "candidate" | "hold" | "rejected";
export type ReviewStatusFilter = "all" | AssetReviewStatus;
export type AssetSortMode = "date" | "store";
export type DateSortOrder = "desc" | "asc";
export type AssetScreen = "list" | "detail";

export type StoreSummary = {
  id: string;
  store_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  asset_count?: number;
};

export type StoreMaster = StoreSummary & {
  store_name: string;
  login_code: string;
  logo_url: string | null;
  frame_url: string | null;
  theme_color: string | null;
  sns_display_name: string | null;
  instagram_account: string | null;
  default_hashtags: string | null;
  address: string | null;
  phone: string | null;
  business_hours_note: string | null;
  notes: string | null;
  asset_count: number;
};

export type StaffMaster = {
  id: string;
  store_id: string;
  staff_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

export type StoreFrame = {
  id: string;
  store_id: string;
  frame_name: string;
  frame_url: string;
  is_default: boolean;
  sort_order: number;
  date_enabled: boolean;
  date_x: number;
  date_y: number;
  date_font_size: number;
  date_color: string;
};

export type AdminAsset = {
  id: string;
  manage_code: string;
  store_id: string;
  store_code: string;
  store_display_name: string;
  staff_display_name: string | null;
  captured_at: string;
  captured_date: string;
  final_processed_url: string;
  description: string | null;
  short_caption: string | null;
  review_status: AssetReviewStatus;
  status: "ready" | "archived";
  hidden_at: string | null;
  hidden_reason: string | null;
  saved_at: string;
};

export type AdminAssetsResponse = {
  stores: StoreSummary[];
  assets: AdminAsset[];
  message?: string;
  detail?: string;
};

export type StoresResponse = {
  stores?: StoreMaster[];
  store?: Partial<StoreMaster> & { id: string };
  deletedStoreId?: string;
  storageWarning?: string | null;
  message?: string;
  detail?: string;
};

export type StaffResponse = {
  staff?: StaffMaster[];
  staffMember?: StaffMaster;
  message?: string;
  detail?: string;
};

export type StoreAssetUploadResponse = {
  publicUrl?: string;
  store?: Partial<StoreMaster> & { id: string };
  frame?: StoreFrame;
  message?: string;
  detail?: string;
};

export type UpdatedAssetResponse = {
  asset?: Pick<AdminAsset, "id" | "description" | "short_caption" | "review_status" | "status" | "hidden_at" | "hidden_reason">;
  message?: string;
  detail?: string;
};

export type DeletedAssetResponse = {
  deletedAssetId?: string;
  message?: string;
  detail?: string;
};

export type FramesResponse = {
  frames?: StoreFrame[];
  frame?: StoreFrame;
  deletedFrameId?: string;
  message?: string;
  detail?: string;
};

export type FrameDraft = {
  id: string;
  store_id: string;
  frame_url: string;
  is_default: boolean;
  sort_order: number;
  date_enabled: boolean;
  date_x: number;
  date_y: number;
  date_font_size: number;
  date_color: string;
};
