"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  AdminAsset,
  AdminAssetsResponse,
  AdminTab,
  AssetReviewStatus,
  AssetScreen,
  AssetSortMode,
  DateSortOrder,
  DeletedAssetResponse,
  ReviewStatusFilter,
  StaffMaster,
  StaffResponse,
  StoreMaster,
  StoreSummary,
  StoresResponse,
  UpdatedAssetResponse,
} from "./admin/types";
import {
  PIN_STORAGE_KEY,
  REVIEW_STATUS_OPTIONS,
  emptyStaffDraft,
  emptyStoreDraft,
  formatDateTime,
  getErrorMessage,
  getReviewStatusLabel,
  getTodayLabel,
  nullableText,
} from "./admin/helpers";
import { AdminDatePicker } from "./admin/AdminDatePicker";
import { AdminFrameMaintenance } from "./admin/AdminFrameMaintenance";

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

    const deletedAssetStoreId = selectedAsset.store_id;

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
      setStoreMasters((current) =>
        current.map((store) =>
          store.id === deletedAssetStoreId
            ? { ...store, asset_count: Math.max(0, store.asset_count - 1) }
            : store
        )
      );
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
                asset_count: updatedStore.asset_count,
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

  async function deleteStoreMaster() {
    if (!adminPin || !selectedStoreMaster) return;
    if (selectedStoreMaster.is_active || selectedStoreMaster.asset_count !== 0) return;

    const confirmed = window.confirm(
      `「${selectedStoreMaster.display_name}（${selectedStoreMaster.store_code}）」を完全に削除します。\n` +
        "担当者、登録枠、ロゴ・枠画像も削除され、元に戻せません。よろしいですか？"
    );
    if (!confirmed) return;

    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/stores/${selectedStoreMaster.id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": adminPin },
      });
      const data = (await response.json()) as StoresResponse;

      if (!response.ok || !data.deletedStoreId) {
        setMessage(getErrorMessage(data, "店舗を削除できませんでした。"));
        return;
      }

      const deletedStoreId = data.deletedStoreId;
      const remainingStores = storeMasters.filter((store) => store.id !== deletedStoreId);
      setStoreMasters(remainingStores);
      setStores((current) => current.filter((store) => store.id !== deletedStoreId));
      setStaffMasters((current) => current.filter((staff) => staff.store_id !== deletedStoreId));
      setSelectedStoreIds((current) => current.filter((storeId) => storeId !== deletedStoreId));
      setSelectedStoreMasterId(remainingStores[0]?.id ?? null);
      setSelectedStaffId(null);
      setIsCreatingStaff(false);
      setStoreDraft(remainingStores[0] ?? emptyStoreDraft);
      setMessage(data.storageWarning ?? "店舗を削除しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "店舗を削除できませんでした。");
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
          <h1>本部管理画面</h1>
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
            window.sessionStorage.removeItem(PIN_STORAGE_KEY);
            window.location.assign("/admin");
          }}
        >
          ログアウト
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

      <div className="admin-tab-reload-row">
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

          {assets.length >= 160 && (
            <p className="field-hint">
              一覧に表示できるのは一度に160件までです。ここに出ていない写真も削除されてはいません。店舗や期間で絞り込むと表示できます。
            </p>
          )}

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
                    <div>
                      <dt>保存写真</dt>
                      <dd>{selectedStoreMaster.asset_count}件</dd>
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
                  {selectedStoreMaster.is_active ? (
                    <p className="notice">稼働中の店舗は削除できません。先に停止して保存してください。</p>
                  ) : selectedStoreMaster.asset_count > 0 ? (
                    <p className="notice">保存写真があるため、この店舗は削除できません。</p>
                  ) : (
                    <button className="action-button danger" type="button" disabled={isSaving} onClick={deleteStoreMaster}>
                      店舗を完全に削除
                    </button>
                  )}
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
