"use client";

import { useEffect, useState } from "react";
import { CameraCapture } from "@/components/CameraCapture";
import type { StoreSession, StoreSessionStaff } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";

export function StoreHome() {
  const [session, setSession] = useState<StoreSession | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORE_SESSION_KEY);
    if (!storedValue) return;

    try {
      const nextSession = JSON.parse(storedValue) as StoreSession;
      const firstStaffId = nextSession.staffMembers[0]?.id ?? null;
      const shouldStartCapture = new URLSearchParams(window.location.search).get("start") === "capture";
      setSession(nextSession);
      setSelectedStaffId(firstStaffId);
      setIsCapturing(Boolean(shouldStartCapture && firstStaffId));

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
    setSelectedStaffId(null);
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

  const selectedStaff = session.staffMembers.find(
    (staff) => staff.id === selectedStaffId
  );

  if (isCapturing) {
    return (
      <CameraCapture
        store={session.store}
        staff={selectedStaff}
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

      <div className="login-summary">
        <p className="eyebrow">本日の担当</p>
        <div className="staff-selector" aria-label="担当者選択">
          {session.staffMembers.map((staff: StoreSessionStaff) => (
            <button
              className={`staff-button ${staff.id === selectedStaffId ? "is-selected" : ""}`}
              key={staff.id}
              type="button"
              onClick={() => setSelectedStaffId(staff.id)}
            >
              {staff.displayName}
            </button>
          ))}
        </div>
        <p>
          {selectedStaff
            ? `${selectedStaff.displayName} さんを選択中です。`
            : "担当者を選択してください。"}
        </p>
      </div>

      <div className="toolbar">
        <button
          className="action-button primary-wide"
          type="button"
          disabled={!selectedStaff}
          onClick={() => setIsCapturing(true)}
        >
          撮影へ進む
        </button>
        <button className="action-button secondary" type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </div>

      <p className="notice">
        撮影データはまだクラウドへ保存しません。店舗設定と担当者情報を既存の撮影フローへ渡します。
      </p>
    </section>
  );
}
