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
        setIsCheckingSession(false);
        return;
      } catch {
        window.localStorage.removeItem(STORE_SESSION_KEY);
      }
    }
    // 未ログインなら案内画面を挟まず、直接ログイン画面へ移動する。
    // replaceにすることで、戻るボタンでこのリダイレクトへ戻ってこないようにする。
    window.location.replace("/store/login");
  }, []);

  function handleLogout() {
    window.localStorage.removeItem(STORE_SESSION_KEY);
    setSession(null);
    window.location.assign("/store/login");
  }

  // セッション確認中と、未ログインでログイン画面へ移動するまでの間は何も出さない。
  if (isCheckingSession || !session) {
    return null;
  }

  return (
    <CameraCapture
      store={session.store}
      staffMembers={session.staffMembers}
      onLogout={handleLogout}
    />
  );
}
