"use client";

import { useEffect, useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import type { StoreSession } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";

export function StoreHome() {
  const [session, setSession] = useState<StoreSession | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORE_SESSION_KEY);
    if (!storedValue) return;

    try {
      const nextSession = JSON.parse(storedValue) as StoreSession;
      const shouldStartCapture = new URLSearchParams(window.location.search).get("start") === "capture";
      setSession(nextSession);
      setIsCapturing(shouldStartCapture);

      if (shouldStartCapture) {
        window.history.replaceState(null, "", "/store");
      }
    } catch {
      window.localStorage.removeItem(STORE_SESSION_KEY);
    }
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(STORE_SESSION_KEY);
    setSession(null);
    setIsCapturing(false);
    window.location.assign("/store/login");
  }

  if (!session) {
    return (
      <section className="login-panel" aria-label="店舗未ログイン">
        <div className="login-summary">
          <p className="eyebrow">Store</p>
          <h2>店舗ログインが必要です</h2>
          <p>店舗コードとPINでログインしてください。</p>
        </div>
        <button
          className="action-button primary-wide"
          type="button"
          onClick={() => window.location.assign("/store/login")}
        >
          店舗ログインへ
        </button>
      </section>
    );
  }

  if (isCapturing) {
    return (
      <CameraCapture
        store={session.store}
        staffMembers={session.staffMembers}
        onBack={() => setIsCapturing(false)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <section className="login-panel" aria-label="店舗ホーム">
      <div className="login-summary">
        <p className="eyebrow">Store</p>
        <h2>{session.store.displayName}</h2>
        <p>{session.store.storeName}</p>
      </div>

      <div className="store-settings-panel" aria-label="DBから読み込んだ店舗設定">
        <p className="eyebrow">DBから読み込んだ店舗設定</p>
        <dl className="settings-list">
          <div>
            <dt>店舗ID</dt>
            <dd>{session.store.id}</dd>
          </div>
          <div>
            <dt>店舗コード</dt>
            <dd>{session.store.storeCode}</dd>
          </div>
          <div>
            <dt>表示名</dt>
            <dd>{session.store.displayName}</dd>
          </div>
          <div>
            <dt>テーマ色</dt>
            <dd>{session.store.themeColor ?? "未設定"}</dd>
          </div>
          <div>
            <dt>ロゴURL</dt>
            <dd>{session.store.logoUrl ?? "未設定"}</dd>
          </div>
          <div>
            <dt>フレームURL</dt>
            <dd>{session.store.frameUrl ?? "未設定"}</dd>
          </div>
          <div>
            <dt>担当者数</dt>
            <dd>{session.staffMembers.length}名</dd>
          </div>
        </dl>
      </div>

      <div className="toolbar">
        <button
          className="action-button primary-wide"
          type="button"
          onClick={() => setIsCapturing(true)}
        >
          撮影へ進む
        </button>
        <button className="action-button secondary" type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </div>

      <p className="notice">
        担当者は写真を選んだ後に選択します。撮影データはまだクラウドへ保存しません。
      </p>
    </section>
  );
}
