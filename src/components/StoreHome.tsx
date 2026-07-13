"use client";

import { useEffect, useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import type { StoreSession } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";

export function StoreHome() {
  const [session, setSession] = useState<StoreSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORE_SESSION_KEY);
    if (storedValue) {
      try {
        setSession(JSON.parse(storedValue) as StoreSession);
      } catch {
        window.localStorage.removeItem(STORE_SESSION_KEY);
      }
    }
    setIsCheckingSession(false);
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(STORE_SESSION_KEY);
    setSession(null);
    window.location.assign("/store/login");
  }

  // 再読み込み時にログイン案内が一瞬表示されないよう、セッション確認が終わるまで何も出さない。
  if (isCheckingSession) {
    return null;
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

  return (
    <CameraCapture
      store={session.store}
      staffMembers={session.staffMembers}
      onLogout={handleLogout}
    />
  );
}
