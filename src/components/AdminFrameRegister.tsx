"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type StoreMaster = {
  id: string;
  display_name: string;
  is_active: boolean;
  sort_order: number;
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

type StoresResponse = {
  stores?: StoreMaster[];
  message?: string;
  detail?: string;
};

type FramesResponse = {
  frames?: StoreFrame[];
  frame?: StoreFrame;
  message?: string;
  detail?: string;
};

type UploadResponse = {
  publicUrl?: string;
  message?: string;
  detail?: string;
};

const PIN_STORAGE_KEY = "dog-sns-admin-pin";
const MAX_ACTIVE_FRAMES = 3;

function getErrorMessage(data: { message?: string; detail?: string }, fallback: string) {
  return data.detail ? `${data.message ?? fallback} ${data.detail}` : data.message ?? fallback;
}

export function AdminFrameRegister() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [stores, setStores] = useState<StoreMaster[]>([]);
  const [frames, setFrames] = useState<StoreFrame[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [frameName, setFrameName] = useState("");
  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId) ?? null,
    [selectedStoreId, stores]
  );

  const visibleFrames = useMemo(
    () => frames.filter((frame) => frame.store_id === selectedStoreId),
    [frames, selectedStoreId]
  );

  const activeFrameCount = visibleFrames.filter((frame) => frame.is_active).length;
  const canRegister = Boolean(selectedStoreId && frameName.trim() && frameFile && activeFrameCount < MAX_ACTIVE_FRAMES);

  const loadData = useCallback(async (pin = adminPin) => {
    if (!pin) return;
    setIsLoading(true);
    setMessage("");

    try {
      const [storesResponse, framesResponse] = await Promise.all([
        fetch("/api/admin/stores", { headers: { "x-admin-pin": pin } }),
        fetch("/api/admin/frames", { headers: { "x-admin-pin": pin } }),
      ]);
      const storesData = (await storesResponse.json()) as StoresResponse;
      const framesData = (await framesResponse.json()) as FramesResponse;

      if (!storesResponse.ok || !storesData.stores) {
        setMessage(getErrorMessage(storesData, "店舗一覧を取得できませんでした。"));
        if (storesResponse.status === 401) {
          window.sessionStorage.removeItem(PIN_STORAGE_KEY);
          setAdminPin("");
        }
        return;
      }

      if (!framesResponse.ok || !framesData.frames) {
        setMessage(getErrorMessage(framesData, "枠一覧を取得できませんでした。"));
        return;
      }

      setStores(storesData.stores);
      setFrames(framesData.frames);
      setSelectedStoreId((current) => {
        if (current && storesData.stores?.some((store) => store.id === current)) return current;
        return storesData.stores?.[0]?.id ?? "";
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "枠管理画面を読み込めませんでした。");
    } finally {
      setIsLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    const storedPin = window.sessionStorage.getItem(PIN_STORAGE_KEY) ?? "";
    if (storedPin) {
      setAdminPin(storedPin);
      setPinInput(storedPin);
      void loadData(storedPin);
    }
  }, [loadData]);

  useEffect(() => {
    if (!frameFile) {
      setPreviewUrl("");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(frameFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [frameFile]);

  function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPin = pinInput.trim();
    if (!nextPin) return;
    window.sessionStorage.setItem(PIN_STORAGE_KEY, nextPin);
    setAdminPin(nextPin);
    void loadData(nextPin);
  }

  async function registerFrame() {
    if (!adminPin || !selectedStoreId) return;

    const cleanFrameName = frameName.trim();
    if (!cleanFrameName) {
      setMessage("枠名を入力してください。");
      return;
    }
    if (!frameFile) {
      setMessage("枠画像を選んでください。");
      return;
    }
    if (activeFrameCount >= MAX_ACTIVE_FRAMES) {
      setMessage("有効な枠は1店舗につき最大3件までです。不要な枠を停止してから登録してください。");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", selectedStoreId);
      formData.append("assetType", "frame");
      formData.append("file", frameFile);

      const uploadResponse = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const uploadData = (await uploadResponse.json()) as UploadResponse;

      if (!uploadResponse.ok || !uploadData.publicUrl) {
        setMessage(getErrorMessage(uploadData, "枠画像をアップロードできませんでした。"));
        return;
      }

      const createResponse = await fetch("/api/admin/frames", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({
          storeId: selectedStoreId,
          frameName: cleanFrameName,
          frameUrl: uploadData.publicUrl,
          isDefault: activeFrameCount === 0,
          isActive: true,
          sortOrder: activeFrameCount + 1,
        }),
      });
      const createData = (await createResponse.json()) as FramesResponse;

      if (!createResponse.ok || !createData.frame) {
        setMessage(getErrorMessage(createData, "枠を登録できませんでした。"));
        return;
      }

      setFrames((current) => {
        const nextFrames = createData.frame?.is_default
          ? current.map((frame) => (frame.store_id === selectedStoreId ? { ...frame, is_default: false } : frame))
          : current;
        return [...nextFrames, createData.frame as StoreFrame];
      });
      setFrameName("");
      setFrameFile(null);
      setMessage(`${cleanFrameName} を登録しました。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "枠を登録できませんでした。");
    } finally {
      setIsSaving(false);
    }
  }

  if (!adminPin) {
    return (
      <div className="admin-login-panel">
        <div className="page-heading">
          <p className="eyebrow">本部メンテナンス</p>
          <h1>枠登録</h1>
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
          <h1>枠登録</h1>
          <p>店舗を選び、枠名と画像を入れて、最後に1回だけ登録します。</p>
        </div>
        <button className="action-button secondary" type="button" onClick={() => loadData()} disabled={isLoading || isSaving}>
          再読み込み
        </button>
      </div>

      {message ? <p className="notice">{message}</p> : null}

      <section className="admin-main-grid">
        <div className="admin-create-panel">
          <h2>新しい枠を登録</h2>
          <label className="field-label">
            店舗
            <select
              value={selectedStoreId}
              onChange={(event) => {
                setSelectedStoreId(event.target.value);
                setMessage("");
              }}
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.display_name}
                </option>
              ))}
            </select>
          </label>

          <p className="notice">
            {selectedStore?.display_name ?? "店舗未選択"} の有効な枠は現在 {activeFrameCount} 件です。最大 {MAX_ACTIVE_FRAMES} 件まで登録できます。
          </p>

          <label className="field-label">
            枠名
            <input
              value={frameName}
              onChange={(event) => setFrameName(event.target.value)}
              placeholder="例: 軽井沢 クリーム"
            />
          </label>

          <label className="field-label">
            枠画像
            <input
              key={frameFile?.name ?? "empty"}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              disabled={isSaving || isLoading}
              onChange={(event) => {
                setFrameFile(event.target.files?.[0] ?? null);
                setMessage("");
              }}
            />
          </label>

          <button className="action-button" type="button" disabled={!canRegister || isSaving || isLoading} onClick={registerFrame}>
            {isSaving ? "登録中" : "この枠を登録する"}
          </button>
        </div>

        <aside className="admin-edit-panel">
          {previewUrl ? (
            <>
              <div className="frame-preview-box">
                <img src={previewUrl} alt="選択した枠" />
              </div>
              <p className="notice">この画像を登録します。</p>
            </>
          ) : (
            <p className="notice">枠画像を選ぶと、ここに確認画像が出ます。</p>
          )}
        </aside>
      </section>

      <section className="admin-filter-panel">
        <h2>登録済みの枠</h2>
        {visibleFrames.length > 0 ? (
          <div className="admin-master-list">
            {visibleFrames.map((frame) => (
              <div key={frame.id} className={`admin-master-row${frame.is_active ? "" : " is-archived"}`}>
                <strong>{frame.frame_name}</strong>
                <span>{frame.is_default ? "標準" : "通常"}</span>
                <span>{frame.is_active ? "有効" : "停止中"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="notice">この店舗にはまだ枠がありません。</p>
        )}
      </section>
    </div>
  );
}
