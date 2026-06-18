"use client";

import { useEffect, useState } from "react";
import type { StoreSession, StoreSessionStaff } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";

export function StoreHome() {
  const [session, setSession] = useState<StoreSession | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORE_SESSION_KEY);
    if (!storedValue) return;

    try {
      const nextSession = JSON.parse(storedValue) as StoreSession;
      setSession(nextSession);
      setSelectedStaffId(nextSession.staffMembers[0]?.id ?? null);
    } catch {
      window.localStorage.removeItem(STORE_SESSION_KEY);
    }
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(STORE_SESSION_KEY);
    setSession(null);
    setSelectedStaffId(null);
  }

  if (!session) {
    return (
      <section className="login-panel" aria-label="店舗未ログイン">
        <div className="login-summary">
          <p className="eyebrow">Store</p>
          <h2>店舗ログインが必要です</h2>
          <p>/store/login から店舗コードとPINでログインしてください。</p>
        </div>
      </section>
    );
  }

  const selectedStaff = session.staffMembers.find(
    (staff) => staff.id === selectedStaffId
  );

  return (
    <section className="login-panel" aria-label="店舗ホーム">
      <div className="login-summary">
        <p className="eyebrow">Store</p>
        <h2>{session.store.displayName}</h2>
        <p>{session.store.storeName}</p>
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
        <button className="action-button primary-wide" type="button" disabled>
          撮影へ進む
        </button>
        <button className="action-button secondary" type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </div>

      <p className="notice">
        この画面は店舗ログイン後の受け皿です。次の実装で撮影画面へ店舗設定と担当者情報を渡します。
      </p>
    </section>
  );
}
