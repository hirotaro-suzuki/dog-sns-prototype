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
        onLogout={handleLogout}
      />
    );
  }

  return (
    <section className="login-panel" aria-label="店舗ホーム">
      <div className="login-summary">
        <p className="eyebrow">今日のわんちゃん</p>
        <h2>{session.store.displayName}</h2>
        <p>{session.staffMembers.length}名の担当者を読み込みました。</p>
      </div>

      <div className="toolbar">
        <button
          className="action-button primary-wide"
          type="button"
          onClick={() => setIsCapturing(true)}
        >
          撮影へ進む
        </button>
        <button className="icon-button" type="button" onClick={handleLogout} aria-label="ログアウト">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="notice">
        撮影した写真は、最後にお客様からSNS掲載OKをもらうまでクラウドへ保存しません。
      </p>
    </section>
  );
}
