"use client";

import { useEffect, useState } from "react";

const PIN_STORAGE_KEY = "dog-sns-admin-pin";

function hasStoredPin() {
  return Boolean(window.sessionStorage.getItem(PIN_STORAGE_KEY));
}

export function AdminLogoutButton({ className = "" }: { className?: string }) {
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    setHasPin(hasStoredPin());
    const intervalId = window.setInterval(() => {
      setHasPin(hasStoredPin());
    }, 500);

    return () => window.clearInterval(intervalId);
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
