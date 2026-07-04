"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type StoreMaster = {
  id: string;
  display_name: string;
};

type StoreFrame = {
  id: string;
  store_id: string;
  frame_name: string;
  frame_url: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  date_enabled?: boolean;
  date_x?: number;
  date_y?: number;
  date_font_size?: number;
  date_color?: string;
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

const PIN_STORAGE_KEY = "dog-sns-admin-pin";
const KARUIZAWA_GREEN_URL = "https://dog-sns-prototype.vercel.app/store-frames/karuizawa-simple-green.svg";
const KARUIZAWA_CREAM_URL = "https://dog-sns-prototype.vercel.app/store-frames/karuizawa-simple-cream.svg";

function getErrorMessage(data: { message?: string; detail?: string }, fallback: string) {
  return data.detail ? `${data.message ?? fallback} ${data.detail}` : data.message ?? fallback;
}

function framePayload(frame: StoreFrame, overrides: Partial<StoreFrame>) {
  return {
    frameName: overrides.frame_name ?? frame.frame_name,
    frameUrl: overrides.frame_url ?? frame.frame_url,
    isDefault: overrides.is_default ?? frame.is_default,
    isActive: overrides.is_active ?? frame.is_active,
    sortOrder: overrides.sort_order ?? frame.sort_order,
    dateEnabled: overrides.date_enabled ?? frame.date_enabled ?? true,
    dateX: overrides.date_x ?? frame.date_x ?? 1030,
    dateY: overrides.date_y ?? frame.date_y ?? 82,
    dateFontSize: overrides.date_font_size ?? frame.date_font_size ?? 38,
    dateColor: overrides.date_color ?? frame.date_color ?? "#ffffff",
  };
}

export function AdminFrameCleanup() {
  const [pinInput, setPinInput] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [stores, setStores] = useState<StoreMaster[]>([]);
  const [frames, setFrames] = useState<StoreFrame[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

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
        return;
      }
      if (!framesResponse.ok || !framesData.frames) {
        setMessage(getErrorMessage(framesData, "枠一覧を取得できませんでした。"));
        return;
      }

      setStores(storesData.stores);
      setFrames(framesData.frames);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "読み込みに失敗しました。");
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

  function handlePinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPin = pinInput.trim();
    if (!nextPin) return;
    window.sessionStorage.setItem(PIN_STORAGE_KEY, nextPin);
    setAdminPin(nextPin);
    void loadData(nextPin);
  }

  async function patchFrame(pin: string, frame: StoreFrame, overrides: Partial<StoreFrame>) {
    const response = await fetch(`/api/admin/frames/${frame.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-admin-pin": pin,
      },
      body: JSON.stringify(framePayload(frame, overrides)),
    });
    const data = (await response.json()) as FramesResponse;
    if (!response.ok || !data.frame) {
      throw new Error(getErrorMessage(data, `${frame.frame_name} を更新できませんでした。`));
    }
    return data.frame;
  }

  async function createFrame(pin: string, storeId: string, frameName: string, frameUrl: string, sortOrder: number, isDefault: boolean) {
    const response = await fetch("/api/admin/frames", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-pin": pin,
      },
      body: JSON.stringify({
        storeId,
        frameName,
        frameUrl,
        isDefault,
        isActive: true,
        sortOrder,
        dateEnabled: true,
        dateX: 1030,
        dateY: 82,
        dateFontSize: 38,
        dateColor: "#ffffff",
      }),
    });
    const data = (await response.json()) as FramesResponse;
    if (!response.ok || !data.frame) {
      throw new Error(getErrorMessage(data, `${frameName} を追加できませんでした。`));
    }
    return data.frame;
  }

  async function cleanupKaruizawa() {
    if (!adminPin) return;
    const karuizawaStore = stores.find((store) => store.display_name.includes("軽井沢"));
    if (!karuizawaStore) {
      setMessage("軽井沢店が見つかりませんでした。");
      return;
    }

    const storeFrames = frames.filter((frame) => frame.store_id === karuizawaStore.id);
    const creamFrame = storeFrames.find((frame) => frame.frame_name.includes("クリーム"));
    const greenFrame = storeFrames.find((frame) => frame.frame_name.includes("グリーン") && frame.frame_name.includes("軽井沢"));

    setIsCleaning(true);
    setMessage("軽井沢店の枠を整理しています。");

    try {
      for (const frame of storeFrames) {
        await patchFrame(adminPin, frame, { is_active: false, is_default: false });
      }

      if (creamFrame) {
        await patchFrame(adminPin, creamFrame, {
          frame_name: "軽井沢 クリーム",
          frame_url: KARUIZAWA_CREAM_URL,
          is_active: true,
          is_default: true,
          sort_order: 10,
          date_enabled: true,
          date_x: 1030,
          date_y: 82,
          date_font_size: 38,
          date_color: "#ffffff",
        });
      } else {
        await createFrame(adminPin, karuizawaStore.id, "軽井沢 クリーム", KARUIZAWA_CREAM_URL, 10, true);
      }

      if (greenFrame) {
        await patchFrame(adminPin, greenFrame, {
          frame_name: "軽井沢 グリーン",
          frame_url: KARUIZAWA_GREEN_URL,
          is_active: true,
          is_default: false,
          sort_order: 20,
          date_enabled: true,
          date_x: 1030,
          date_y: 82,
          date_font_size: 38,
          date_color: "#ffffff",
        });
      } else {
        await createFrame(adminPin, karuizawaStore.id, "軽井沢 グリーン", KARUIZAWA_GREEN_URL, 20, false);
      }

      setMessage("軽井沢店をシンプル2枠だけに整理しました。");
      await loadData(adminPin);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "軽井沢店の枠整理に失敗しました。");
    } finally {
      setIsCleaning(false);
    }
  }

  const karuizawaStore = stores.find((store) => store.display_name.includes("軽井沢"));
  const karuizawaFrames = frames.filter((frame) => frame.store_id === karuizawaStore?.id);

  if (!adminPin) {
    return (
      <div className="admin-login-panel">
        <div className="page-heading">
          <p className="eyebrow">本部メンテナンス</p>
          <h1>枠整理</h1>
        </div>
        <form className="login-form" onSubmit={handlePinSubmit}>
          <label className="field-label">
            本部PIN
            <input type="password" inputMode="numeric" value={pinInput} onChange={(event) => setPinInput(event.target.value)} />
          </label>
          <button className="action-button" type="submit">開く</button>
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
          <h1>軽井沢 枠整理</h1>
          <p>軽井沢店を、余計な帯や文字のないシンプル2枠だけに整えます。</p>
        </div>
        <button className="action-button secondary" type="button" onClick={() => loadData()} disabled={isLoading || isCleaning}>
          再読み込み
        </button>
      </div>

      {message ? <p className="notice">{message}</p> : null}

      <button className="action-button primary-wide" type="button" onClick={cleanupKaruizawa} disabled={isLoading || isCleaning}>
        {isCleaning ? "整理中" : "軽井沢をシンプル2枠に整理する"}
      </button>

      <section className="admin-filter-panel">
        <h2>現在の軽井沢枠</h2>
        <div className="admin-master-list">
          {karuizawaFrames.map((frame) => (
            <div key={frame.id} className={`admin-master-row${frame.is_active ? "" : " is-archived"}`}>
              <strong>{frame.frame_name}</strong>
              <span>{frame.is_active ? "有効" : "停止中"}</span>
              <span>{frame.frame_url.includes("karuizawa-simple") ? "新枠" : "旧枠"}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
