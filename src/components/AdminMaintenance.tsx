"use client";

import { FormEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_FRAMES_PER_STORE } from "@/lib/frameLimits";

type AdminTab = "assets" | "stores" | "frames";
type AssetReviewStatus = "new" | "candidate" | "hold" | "rejected";
type ReviewStatusFilter = "all" | AssetReviewStatus;
type AssetSortMode = "date" | "store";
type DateSortOrder = "desc" | "asc";
type AssetScreen = "list" | "detail";

type StoreSummary = {
  id: string;
  store_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
};

type StoreMaster = StoreSummary & {
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
};

type StaffMaster = {
  id: string;
  store_id: string;
  staff_code: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
};

type StoreFrame = {
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

type AdminAsset = {
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

type AdminAssetsResponse = {
  stores: StoreSummary[];
  assets: AdminAsset[];
  message?: string;
  detail?: string;
};

type StoresResponse = {
  stores?: StoreMaster[];
  store?: Partial<StoreMaster> & { id: string };
  message?: string;
  detail?: string;
};

type StaffResponse = {
  staff?: StaffMaster[];
  staffMember?: StaffMaster;
  message?: string;
  detail?: string;
};

type StoreAssetUploadResponse = {
  publicUrl?: string;
  store?: Partial<StoreMaster> & { id: string };
  frame?: StoreFrame;
  message?: string;
  detail?: string;
};

type UpdatedAssetResponse = {
  asset?: Pick<AdminAsset, "id" | "description" | "short_caption" | "review_status" | "status" | "hidden_at" | "hidden_reason">;
  message?: string;
  detail?: string;
};

type DeletedAssetResponse = {
  deletedAssetId?: string;
  message?: string;
  detail?: string;
};

type FramesResponse = {
  frames?: StoreFrame[];
  frame?: StoreFrame;
  deletedFrameId?: string;
  message?: string;
  detail?: string;
};

type FrameDraft = {
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

const PIN_STORAGE_KEY = "dog-sns-admin-pin";
const REVIEW_STATUS_OPTIONS: { value: AssetReviewStatus; label: string }[] = [
  { value: "new", label: "未確認" },
  { value: "candidate", label: "投稿候補" },
  { value: "hold", label: "保留" },
  { value: "rejected", label: "使用しない" },
];

const emptyStoreDraft: StoreMaster = {
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
};

const emptyFrameDraft: FrameDraft = {
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

const DATE_MARKER_COLORS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#111111" },
  { label: "赤", value: "#d73a31" },
  { label: "青", value: "#1d64d8" },
  { label: "黄", value: "#f2c94c" },
];

function emptyStaffDraft(storeId = ""): StaffMaster {
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

function getTodayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateTime(value: string) {
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

function nullableText(value: string | null) {
  return value ?? "";
}

function getErrorMessage(data: { message?: string; detail?: string }, fallback: string) {
  return data.detail ? `${data.message ?? fallback} ${data.detail}` : data.message ?? fallback;
}

function getReviewStatusLabel(value: AssetReviewStatus) {
  return REVIEW_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? "未確認";
}

function AdminDatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    const picker = input as HTMLInputElement & { showPicker?: () => void };
    if (picker.showPicker) {
      picker.showPicker();
      return;
    }
    input.focus();
    input.click();
  }

  return (
    <label className="field-label admin-date-picker">
      {label}
      <span className="admin-date-picker-control">
        <input
          ref={inputRef}
          type="date"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
        />
        <button className="admin-date-picker-button" type="button" onClick={openPicker}>
          カレンダー
        </button>
      </span>
    </label>
  );
}

export function AdminMaintenance() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("assets");
  const [assetScreen, setAssetScreen] = useState<AssetScreen>("list");
  const [stores, setStores] = useState<StoreSummary[]>([]);
  const [storeMasters, setStoreMasters] = useState<StoreMaster[]>([]);
  const [staffMasters, setStaffMasters] = useState<StaffMaster[]>([]);
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState(getTodayLabel);
  const [dateTo, setDateTo] = useState(getTodayLabel);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [reviewStatusFilter, setReviewStatusFilter] = useState<ReviewStatusFilter>("all");
  const [sortMode, setSortMode] = useState<AssetSortMode>("date");
  const [dateOrder, setDateOrder] = useState<DateSortOrder>("desc");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedStoreMasterId, setSelectedStoreMasterId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [includeInactiveStores, setIncludeInactiveStores] = useState(false);
  const [includeInactiveStaff, setIncludeInactiveStaff] = useState(false);
  const [storeDraft, setStoreDraft] = useState<StoreMaster>(emptyStoreDraft);
  const [staffDraft, setStaffDraft] = useState<StaffMaster>(emptyStaffDraft());
  const [newStaffDraft, setNewStaffDraft] = useState<StaffMaster>(emptyStaffDraft());
  const [shortCaptionDraft, setShortCaptionDraft] = useState("");
  const [reviewStatusDraft, setReviewStatusDraft] = useState<AssetReviewStatus>("new");
  const [hiddenReasonDraft, setHiddenReasonDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [activeTab]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  const selectedStoreMaster = useMemo(
    () => storeMasters.find((store) => store.id === selectedStoreMasterId) ?? null,
    [storeMasters, selectedStoreMasterId]
  );

  const selectedStaff = useMemo(
    () => staffMasters.find((staff) => staff.id === selectedStaffId) ?? null,
    [staffMasters, selectedStaffId]
  );

  const selectedAssetQueue = useMemo(() => {
    const visibleIds = new Set(assets.map((asset) => asset.id));
    const checkedIds = selectedAssetIds.filter((id) => visibleIds.has(id));
    if (checkedIds.length > 0) return checkedIds;
    return selectedAssetId && visibleIds.has(selectedAssetId) ? [selectedAssetId] : [];
  }, [assets, selectedAssetId, selectedAssetIds]);

  const selectedAssetIndex = selectedAsset ? selectedAssetQueue.indexOf(selectedAsset.id) : -1;
  const canGoPreviousAsset = selectedAssetIndex > 0;
  const canGoNextAsset = selectedAssetIndex >= 0 && selectedAssetIndex < selectedAssetQueue.length - 1;

  const staffByStore = useMemo(() => {
    const map = new Map<string, StaffMaster[]>();
    for (const staff of staffMasters) {
      if (!includeInactiveStaff && !staff.is_active) continue;
      const list = map.get(staff.store_id) ?? [];
      list.push(staff);
      map.set(staff.store_id, list);
    }
    return map;
  }, [staffMasters, includeInactiveStaff]);
  const visibleStoreMasters = useMemo(
    () => storeMasters.filter((store) => includeInactiveStores || store.is_active),
    [storeMasters, includeInactiveStores]
  );

  useEffect(() => {
    const storedPin = window.sessionStorage.getItem(PIN_STORAGE_KEY) ?? "";
    if (storedPin) {
      setAdminPin(storedPin);
      setPinInput(storedPin);
    }
  }, []);

  const handleAuthError = useCallback((status: number) => {
    if (status !== 401) return;
    window.sessionStorage.removeItem(PIN_STORAGE_KEY);
    setAdminPin("");
  }, []);

  const loadAssets = useCallback(async (pin = adminPin) => {
    if (!pin) return;
    setIsLoading(true);
    setMessage("");

    const params = new URLSearchParams();
    if (selectedStoreIds.length > 0) params.set("storeIds", selectedStoreIds.join(","));
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (includeArchived) params.set("includeArchived", "true");
    if (reviewStatusFilter !== "all") params.set("reviewStatus", reviewStatusFilter);
    params.set("sortMode", sortMode);
    params.set("dateOrder", dateOrder);

    try {
      const response = await fetch(`/api/admin/assets?${params.toString()}`, {
        headers: { "x-admin-pin": pin },
      });
      const data = (await response.json()) as AdminAssetsResponse;

      if (!response.ok) {
        setMessage(getErrorMessage(data, "取得できませんでした。"));
        handleAuthError(response.status);
        return;
      }

      const visibleIds = new Set(data.assets.map((asset) => asset.id));
      setStores(data.stores);
      setAssets(data.assets);
      setSelectedAssetIds((current) => current.filter((id) => visibleIds.has(id)));
      setSelectedAssetId((currentId) => {
        if (currentId && visibleIds.has(currentId)) return currentId;
        return data.assets[0]?.id ?? null;
      });
      if (data.assets.length === 0) {
        setAssetScreen("list");
        setMessage("条件に合う写真はありません。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "写真一覧を取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, dateFrom, dateOrder, dateTo, handleAuthError, includeArchived, reviewStatusFilter, selectedStoreIds, sortMode]);

  const loadStoreMasters = useCallback(async (pin = adminPin) => {
    if (!pin) return;
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/stores", {
        headers: { "x-admin-pin": pin },
      });
      const data = (await response.json()) as StoresResponse;

      if (!response.ok || !data.stores) {
        setMessage(getErrorMessage(data, "店舗マスタを取得できませんでした。"));
        handleAuthError(response.status);
        return;
      }

      const loadedStores = data.stores;
      setStoreMasters(loadedStores);
      setStores(loadedStores);
      setSelectedStoreMasterId((currentId) => {
        if (currentId && loadedStores.some((store) => store.id === currentId)) return currentId;
        return loadedStores[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店舗マスタを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, handleAuthError]);

  const loadStaffMasters = useCallback(async (pin = adminPin) => {
    if (!pin) return;
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/staff", {
        headers: { "x-admin-pin": pin },
      });
      const data = (await response.json()) as StaffResponse;

      if (!response.ok || !data.staff) {
        setMessage(getErrorMessage(data, "担当者マスタを取得できませんでした。"));
        handleAuthError(response.status);
        return;
      }

      setStaffMasters(data.staff);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "担当者マスタを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, handleAuthError]);

  useEffect(() => {
    if (!adminPin) return;
    void loadStoreMasters(adminPin);
    void loadStaffMasters(adminPin);
  }, [adminPin, loadStaffMasters, loadStoreMasters]);

  useEffect(() => {
    if (!adminPin) return;
    void loadAssets(adminPin);
  }, [adminPin, loadAssets]);

  useEffect(() => {
    setShortCaptionDraft(selectedAsset?.short_caption ?? "");
    setReviewStatusDraft(selectedAsset?.review_status ?? "new");
    setHiddenReasonDraft(selectedAsset?.hidden_reason ?? "");
  }, [selectedAsset]);

  useEffect(() => {
    setStoreDraft(selectedStoreMaster ?? emptyStoreDraft);
  }, [selectedStoreMaster]);

  useEffect(() => {
    if (selectedStaff) setStaffDraft(selectedStaff);
  }, [selectedStaff]);

  useEffect(() => {
    setSelectedStaffId((currentId) => {
      if (!currentId) return currentId;
      const stillValid = staffMasters.some((staff) => staff.id === currentId);
      return stillValid ? currentId : null;
    });
  }, [staffMasters]);

  function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPin = pinInput.trim();
    if (!nextPin) return;
    window.sessionStorage.setItem(PIN_STORAGE_KEY, nextPin);
    setAdminPin(nextPin);
  }

  function toggleStore(storeId: string) {
    setSelectedStoreIds((current) =>
      current.includes(storeId) ? current.filter((id) => id !== storeId) : [...current, storeId]
    );
  }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssetIds((current) =>
      current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]
    );
  }

  function startAssetReview(assetId?: string) {
    const targetIds = assetId ? [assetId] : selectedAssetIds.filter((id) => assets.some((asset) => asset.id === id));
    if (targetIds.length === 0) {
      setMessage("確認する写真を選択してください。");
      return;
    }
    if (assetId) setSelectedAssetIds(targetIds);
    setSelectedAssetId(targetIds[0]);
    setAssetScreen("detail");
    setMessage("");
  }

  function moveSelectedAsset(offset: number) {
    if (selectedAssetIndex < 0) return;
    const nextId = selectedAssetQueue[selectedAssetIndex + offset];
    if (!nextId) return;
    setSelectedAssetId(nextId);
  }

  async function updateSelectedAsset(payload: Record<string, unknown>, successMessage: string) {
    if (!selectedAsset || !adminPin) return false;
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/assets/${selectedAsset.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as UpdatedAssetResponse;

      if (!response.ok || !data.asset) {
        setMessage(getErrorMessage(data, "更新できませんでした。"));
        return false;
      }

      setAssets((current) =>
        current.map((asset) =>
          asset.id === data.asset?.id
            ? {
                ...asset,
                description: data.asset.description,
                short_caption: data.asset.short_caption,
                review_status: data.asset.review_status,
                status: data.asset.status,
                hidden_at: data.asset.hidden_at,
                hidden_reason: data.asset.hidden_reason,
              }
            : asset
        )
      );
      setMessage(successMessage);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新できませんでした。");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSelectedAsset() {
    if (!selectedAsset || !adminPin) return;

    const confirmed = window.confirm("この写真を完全に削除します。元に戻せません。よろしいですか？");
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/assets/${selectedAsset.id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": adminPin },
      });
      const data = (await response.json()) as DeletedAssetResponse;

      if (!response.ok || !data.deletedAssetId) {
        setMessage(getErrorMessage(data, "写真を削除できませんでした。"));
        return;
      }

      setAssets((current) => current.filter((asset) => asset.id !== data.deletedAssetId));
      setAssetScreen("list");
      setMessage("写真を削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "写真を削除できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCurrentAsset(advance: boolean) {
    const saved = await updateSelectedAsset(
      { shortCaption: shortCaptionDraft, reviewStatus: reviewStatusDraft, action: "update" },
      advance && canGoNextAsset ? "保存しました。次の写真へ進みます。" : "確認状態と一言メモを保存しました。"
    );
    if (saved && advance && canGoNextAsset) moveSelectedAsset(1);
  }

  async function saveStoreMaster() {
    if (!adminPin || !storeDraft.id) return;
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/stores/${storeDraft.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          storeName: storeDraft.store_name,
          displayName: storeDraft.display_name,
          logoUrl: storeDraft.logo_url,
          frameUrl: storeDraft.frame_url,
          themeColor: storeDraft.theme_color,
          snsDisplayName: storeDraft.sns_display_name,
          instagramAccount: storeDraft.instagram_account,
          defaultHashtags: storeDraft.default_hashtags,
          address: storeDraft.address,
          phone: storeDraft.phone,
          businessHoursNote: storeDraft.business_hours_note,
          isActive: storeDraft.is_active,
          sortOrder: storeDraft.sort_order,
          notes: storeDraft.notes,
        }),
      });
      const data = (await response.json()) as StoresResponse;

      if (!response.ok || !data.store) {
        setMessage(getErrorMessage(data, "店舗マスタを保存できませんでした。"));
        return;
      }

      const updatedStore = { ...storeDraft, ...data.store };
      setStoreMasters((current) => current.map((store) => (store.id === updatedStore.id ? updatedStore : store)));
      setStores((current) =>
        current.map((store) =>
          store.id === updatedStore.id
            ? {
                id: updatedStore.id,
                store_code: updatedStore.store_code,
                display_name: updatedStore.display_name,
                is_active: updatedStore.is_active,
                sort_order: updatedStore.sort_order,
              }
            : store
        )
      );
      setStoreDraft(updatedStore);
      setMessage("店舗マスタを保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店舗マスタを保存できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveStaffMaster() {
    if (!adminPin || !staffDraft.id) return;
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/staff/${staffDraft.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          displayName: staffDraft.display_name,
          isActive: staffDraft.is_active,
          sortOrder: staffDraft.sort_order,
          notes: staffDraft.notes,
        }),
      });
      const data = (await response.json()) as StaffResponse;

      if (!response.ok || !data.staffMember) {
        setMessage(getErrorMessage(data, "担当者マスタを保存できませんでした。"));
        return;
      }

      setStaffMasters((current) =>
        current.map((staff) => (staff.id === data.staffMember?.id ? data.staffMember : staff))
      );
      setStaffDraft(data.staffMember);
      setMessage("担当者マスタを保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "担当者マスタを保存できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  async function createStaffMember() {
    if (!adminPin) return;
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          storeId: newStaffDraft.store_id,
          displayName: newStaffDraft.display_name,
          sortOrder: newStaffDraft.sort_order,
          notes: newStaffDraft.notes,
        }),
      });
      const data = (await response.json()) as StaffResponse;

      if (!response.ok || !data.staffMember) {
        setMessage(getErrorMessage(data, "担当者を追加できませんでした。"));
        return;
      }

      setStaffMasters((current) => [...current, data.staffMember as StaffMaster]);
      setSelectedStaffId(data.staffMember.id);
      setIsCreatingStaff(false);
      setNewStaffDraft(emptyStaffDraft(data.staffMember.store_id));
      setMessage("担当者を追加しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "担当者を追加できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  if (!adminPin) {
    return (
      <div className="admin-login-panel">
        <div className="page-heading">
          <p className="eyebrow">本部メンテナンス</p>
          <h1>写真管理</h1>
        </div>
        <form className="login-form" onSubmit={handlePinSubmit}>
          <label className="field-label">
            本部PIN
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="action-button" type="submit">
            開く
          </button>
        </form>
        {message ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="admin-maintenance">
      <div className="top-action-bar">
        <div>
          <p className="eyebrow">本部メンテナンス</p>
          <h1>管理画面</h1>
        </div>
        <button
          className="action-button secondary"
          type="button"
          onClick={() => {
            setAssetScreen("list");
            void loadAssets();
            void loadStoreMasters();
            void loadStaffMasters();
          }}
        >
          再読み込み
        </button>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="本部メンテナンス切替">
        <button className={activeTab === "assets" ? "is-selected" : ""} type="button" onClick={() => setActiveTab("assets")}>
          写真
        </button>
        <button className={activeTab === "stores" ? "is-selected" : ""} type="button" onClick={() => setActiveTab("stores")}>
          店舗
        </button>
        <button className={activeTab === "frames" ? "is-selected" : ""} type="button" onClick={() => setActiveTab("frames")}>
          枠
        </button>
      </div>

      {message ? <p className="notice">{message}</p> : null}

      {activeTab === "assets" && assetScreen === "list" ? (
        <>
          <section className="admin-filter-panel">
            <div className="admin-date-row">
              <AdminDatePicker label="開始日" value={dateFrom} onChange={setDateFrom} />
              <AdminDatePicker label="終了日" value={dateTo} onChange={setDateTo} />
              <label className="field-label">
                確認状態
                <select
                  value={reviewStatusFilter}
                  onChange={(event) => setReviewStatusFilter(event.target.value as ReviewStatusFilter)}
                >
                  <option value="all">すべて</option>
                  {REVIEW_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                並び順
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as AssetSortMode)}>
                  <option value="date">日付順</option>
                  <option value="store">店順</option>
                </select>
              </label>
              <label className="field-label">
                日付方向
                <select value={dateOrder} onChange={(event) => setDateOrder(event.target.value as DateSortOrder)}>
                  <option value="desc">新しい順</option>
                  <option value="asc">古い順</option>
                </select>
              </label>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                />
                非表示も表示
              </label>
              <button
                className="action-button"
                type="button"
                onClick={() => {
                  setAssetScreen("list");
                  void loadAssets();
                }}
                disabled={isLoading}
              >
                {isLoading ? "取得中" : "条件で表示"}
              </button>
            </div>

            <div className="admin-store-list">
              {stores.map((store) => (
                <label key={store.id} className="admin-store-chip">
                  <input
                    type="checkbox"
                    checked={selectedStoreIds.includes(store.id)}
                    onChange={() => toggleStore(store.id)}
                  />
                  {store.display_name}
                </label>
              ))}
            </div>
          </section>

          <section className="admin-filter-panel">
            <div className="top-action-bar compact-action-bar">
              <div>
                <p className="eyebrow">選択確認</p>
                <h2>{selectedAssetIds.length}枚選択中</h2>
              </div>
              <div className="admin-store-list">
                <button className="action-button secondary" type="button" onClick={() => setSelectedAssetIds(assets.map((asset) => asset.id))}>
                  表示中をすべて選択
                </button>
                <button className="action-button secondary" type="button" onClick={() => setSelectedAssetIds([])}>
                  選択解除
                </button>
                <button className="action-button" type="button" disabled={selectedAssetIds.length === 0} onClick={() => startAssetReview()}>
                  選択した写真を確認
                </button>
              </div>
            </div>
          </section>

          <section className="admin-photo-list">
            {assets.map((asset) => {
              const isChecked = selectedAssetIds.includes(asset.id);
              return (
                <article
                  key={asset.id}
                  className={`admin-photo-card${isChecked || selectedAssetId === asset.id ? " is-selected" : ""}${
                    asset.status === "archived" ? " is-archived" : ""
                  }`}
                >
                  <label className="admin-toggle" style={{ margin: "10px 10px 0" }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleAssetSelection(asset.id)} />
                    選択
                  </label>
                  <button
                    type="button"
                    onClick={() => startAssetReview(asset.id)}
                    style={{ border: 0, background: "transparent", color: "inherit", padding: 0, textAlign: "left" }}
                  >
                    <img src={asset.final_processed_url} alt={asset.manage_code} loading="lazy" />
                    <span className="admin-card-meta">
                      <strong>{asset.store_display_name}</strong>
                      <span>{formatDateTime(asset.captured_at)}</span>
                      <span>{asset.staff_display_name ?? "担当者未設定"}</span>
                      <span>{getReviewStatusLabel(asset.review_status)}</span>
                      <span className="admin-card-caption">{asset.short_caption || " "}</span>
                      {asset.status === "archived" ? <em>非表示</em> : null}
                    </span>
                  </button>
                </article>
              );
            })}
          </section>
        </>
      ) : null}

      {activeTab === "assets" && assetScreen === "detail" ? (
        <section className="admin-edit-panel">
          <div className="top-action-bar compact-action-bar">
            <div>
              <p className="eyebrow">写真詳細</p>
              <h2>{selectedAsset ? selectedAsset.store_display_name : "写真を選択してください"}</h2>
              {selectedAssetQueue.length > 0 && selectedAssetIndex >= 0 ? (
                <p>{selectedAssetIndex + 1} / {selectedAssetQueue.length} 枚目</p>
              ) : null}
            </div>
            <div className="admin-store-list">
              <button className="action-button secondary" type="button" disabled={!canGoPreviousAsset} onClick={() => moveSelectedAsset(-1)}>
                前へ
              </button>
              <button className="action-button secondary" type="button" disabled={!canGoNextAsset} onClick={() => moveSelectedAsset(1)}>
                次へ
              </button>
              <button className="action-button secondary" type="button" onClick={() => setAssetScreen("list")}>
                一覧へ戻る
              </button>
            </div>
          </div>

          {selectedAsset ? (
            <>
              <img src={selectedAsset.final_processed_url} alt={selectedAsset.manage_code} />
              <dl className="settings-list">
                <div>
                  <dt>管理番号</dt>
                  <dd>{selectedAsset.manage_code}</dd>
                </div>
                <div>
                  <dt>撮影日時</dt>
                  <dd>{formatDateTime(selectedAsset.captured_at)}</dd>
                </div>
                <div>
                  <dt>店舗</dt>
                  <dd>{selectedAsset.store_display_name}</dd>
                </div>
                <div>
                  <dt>担当者</dt>
                  <dd>{selectedAsset.staff_display_name ?? "未設定"}</dd>
                </div>
                <div>
                  <dt>確認状態</dt>
                  <dd>{getReviewStatusLabel(selectedAsset.review_status)}</dd>
                </div>
              </dl>

              <div className="admin-form-grid">
                <label className="field-label">
                  確認状態
                  <select
                    value={reviewStatusDraft}
                    onChange={(event) => setReviewStatusDraft(event.target.value as AssetReviewStatus)}
                  >
                    {REVIEW_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  一言メモ
                  <input
                    type="text"
                    maxLength={40}
                    value={shortCaptionDraft}
                    onChange={(event) => setShortCaptionDraft(event.target.value)}
                  />
                </label>
              </div>
              <div className="admin-store-list">
                <button className="action-button secondary" type="button" disabled={isSaving} onClick={() => void saveCurrentAsset(false)}>
                  保存
                </button>
                <button className="action-button" type="button" disabled={isSaving || !canGoNextAsset} onClick={() => void saveCurrentAsset(true)}>
                  保存して次へ
                </button>
              </div>

              {selectedAsset.status === "archived" ? (
                <button
                  className="action-button secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => void updateSelectedAsset({ action: "restore" }, "写真を表示に戻しました。")}
                >
                  表示に戻す
                </button>
              ) : (
                <div className="admin-hide-box">
                  <label className="field-label">
                    非表示理由
                    <input
                      type="text"
                      maxLength={200}
                      value={hiddenReasonDraft}
                      onChange={(event) => setHiddenReasonDraft(event.target.value)}
                    />
                  </label>
                  <button
                    className="action-button danger"
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void updateSelectedAsset(
                        { action: "archive", hiddenReason: hiddenReasonDraft },
                        "写真を非表示にしました。"
                      )
                    }
                  >
                    非表示にする
                  </button>
                </div>
              )}

              <button className="action-button danger" type="button" disabled={isSaving} onClick={() => void deleteSelectedAsset()}>
                完全に削除する
              </button>
            </>
          ) : (
            <p className="notice">一覧へ戻って写真を選択してください。</p>
          )}
        </section>
      ) : null}

      {activeTab === "stores" ? (
        <section className="admin-stores-tab">
          <div className="admin-store-selector">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={includeInactiveStores}
                onChange={(event) => setIncludeInactiveStores(event.target.checked)}
              />
              停止中の店舗も表示
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={includeInactiveStaff}
                onChange={(event) => setIncludeInactiveStaff(event.target.checked)}
              />
              停止中の担当者も表示
            </label>

            <div className="admin-store-tree">
              {visibleStoreMasters.map((store) => (
                <div key={store.id} className="admin-store-block">
                  <button
                    className={`admin-store-chip${selectedStoreMasterId === store.id ? " is-selected" : ""}${
                      store.is_active ? "" : " is-archived"
                    }`}
                    type="button"
                    onClick={() => {
                      setSelectedStoreMasterId(store.id);
                      setSelectedStaffId(null);
                      setIsCreatingStaff(false);
                    }}
                  >
                    <strong>{store.display_name}</strong>
                    <span>{store.store_code}</span>
                    <span>{store.is_active ? "有効" : "停止中"}</span>
                  </button>

                  <div className="admin-staff-chip-row">
                    {(staffByStore.get(store.id) ?? []).map((staff) => (
                      <button
                        key={staff.id}
                        className={`admin-staff-chip${selectedStaffId === staff.id ? " is-selected" : ""}${
                          staff.is_active ? "" : " is-archived"
                        }`}
                        type="button"
                        onClick={() => {
                          setSelectedStoreMasterId(store.id);
                          setSelectedStaffId(staff.id);
                          setIsCreatingStaff(false);
                        }}
                      >
                        {staff.display_name}
                      </button>
                    ))}
                    <button
                      className={`admin-staff-chip admin-staff-chip-add${
                        isCreatingStaff && selectedStoreMasterId === store.id ? " is-selected" : ""
                      }`}
                      type="button"
                      onClick={() => {
                        setSelectedStoreMasterId(store.id);
                        setSelectedStaffId(null);
                        setIsCreatingStaff(true);
                        setNewStaffDraft(emptyStaffDraft(store.id));
                      }}
                    >
                      ＋追加
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-store-staff-grid">
            <aside className="admin-edit-panel">
              {selectedStoreMaster ? (
                <>
                  <dl className="settings-list">
                    <div>
                      <dt>店舗コード</dt>
                      <dd>{selectedStoreMaster.store_code}</dd>
                    </div>
                    <div>
                      <dt>ログインコード</dt>
                      <dd>{selectedStoreMaster.login_code}</dd>
                    </div>
                  </dl>
                  <div className="admin-form-grid">
                    <label className="field-label">
                      店舗名
                      <input value={storeDraft.store_name} onChange={(event) => setStoreDraft((current) => ({ ...current, store_name: event.target.value }))} />
                    </label>
                    <label className="field-label">
                      表示名
                      <input value={storeDraft.display_name} onChange={(event) => setStoreDraft((current) => ({ ...current, display_name: event.target.value }))} />
                    </label>
                    <label className="field-label">
                      並び順
                      <input type="number" value={storeDraft.sort_order} onChange={(event) => setStoreDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                    </label>
                  </div>
                  <label className="field-label">
                    メモ
                    <textarea rows={3} value={nullableText(storeDraft.notes)} onChange={(event) => setStoreDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </label>
                  <label className="admin-toggle">
                    <input type="checkbox" checked={storeDraft.is_active} onChange={(event) => setStoreDraft((current) => ({ ...current, is_active: event.target.checked }))} />
                    有効
                  </label>
                  <button className="action-button" type="button" disabled={isSaving} onClick={saveStoreMaster}>
                    店舗を保存
                  </button>
                </>
              ) : (
                <p className="notice">店舗を選択してください。</p>
              )}
            </aside>

            <aside className="admin-edit-panel">
              {isCreatingStaff && selectedStoreMaster ? (
                <>
                  <h2>担当者追加</h2>
                  <label className="field-label">
                    担当者名
                    <input value={newStaffDraft.display_name} onChange={(event) => setNewStaffDraft((current) => ({ ...current, display_name: event.target.value }))} />
                  </label>
                  <button className="action-button secondary" type="button" disabled={isSaving} onClick={createStaffMember}>
                    追加
                  </button>
                </>
              ) : selectedStaff ? (
                <>
                  <div className="admin-form-grid">
                    <label className="field-label">
                      担当者名
                      <input value={staffDraft.display_name} onChange={(event) => setStaffDraft((current) => ({ ...current, display_name: event.target.value }))} />
                    </label>
                    <label className="field-label">
                      並び順
                      <input type="number" value={staffDraft.sort_order} onChange={(event) => setStaffDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                    </label>
                  </div>
                  <label className="admin-toggle">
                    <input type="checkbox" checked={staffDraft.is_active} onChange={(event) => setStaffDraft((current) => ({ ...current, is_active: event.target.checked }))} />
                    有効
                  </label>
                  <label className="field-label">
                    メモ
                    <textarea rows={3} value={nullableText(staffDraft.notes)} onChange={(event) => setStaffDraft((current) => ({ ...current, notes: event.target.value }))} />
                  </label>
                  <button className="action-button" type="button" disabled={isSaving} onClick={saveStaffMaster}>
                    担当者を保存
                  </button>
                </>
              ) : (
                <p className="notice">担当者を選ぶか、＋追加してください。</p>
              )}
            </aside>
          </div>
        </section>
      ) : null}

      {activeTab === "frames" ? <AdminFrameMaintenance adminPin={adminPin} /> : null}
    </div>
  );
}

function AdminFrameMaintenance({ adminPin }: { adminPin: string }) {
  const [frameStores, setFrameStores] = useState<StoreMaster[]>([]);
  const [frames, setFrames] = useState<StoreFrame[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FrameDraft>(emptyFrameDraft);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [isFrameSaving, setIsFrameSaving] = useState(false);
  const [frameMessage, setFrameMessage] = useState("");
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const createFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const storeFrames = useMemo(
    () =>
      [...frames]
        .filter((frame) => frame.store_id === selectedStoreId)
        .sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.frame_name.localeCompare(b.frame_name);
        }),
    [frames, selectedStoreId]
  );
  const slots = useMemo(
    () => Array.from({ length: MAX_FRAMES_PER_STORE }, (_, index) => storeFrames[index] ?? null),
    [storeFrames]
  );
  const editingFrame = useMemo(
    () => frames.find((frame) => frame.id === editingFrameId) ?? null,
    [frames, editingFrameId]
  );

  const loadFrameStores = useCallback(async () => {
    if (!adminPin) return;
    setIsFrameLoading(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/stores", { headers: { "x-admin-pin": adminPin } });
      const data = (await response.json()) as StoresResponse;

      if (!response.ok || !data.stores) {
        setFrameMessage(getErrorMessage(data, "店舗一覧を取得できませんでした。"));
        return;
      }

      setFrameStores(data.stores);
      setSelectedStoreId((currentId) => {
        if (currentId && data.stores?.some((store) => store.id === currentId)) return currentId;
        const activeStore = data.stores?.find((store) => store.is_active);
        return activeStore?.id ?? data.stores?.[0]?.id ?? "";
      });
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "店舗一覧を取得できませんでした。");
    } finally {
      setIsFrameLoading(false);
    }
  }, [adminPin]);

  const loadFrames = useCallback(async () => {
    if (!adminPin) return;
    setIsFrameLoading(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/frames", { headers: { "x-admin-pin": adminPin } });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frames) {
        setFrameMessage(getErrorMessage(data, "枠一覧を取得できませんでした。"));
        return;
      }

      setFrames(data.frames);
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠一覧を取得できませんでした。");
    } finally {
      setIsFrameLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    void loadFrameStores();
    void loadFrames();
  }, [loadFrameStores, loadFrames]);

  useEffect(() => {
    setEditingFrameId(null);
  }, [selectedStoreId]);

  useEffect(() => {
    if (!editingFrame) return;
    setEditDraft({
      id: editingFrame.id,
      store_id: editingFrame.store_id,
      frame_url: editingFrame.frame_url,
      is_default: editingFrame.is_default,
      sort_order: editingFrame.sort_order,
      date_enabled: editingFrame.date_enabled,
      date_x: editingFrame.date_x,
      date_y: editingFrame.date_y,
      date_font_size: editingFrame.date_font_size,
      date_color: editingFrame.date_color,
    });
  }, [editingFrame]);

  async function createFrameInSlot(index: number, file: File) {
    if (!adminPin || !selectedStoreId) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", selectedStoreId);
      formData.append("assetType", "frame");
      formData.append("file", file);

      const uploadResponse = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const uploadData = (await uploadResponse.json()) as StoreAssetUploadResponse;

      if (!uploadResponse.ok || !uploadData.publicUrl) {
        setFrameMessage(getErrorMessage(uploadData, "枠画像をアップロードできませんでした。"));
        return;
      }

      const createResponse = await fetch("/api/admin/frames", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          storeId: selectedStoreId,
          frameUrl: uploadData.publicUrl,
          sortOrder: index * 10,
          isDefault: index === 0,
        }),
      });
      const createData = (await createResponse.json()) as FramesResponse;

      if (!createResponse.ok || !createData.frame) {
        setFrameMessage(getErrorMessage(createData, "枠を追加できませんでした。"));
        return;
      }

      setFrames((current) => {
        const withoutOldDefault = createData.frame?.is_default
          ? current.map((frame) => (frame.store_id === createData.frame?.store_id ? { ...frame, is_default: false } : frame))
          : current;
        return [...withoutOldDefault, createData.frame as StoreFrame];
      });
      setFrameMessage("枠を追加しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を追加できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function saveEditDraft() {
    if (!adminPin || !editDraft.id) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch(`/api/admin/frames/${editDraft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          frameUrl: editDraft.frame_url,
          isDefault: editDraft.is_default,
          sortOrder: editDraft.sort_order,
          dateEnabled: editDraft.date_enabled,
          dateX: editDraft.date_x,
          dateY: editDraft.date_y,
          dateFontSize: editDraft.date_font_size,
          dateColor: editDraft.date_color,
        }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠を保存できませんでした。"));
        return;
      }

      setFrames((current) =>
        current.map((frame) => {
          if (frame.id === data.frame?.id) return data.frame as StoreFrame;
          if (data.frame?.is_default && frame.store_id === data.frame.store_id) return { ...frame, is_default: false };
          return frame;
        })
      );
      setEditingFrameId(null);
      setFrameMessage("枠を保存しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を保存できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function deleteEditingFrame() {
    if (!adminPin || !editingFrame) return;

    const confirmed = window.confirm("この枠を削除します。よろしいですか？");
    if (!confirmed) return;

    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch(`/api/admin/frames/${editingFrame.id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": adminPin },
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.deletedFrameId) {
        setFrameMessage(getErrorMessage(data, "枠を削除できませんでした。"));
        return;
      }

      setFrames((current) => current.filter((frame) => frame.id !== data.deletedFrameId));
      setEditingFrameId(null);
      setFrameMessage("枠を削除しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を削除できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function replaceEditingFrameImage(file: File) {
    if (!adminPin || !editingFrame) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", editingFrame.store_id);
      formData.append("assetType", "frame");
      formData.append("file", file);
      formData.append("frameId", editingFrame.id);

      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const data = (await response.json()) as StoreAssetUploadResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠画像を差し替えできませんでした。"));
        return;
      }

      const updatedFrame = data.frame;
      setFrames((current) => current.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame)));
      setEditDraft((current) => ({ ...current, frame_url: updatedFrame.frame_url }));
      setFrameMessage("枠画像を差し替えました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠画像を差し替えできませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function reorderFrames(nextOrderedIds: string[]) {
    if (!adminPin || !selectedStoreId) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/frames/reorder", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({ storeId: selectedStoreId, frameIds: nextOrderedIds }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frames) {
        setFrameMessage(getErrorMessage(data, "並び替えできませんでした。"));
        return;
      }

      const reorderedFrames = data.frames;
      setFrames((current) => [
        ...current.filter((frame) => frame.store_id !== selectedStoreId),
        ...reorderedFrames,
      ]);
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "並び替えできませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  function handleSlotDrop(targetIndex: number) {
    const draggedId = draggingFrameId;
    setDraggingFrameId(null);
    setDragOverIndex(null);
    if (!draggedId) return;

    const currentIds = storeFrames.map((frame) => frame.id);
    const fromIndex = currentIds.indexOf(draggedId);
    if (fromIndex === -1) return;

    const nextIds = [...currentIds];
    nextIds.splice(fromIndex, 1);
    const insertAt = Math.min(targetIndex, nextIds.length);
    nextIds.splice(insertAt, 0, draggedId);

    void reorderFrames(nextIds);
  }

  function nudgeDatePosition(dx: number, dy: number) {
    setEditDraft((current) => ({
      ...current,
      date_x: Math.min(Math.max(current.date_x + dx, 0), 1080),
      date_y: Math.min(Math.max(current.date_y + dy, 0), 1080),
    }));
  }

  function nudgeFontSize(delta: number) {
    setEditDraft((current) => ({
      ...current,
      date_font_size: Math.min(Math.max(current.date_font_size + delta, 12), 96),
    }));
  }

  function updateMarkerFromPointer(clientX: number, clientY: number) {
    const wrap = previewRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 1080, 0), 1080);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 1080, 0), 1080);
    setEditDraft((current) => ({ ...current, date_x: Math.round(x), date_y: Math.round(y) }));
  }

  function handleMarkerPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateMarkerFromPointer(event.clientX, event.clientY);
  }

  function handleMarkerPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    updateMarkerFromPointer(event.clientX, event.clientY);
  }

  return (
    <section className="admin-frame-tab">
      <label className="field-label">
        店舗
        <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
          {frameStores.filter((store) => store.is_active).map((store) => (
            <option key={store.id} value={store.id}>
              {store.display_name}
            </option>
          ))}
        </select>
      </label>

      {frameMessage ? <p className="notice">{frameMessage}</p> : null}

      <div className="frame-slot-row">
        {slots.map((frame, index) =>
          frame ? (
            <div
              key={frame.id}
              className={`frame-slot-thumb${draggingFrameId === frame.id ? " is-dragging" : ""}${
                dragOverIndex === index ? " is-drag-over" : ""
              }`}
              draggable
              onDragStart={() => setDraggingFrameId(frame.id)}
              onDragEnd={() => {
                setDraggingFrameId(null);
                setDragOverIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleSlotDrop(index);
              }}
              onClick={() => setEditingFrameId(frame.id)}
            >
              <img src={frame.frame_url} alt="枠" />
              {index === 0 && <span className="frame-slot-badge">標準</span>}
            </div>
          ) : (
            <div
              key={`blank-${index}`}
              className={`frame-slot-blank${dragOverIndex === index ? " is-drag-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleSlotDrop(index);
              }}
              onClick={() => createFileInputRefs.current[index]?.click()}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <input
                ref={(element) => {
                  createFileInputRefs.current[index] = element;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isFrameSaving || isFrameLoading}
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (file) void createFrameInSlot(index, file);
                }}
              />
            </div>
          )
        )}
      </div>

      {editingFrame && (
        <div className="photo-preview-overlay admin-frame-edit-overlay" role="dialog" aria-modal="true" aria-label="枠編集">
          <button className="icon-button admin-frame-edit-close" type="button" onClick={() => setEditingFrameId(null)} aria-label="閉じる">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <div className="admin-frame-edit-panel">
            <div className="frame-date-preview" ref={previewRef}>
              <img src={editDraft.frame_url} alt="枠プレビュー" />
              {editDraft.date_enabled && (
                <div
                  className="frame-date-marker"
                  style={{
                    left: `${(editDraft.date_x / 1080) * 100}%`,
                    top: `${(editDraft.date_y / 1080) * 100}%`,
                    color: editDraft.date_color,
                  }}
                  onPointerDown={handleMarkerPointerDown}
                  onPointerMove={handleMarkerPointerMove}
                >
                  2026.07.08
                </div>
              )}
            </div>

            <div className="toolbar">
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(0, -10)} aria-label="日付を上へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(0, 10)} aria-label="日付を下へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(-10, 0)} aria-label="日付を左へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(10, 0)} aria-label="日付を右へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button className="mini-control-button" type="button" onClick={() => nudgeFontSize(-2)} aria-label="文字を小さく">
                −
              </button>
              <span className="text-count">{editDraft.date_font_size}</span>
              <button className="mini-control-button" type="button" onClick={() => nudgeFontSize(2)} aria-label="文字を大きく">
                ＋
              </button>
            </div>

            <div className="canvas-text-color-row" aria-label="日付の色">
              {DATE_MARKER_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`mini-color-button${editDraft.date_color === color.value ? " is-selected" : ""}`}
                  type="button"
                  style={{ backgroundColor: color.value }}
                  onClick={() => setEditDraft((current) => ({ ...current, date_color: color.value }))}
                  aria-label={`${color.label}にする`}
                />
              ))}
            </div>

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={editDraft.date_enabled}
                onChange={(event) => setEditDraft((current) => ({ ...current, date_enabled: event.target.checked }))}
              />
              日付を表示
            </label>

            <label className="field-label">
              画像差し替え
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isFrameSaving}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (file) void replaceEditingFrameImage(file);
                }}
              />
            </label>

            <div className="toolbar">
              <button className="action-button" type="button" disabled={isFrameSaving} onClick={saveEditDraft}>
                保存
              </button>
              <button className="icon-button danger" type="button" disabled={isFrameSaving} onClick={deleteEditingFrame} aria-label="削除">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
