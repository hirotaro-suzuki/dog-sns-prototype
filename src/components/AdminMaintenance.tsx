"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AdminTab = "assets" | "stores" | "staff" | "frames";
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
  role_label: string | null;
  can_approve_sns: boolean;
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
  is_active: boolean;
  sort_order: number;
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

type FramesResponse = {
  frames?: StoreFrame[];
  frame?: StoreFrame;
  message?: string;
  detail?: string;
};

type FrameDraft = {
  id: string;
  store_id: string;
  frame_name: string;
  frame_url: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
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
  frame_name: "",
  frame_url: "",
  is_default: false,
  is_active: true,
  sort_order: 0,
};

function emptyStaffDraft(storeId = ""): StaffMaster {
  return {
    id: "",
    store_id: storeId,
    staff_code: "",
    display_name: "",
    role_label: "",
    can_approve_sns: false,
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
  const [storeDraft, setStoreDraft] = useState<StoreMaster>(emptyStoreDraft);
  const [staffDraft, setStaffDraft] = useState<StaffMaster>(emptyStaffDraft());
  const [newStaffDraft, setNewStaffDraft] = useState<StaffMaster>(emptyStaffDraft());
  const [shortCaptionDraft, setShortCaptionDraft] = useState("");
  const [reviewStatusDraft, setReviewStatusDraft] = useState<AssetReviewStatus>("new");
  const [hiddenReasonDraft, setHiddenReasonDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [message, setMessage] = useState("");

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

  const staffStoreId = staffDraft.store_id || selectedStoreMasterId || stores[0]?.id || "";
  const visibleStaff = useMemo(
    () => staffMasters.filter((staff) => !staffStoreId || staff.store_id === staffStoreId),
    [staffMasters, staffStoreId]
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

      setStoreMasters(data.stores);
      setStores(data.stores);
      const nextSelectedId =
        selectedStoreMasterId && data.stores.some((store) => store.id === selectedStoreMasterId)
          ? selectedStoreMasterId
          : data.stores[0]?.id ?? null;
      setSelectedStoreMasterId(nextSelectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店舗マスタを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, handleAuthError, selectedStoreMasterId]);

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
      setSelectedStaffId((currentId) => {
        if (currentId && data.staff?.some((staff) => staff.id === currentId)) return currentId;
        return data.staff?.[0]?.id ?? null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "担当者マスタを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, handleAuthError]);

  useEffect(() => {
    if (!adminPin) return;
    void loadAssets(adminPin);
    void loadStoreMasters(adminPin);
    void loadStaffMasters(adminPin);
  }, [adminPin, loadAssets, loadStaffMasters, loadStoreMasters]);

  useEffect(() => {
    setShortCaptionDraft(selectedAsset?.short_caption ?? "");
    setReviewStatusDraft(selectedAsset?.review_status ?? "new");
    setHiddenReasonDraft(selectedAsset?.hidden_reason ?? "");
  }, [selectedAsset]);

  useEffect(() => {
    setStoreDraft(selectedStoreMaster ?? emptyStoreDraft);
  }, [selectedStoreMaster]);

  useEffect(() => {
    setStaffDraft(selectedStaff ?? emptyStaffDraft(stores[0]?.id ?? ""));
  }, [selectedStaff, stores]);

  useEffect(() => {
    setNewStaffDraft((current) => ({
      ...current,
      store_id: current.store_id || selectedStoreMasterId || stores[0]?.id || "",
    }));
  }, [selectedStoreMasterId, stores]);

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

  async function uploadStoreLogo(file: File | null) {
    if (!adminPin || !storeDraft.id || !file) return;
    setIsUploadingAsset(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", storeDraft.id);
      formData.append("assetType", "logo");
      formData.append("file", file);

      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const data = (await response.json()) as StoreAssetUploadResponse;

      if (!response.ok || !data.publicUrl) {
        setMessage(getErrorMessage(data, "ロゴをアップロードできませんでした。"));
        return;
      }

      const updatedStore = { ...storeDraft, logo_url: data.publicUrl };
      setStoreDraft(updatedStore);
      setStoreMasters((current) =>
        current.map((store) =>
          store.id === updatedStore.id ? { ...store, logo_url: data.publicUrl ?? store.logo_url } : store
        )
      );
      setMessage("ロゴをアップロードして店舗マスタへ保存しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ロゴをアップロードできませんでした。");
    } finally {
      setIsUploadingAsset(false);
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
          roleLabel: staffDraft.role_label,
          canApproveSns: staffDraft.can_approve_sns,
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
          staffCode: newStaffDraft.staff_code,
          displayName: newStaffDraft.display_name,
          roleLabel: newStaffDraft.role_label,
          canApproveSns: newStaffDraft.can_approve_sns,
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
        <button className={activeTab === "staff" ? "is-selected" : ""} type="button" onClick={() => setActiveTab("staff")}>
          担当者
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
              <label className="field-label">
                開始日
                <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
              </label>
              <label className="field-label">
                終了日
                <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </label>
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
                      {asset.short_caption ? <span>{asset.short_caption}</span> : null}
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
            </>
          ) : (
            <p className="notice">一覧へ戻って写真を選択してください。</p>
          )}
        </section>
      ) : null}

      {activeTab === "stores" ? (
        <section className="admin-main-grid">
          <div className="admin-master-list">
            {storeMasters.map((store) => (
              <button
                key={store.id}
                className={`admin-master-row${selectedStoreMasterId === store.id ? " is-selected" : ""}${
                  store.is_active ? "" : " is-archived"
                }`}
                type="button"
                onClick={() => setSelectedStoreMasterId(store.id)}
              >
                <strong>{store.display_name}</strong>
                <span>{store.store_code}</span>
                <span>{store.is_active ? "有効" : "停止中"}</span>
              </button>
            ))}
          </div>

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
                    SNS表示名
                    <input value={nullableText(storeDraft.sns_display_name)} onChange={(event) => setStoreDraft((current) => ({ ...current, sns_display_name: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    Instagram
                    <input value={nullableText(storeDraft.instagram_account)} onChange={(event) => setStoreDraft((current) => ({ ...current, instagram_account: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    ロゴURL
                    <input value={nullableText(storeDraft.logo_url)} onChange={(event) => setStoreDraft((current) => ({ ...current, logo_url: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    ロゴ画像アップロード
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={isUploadingAsset}
                      onChange={(event) => {
                        void uploadStoreLogo(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <label className="field-label">
                    フレームURL
                    <input value={nullableText(storeDraft.frame_url)} onChange={(event) => setStoreDraft((current) => ({ ...current, frame_url: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    色
                    <input value={nullableText(storeDraft.theme_color)} onChange={(event) => setStoreDraft((current) => ({ ...current, theme_color: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    並び順
                    <input type="number" value={storeDraft.sort_order} onChange={(event) => setStoreDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                  </label>
                </div>
                <label className="field-label">
                  標準ハッシュタグ
                  <textarea rows={3} value={nullableText(storeDraft.default_hashtags)} onChange={(event) => setStoreDraft((current) => ({ ...current, default_hashtags: event.target.value }))} />
                </label>
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
        </section>
      ) : null}

      {activeTab === "staff" ? (
        <section className="admin-main-grid">
          <div className="admin-master-list">
            <label className="field-label">
              店舗
              <select
                value={staffStoreId}
                onChange={(event) => {
                  setStaffDraft((current) => ({ ...current, store_id: event.target.value }));
                  setNewStaffDraft((current) => ({ ...current, store_id: event.target.value }));
                  const firstStaff = staffMasters.find((staff) => staff.store_id === event.target.value);
                  setSelectedStaffId(firstStaff?.id ?? null);
                }}
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.display_name}
                  </option>
                ))}
              </select>
            </label>

            {visibleStaff.map((staff) => (
              <button
                key={staff.id}
                className={`admin-master-row${selectedStaffId === staff.id ? " is-selected" : ""}${staff.is_active ? "" : " is-archived"}`}
                type="button"
                onClick={() => setSelectedStaffId(staff.id)}
              >
                <strong>{staff.display_name}</strong>
                <span>{staff.staff_code}</span>
                <span>{staff.is_active ? "有効" : "停止中"}</span>
              </button>
            ))}

            <div className="admin-create-panel">
              <h2>担当者追加</h2>
              <label className="field-label">
                担当者コード
                <input value={newStaffDraft.staff_code} onChange={(event) => setNewStaffDraft((current) => ({ ...current, staff_code: event.target.value }))} />
              </label>
              <label className="field-label">
                表示名
                <input value={newStaffDraft.display_name} onChange={(event) => setNewStaffDraft((current) => ({ ...current, display_name: event.target.value }))} />
              </label>
              <button className="action-button secondary" type="button" disabled={isSaving} onClick={createStaffMember}>
                追加
              </button>
            </div>
          </div>

          <aside className="admin-edit-panel">
            {selectedStaff ? (
              <>
                <dl className="settings-list">
                  <div>
                    <dt>担当者コード</dt>
                    <dd>{selectedStaff.staff_code}</dd>
                  </div>
                </dl>
                <div className="admin-form-grid">
                  <label className="field-label">
                    表示名
                    <input value={staffDraft.display_name} onChange={(event) => setStaffDraft((current) => ({ ...current, display_name: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    役割
                    <input value={nullableText(staffDraft.role_label)} onChange={(event) => setStaffDraft((current) => ({ ...current, role_label: event.target.value }))} />
                  </label>
                  <label className="field-label">
                    並び順
                    <input type="number" value={staffDraft.sort_order} onChange={(event) => setStaffDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
                  </label>
                </div>
                <label className="admin-toggle">
                  <input type="checkbox" checked={staffDraft.can_approve_sns} onChange={(event) => setStaffDraft((current) => ({ ...current, can_approve_sns: event.target.checked }))} />
                  SNS承認可
                </label>
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
              <p className="notice">担当者を選択してください。</p>
            )}
          </aside>
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
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [frameDraft, setFrameDraft] = useState<FrameDraft>(emptyFrameDraft);
  const [newFrameDraft, setNewFrameDraft] = useState<FrameDraft>(emptyFrameDraft);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [isFrameSaving, setIsFrameSaving] = useState(false);
  const [frameMessage, setFrameMessage] = useState("");

  const visibleFrames = useMemo(() => frames.filter((frame) => frame.store_id === selectedStoreId), [frames, selectedStoreId]);
  const selectedFrame = useMemo(() => frames.find((frame) => frame.id === selectedFrameId) ?? null, [frames, selectedFrameId]);
  const activeFrameCount = visibleFrames.filter((frame) => frame.is_active).length;

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
        return data.stores?.[0]?.id ?? "";
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
      setSelectedFrameId((currentId) => {
        if (currentId && data.frames?.some((frame) => frame.id === currentId)) return currentId;
        return data.frames?.[0]?.id ?? null;
      });
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
    setFrameDraft(selectedFrame ?? { ...emptyFrameDraft, store_id: selectedStoreId });
  }, [selectedFrame, selectedStoreId]);

  useEffect(() => {
    setNewFrameDraft((current) => ({ ...current, store_id: current.store_id || selectedStoreId }));
  }, [selectedStoreId]);

  async function createFrame() {
    if (!adminPin) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/frames", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          storeId: newFrameDraft.store_id,
          frameName: newFrameDraft.frame_name,
          frameUrl: newFrameDraft.frame_url,
          isDefault: newFrameDraft.is_default,
          isActive: newFrameDraft.is_active,
          sortOrder: newFrameDraft.sort_order,
        }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠を追加できませんでした。"));
        return;
      }

      setFrames((current) => {
        const withoutOldDefault = data.frame?.is_default
          ? current.map((frame) => (frame.store_id === data.frame?.store_id ? { ...frame, is_default: false } : frame))
          : current;
        return [...withoutOldDefault, data.frame as StoreFrame];
      });
      setSelectedFrameId(data.frame.id);
      setNewFrameDraft({ ...emptyFrameDraft, store_id: data.frame.store_id });
      setFrameMessage("枠を追加しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を追加できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function saveFrame() {
    if (!adminPin || !frameDraft.id) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch(`/api/admin/frames/${frameDraft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          frameName: frameDraft.frame_name,
          frameUrl: frameDraft.frame_url,
          isDefault: frameDraft.is_default,
          isActive: frameDraft.is_active,
          sortOrder: frameDraft.sort_order,
        }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠を保存できませんでした。"));
        return;
      }

      setFrames((current) =>
        current.map((frame) => {
          if (frame.id === data.frame?.id) return data.frame;
          if (data.frame?.is_default && frame.store_id === data.frame.store_id) return { ...frame, is_default: false };
          return frame;
        })
      );
      setFrameDraft(data.frame);
      setFrameMessage("枠を保存しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を保存できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function uploadFrameImage(file: File | null, target: "new" | "selected") {
    if (!adminPin || !selectedStoreId || !file) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", selectedStoreId);
      formData.append("assetType", "frame");
      formData.append("file", file);
      if (target === "selected" && frameDraft.id) formData.append("frameId", frameDraft.id);

      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const data = (await response.json()) as StoreAssetUploadResponse;

      if (!response.ok || !data.publicUrl) {
        setFrameMessage(getErrorMessage(data, "枠画像をアップロードできませんでした。"));
        return;
      }

      if (target === "selected" && data.frame) {
        setFrames((current) => current.map((frame) => (frame.id === data.frame?.id ? data.frame : frame)));
        setFrameDraft(data.frame);
        setFrameMessage("枠画像をアップロードして保存しました。");
        return;
      }

      if (target === "selected") {
        setFrameDraft((current) => ({ ...current, frame_url: data.publicUrl ?? current.frame_url }));
        setFrameMessage("枠画像をアップロードしました。保存ボタンで反映してください。");
        return;
      }

      setNewFrameDraft((current) => ({ ...current, frame_url: data.publicUrl ?? current.frame_url }));
      setFrameMessage("枠画像をアップロードしました。枠名を確認して追加してください。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠画像をアップロードできませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  return (
    <section className="admin-main-grid">
      <div className="admin-master-list">
        <label className="field-label">
          店舗
          <select
            value={selectedStoreId}
            onChange={(event) => {
              const nextStoreId = event.target.value;
              setSelectedStoreId(nextStoreId);
              setNewFrameDraft((current) => ({ ...current, store_id: nextStoreId }));
              setSelectedFrameId(frames.find((frame) => frame.store_id === nextStoreId)?.id ?? null);
            }}
          >
            {frameStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.display_name}
              </option>
            ))}
          </select>
        </label>

        <p className="notice">有効な枠は1店舗につき最大3件までです。現在 {activeFrameCount} 件。</p>
        {frameMessage ? <p className="notice">{frameMessage}</p> : null}

        {visibleFrames.map((frame) => (
          <button
            key={frame.id}
            className={`admin-master-row${selectedFrameId === frame.id ? " is-selected" : ""}${frame.is_active ? "" : " is-archived"}`}
            type="button"
            onClick={() => setSelectedFrameId(frame.id)}
          >
            <strong>{frame.frame_name}</strong>
            <span>{frame.is_default ? "標準" : "通常"}</span>
            <span>{frame.is_active ? "有効" : "停止中"}</span>
          </button>
        ))}

        <div className="admin-create-panel">
          <h2>枠追加</h2>
          <label className="field-label">
            枠名
            <input value={newFrameDraft.frame_name} onChange={(event) => setNewFrameDraft((current) => ({ ...current, frame_name: event.target.value }))} />
          </label>
          <label className="field-label">
            枠画像URL
            <input value={newFrameDraft.frame_url} onChange={(event) => setNewFrameDraft((current) => ({ ...current, frame_url: event.target.value }))} />
          </label>
          <label className="field-label">
            枠画像アップロード
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={isFrameSaving || isFrameLoading}
              onChange={(event) => {
                void uploadFrameImage(event.target.files?.[0] ?? null, "new");
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button className="action-button secondary" type="button" disabled={isFrameSaving || isFrameLoading} onClick={createFrame}>
            追加
          </button>
        </div>
      </div>

      <aside className="admin-edit-panel">
        {selectedFrame ? (
          <>
            <div className="frame-preview-box">
              <img src={frameDraft.frame_url} alt={frameDraft.frame_name} />
            </div>
            <div className="admin-form-grid">
              <label className="field-label">
                枠名
                <input value={frameDraft.frame_name} onChange={(event) => setFrameDraft((current) => ({ ...current, frame_name: event.target.value }))} />
              </label>
              <label className="field-label">
                並び順
                <input type="number" value={frameDraft.sort_order} onChange={(event) => setFrameDraft((current) => ({ ...current, sort_order: Number(event.target.value) }))} />
              </label>
            </div>
            <label className="field-label">
              枠画像URL
              <input value={frameDraft.frame_url} onChange={(event) => setFrameDraft((current) => ({ ...current, frame_url: event.target.value }))} />
            </label>
            <label className="field-label">
              枠画像アップロード
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isFrameSaving}
                onChange={(event) => {
                  void uploadFrameImage(event.target.files?.[0] ?? null, "selected");
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <label className="admin-toggle">
              <input type="checkbox" checked={frameDraft.is_default} onChange={(event) => setFrameDraft((current) => ({ ...current, is_default: event.target.checked }))} />
              標準枠
            </label>
            <label className="admin-toggle">
              <input type="checkbox" checked={frameDraft.is_active} onChange={(event) => setFrameDraft((current) => ({ ...current, is_active: event.target.checked }))} />
              有効
            </label>
            <button className="action-button" type="button" disabled={isFrameSaving} onClick={saveFrame}>
              枠を保存
            </button>
          </>
        ) : (
          <p className="notice">枠を選択してください。</p>
        )}
      </aside>
    </section>
  );
}
