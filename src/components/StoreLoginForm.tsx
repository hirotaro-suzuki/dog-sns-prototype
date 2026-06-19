"use client";

import { FormEvent, useState } from "react";
import type { StoreSession } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";

type LoginResponse = StoreSession & {
  message?: string;
  detail?: string;
};

export function StoreLoginForm() {
  const [loginCode, setLoginCode] = useState("");
  const [pin, setPin] = useState("");
  const [session, setSession] = useState<StoreSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("店舗コードとPINを入力してください。");
  const [detail, setDetail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("店舗情報を確認しています。");
    setDetail("");

    try {
      const response = await fetch("/api/store-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginCode, pin }),
      });
      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        setSession(null);
        setMessage(data.message ?? "ログインできませんでした。");
        setDetail(data.detail ? `確認用: ${data.detail}` : "");
        return;
      }

      const nextSession = data as StoreSession;
      window.localStorage.setItem(STORE_SESSION_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setMessage(`${nextSession.store.displayName} としてログインしました。`);
      setDetail("");
      window.location.assign("/store?start=capture");
    } catch {
      setSession(null);
      setMessage("通信に失敗しました。時間をおいてもう一度お試しください。");
      setDetail("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-panel" aria-label="店舗ログイン">
      <div className="section-heading">
        <p className="eyebrow">Store Login</p>
        <h2>店舗ログイン</h2>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="field-label">
          店舗コード
          <input
            autoComplete="username"
            inputMode="text"
            value={loginCode}
            onChange={(event) => setLoginCode(event.target.value)}
            placeholder="店舗コード"
          />
        </label>

        <label className="field-label">
          PIN
          <input
            autoComplete="current-password"
            inputMode="numeric"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="PIN"
          />
        </label>

        <button className="action-button primary-wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "確認中" : "ログインして撮影へ"}
        </button>
      </form>

      {session && (
        <div className="login-summary">
          <p className="eyebrow">ログイン中</p>
          <h2>{session.store.displayName}</h2>
          <p>{session.staffMembers.length}名の担当者を読み込みました。</p>
        </div>
      )}

      <p className="notice">{message}</p>
      {detail && <p className="notice subtle">{detail}</p>}
    </section>
  );
}
