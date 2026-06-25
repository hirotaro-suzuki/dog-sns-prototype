"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AdminStore = {
  id: string;
  store_code: string;
  display_name: string;
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
  status: "ready" | "archived";
  hidden_at: string | null;
  hidden_reason: string | null;
  saved_at: string;
};

type AdminAssetsResponse = {
  stores: AdminStore[];
  assets: AdminAsset[];
  message?: string;
  detail?: string;
};

type UpdatedAssetResponse = {
  asset?: Pick<AdminAsset, "id" | "description" | "status" | "hidden_at" | "hidden_reason">;
  message?: string;
  detail?: string;
};

const PIN_STORAGE_KEY = "dog-sns-admin-pin";

function getTodayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminMaintenance() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState(getTodayLabel);
  const [dateTo, setDateTo] = useState(getTodayLabel);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [hiddenReasonDraft, setHiddenReasonDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? null,
    [assets, selectedAssetId]
  );

  useEffect(() => {
    const storedPin = window.sessionStorage.getItem(PIN_STORAGE_KEY) ?? "";
    if (storedPin) {
      setAdminPin(storedPin);
      setPinInput(storedPin);
    }
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

    try {
      const response = await fetch(`/api/admin/assets?${params.toString()}`, {
        headers: { "x-admin-pin": pin },
      });
      const data = (await response.json()) as AdminAssetsResponse;

      if (!response.ok) {
        setMessage(data.detail ? `${data.message ?? "取得できませんでした"} ${data.detail}` : data.message ?? "取得できませんでした");
        if (response.status === 401) {
          window.sessionStorage.removeItem(PIN_STORAGE_KEY);
          setAdminPin("");
        }
        return;
      }

      setStores(data.stores);
      setAssets(data.assets);
      setSelectedAssetId((currentId) => {
        if (currentId && data.assets.some((asset) => asset.id === currentId)) return currentId;
        return data.assets[0]?.id ?? null;
      });
      if (data.assets.length === 0) setMessage("条件に合う写真はありません。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "写真一覧を取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin, dateFrom, dateTo, includeArchived, selectedStoreIds]);

  useEffect(() => {
    if (!adminPin) return;
    void loadAssets(adminPin);
  }, [adminPin, loadAssets]);

  useEffect(() => {
    setDescriptionDraft(selectedAsset?.description ?? "");
    setHiddenReasonDraft(selectedAsset?.hidden_reason ?? "");
  }, [selectedAsset]);

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

  async function updateSelectedAsset(payload: Record<string, unknown>, successMessage: string) {
    if (!selectedAsset || !adminPin) return;
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
        setMessage(data.detail ? `${data.message ?? "更新できませんでした"} ${data.detail}` : data.message ?? "更新できませんでした");
        return;
      }

      setAssets((current) =>
        current.map((asset) =>
          asset.id === data.asset?.id
            ? {
                ...asset,
                description: data.asset.description,
                status: data.asset.status,
                hidden_at: data.asset.hidden_at,
                hidden_reason: data.asset.hidden_reason,
              }
            : asset
        )
      );
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新できませんでした。");
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
          <h1>写真管理</h1>
        </div>
        <button className="action-button secondary" type="button" onClick={() => loadAssets()}>
          再読み込み
        </button>
      </div>

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
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            非表示も表示
          </label>
          <button className="action-button" type="button" onClick={() => loadAssets()} disabled={isLoading}>
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

      {message ? <p className="notice">{message}</p> : null}

      <section className="admin-main-grid">
        <div className="admin-photo-list">
          {assets.map((asset) => (
            <button
              key={asset.id}
              className={`admin-photo-card${selectedAssetId === asset.id ? " is-selected" : ""}${
                asset.status === "archived" ? " is-archived" : ""
              }`}
              type="button"
              onClick={() => setSelectedAssetId(asset.id)}
            >
              <img src={asset.final_processed_url} alt={asset.manage_code} loading="lazy" />
              <span className="admin-card-meta">
                <strong>{asset.store_display_name}</strong>
                <span>{formatDateTime(asset.captured_at)}</span>
                <span>{asset.staff_display_name ?? "担当者未設定"}</span>
                {asset.status === "archived" ? <em>非表示</em> : null}
              </span>
            </button>
          ))}
        </div>

        <aside className="admin-edit-panel">
          {selectedAsset ? (
            <>
              <img src={selectedAsset.final_processed_url} alt={selectedAsset.manage_code} />
              <dl className="settings-list">
                <div>
                  <dt>管理番号</dt>
                  <dd>{selectedAsset.manage_code}</dd>
                </div>
                <div>
                  <dt>店舗</dt>
                  <dd>{selectedAsset.store_display_name}</dd>
                </div>
                <div>
                  <dt>担当者</dt>
                  <dd>{selectedAsset.staff_display_name ?? "未設定"}</dd>
                </div>
              </dl>

              <label className="field-label">
                説明文
                <textarea
                  rows={5}
                  maxLength={500}
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                />
              </label>
              <div className="toolbar">
                <button
                  className="action-button"
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateSelectedAsset({ description: descriptionDraft, action: "update" }, "説明文を保存しました。")}
                >
                  説明文を保存
                </button>
              </div>

              {selectedAsset.status === "archived" ? (
                <button
                  className="action-button secondary"
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateSelectedAsset({ action: "restore" }, "写真を表示に戻しました。")}
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
                      updateSelectedAsset(
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
            <p className="notice">写真を選択してください。</p>
          )}
        </aside>
      </section>
    </div>
  );
}
