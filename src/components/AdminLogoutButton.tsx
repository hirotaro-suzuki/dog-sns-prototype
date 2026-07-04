"use client";

import { useEffect, useState } from "react";

const PIN_STORAGE_KEY = "dog-sns-admin-pin";

export function AdminLogoutButton({ className = "" }: { className?: string }) {
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    setHasPin(Boolean(window.sessionStorage.getItem(PIN_STORAGE_KEY)));
  }, []);

  if (!hasPin) return null;

  return (
    <button
      className={`action-button secondary ${className}`.trim()}
      type="button"
      onClick={() => {
        window.sessionStorage.removeItem(PIN_STORAGE_KEY);
        window.location.assign("/admin");
      }}
    >
      ログアウト
    </button>
  );
}
