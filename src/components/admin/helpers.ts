import type { AssetReviewStatus, FrameDraft, StaffMaster, StoreMaster } from "./types";

export const PIN_STORAGE_KEY = "dog-sns-admin-pin";
export const MIN_RASTER_FRAME_SIZE = 1080;

export async function readImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("画像を読み込めませんでした。"));
      image.src = objectUrl;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function validateFrameImageFile(file: File) {
  let width = 0;
  let height = 0;
  try {
    ({ width, height } = await readImageDimensions(file));
  } catch {
    return "画像として読み込めないファイルです。";
  }

  if (width <= 0 || height <= 0) {
    return "画像の寸法を確認できませんでした。幅と高さを指定したファイルを使ってください。";
  }
  if (width !== height) {
    return `枠画像は正方形にしてください（このファイルは ${width}×${height} です）。`;
  }
  if (file.type !== "image/svg+xml" && width < MIN_RASTER_FRAME_SIZE) {
    return `PNG/JPEG/WebPの枠画像は ${MIN_RASTER_FRAME_SIZE}×${MIN_RASTER_FRAME_SIZE} 以上にしてください（このファイルは ${width}×${height} です）。`;
  }
  return "";
}
export const REVIEW_STATUS_OPTIONS: { value: AssetReviewStatus; label: string }[] = [
  { value: "new", label: "未確認" },
  { value: "candidate", label: "投稿候補" },
  { value: "hold", label: "保留" },
  { value: "rejected", label: "使用しない" },
];

export const emptyStoreDraft: StoreMaster = {
  id: "",
  store_code: "",
  store_name: "",
  display_name: "",
  login_code: "",
  logo_url: null,
  frame_url: null,
  theme_color: "#176f62",
  sns_display_name: null,
  instagram_account: null,
  default_hashtags: null,
  address: null,
  phone: null,
  business_hours_note: null,
  is_active: true,
  sort_order: 0,
  notes: null,
  asset_count: 0,
};

export const emptyFrameDraft: FrameDraft = {
  id: "",
  store_id: "",
  frame_url: "",
  is_default: false,
  sort_order: 0,
  date_enabled: true,
  date_x: 900,
  date_y: 90,
  date_font_size: 38,
  date_color: "#ffffff",
};

export const DATE_MARKER_COLORS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#111111" },
  { label: "赤", value: "#d73a31" },
  { label: "青", value: "#1d64d8" },
  { label: "黄", value: "#f2c94c" },
];

export function emptyStaffDraft(storeId = ""): StaffMaster {
  return {
    id: "",
    store_id: storeId,
    staff_code: "",
    display_name: "",
    is_active: true,
    sort_order: 0,
    notes: "",
  };
}

export function getTodayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDateTime(value: string) {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")}/${part("day")} ${part("hour")}:${part("minute")}`;
}

export function nullableText(value: string | null) {
  return value ?? "";
}

export function getErrorMessage(data: { message?: string; detail?: string }, fallback: string) {
  return data.detail ? `${data.message ?? fallback} ${data.detail}` : data.message ?? fallback;
}

export function getReviewStatusLabel(value: AssetReviewStatus) {
  return REVIEW_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "未確認";
}
