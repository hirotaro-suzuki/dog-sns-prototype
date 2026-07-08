"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { StoreSession } from "@/types/storeSession";

const STORE_SESSION_KEY = "dog-sns-store-session";
const LAST_LOGIN_CODE_KEY = "dog-sns-last-login-code";

type LoginResponse = StoreSession & {
  message?: string;
  detail?: string;
};

export function StoreLoginForm() {
  const [loginCode, setLoginCode] = useState("");
  const [lastLoginCode, setLastLoginCode] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("店舗コードとPINを入力してください。");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(LAST_LOGIN_CODE_KEY);
    if (!saved) return;
    setLoginCode(saved);
    setLastLoginCode(saved);
  }, []);

  function handlePinChange(event: ChangeEvent<HTMLInputElement>) {
    setPin(event.target.value.replace(/\D/g, ""));
  }

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
        setMessage(data.message ?? "ログインできませんでした。");
        setDetail(data.detail ? `確認用: ${data.detail}` : "");
        return;
      }

      const nextSession = data as StoreSession;
      window.localStorage.setItem(STORE_SESSION_KEY, JSON.stringify(nextSession));
      window.localStorage.setItem(LAST_LOGIN_CODE_KEY, loginCode);
      setMessage(`${nextSession.store.displayName} としてログインしました。`);
      setDetail("");
      window.location.assign("/store?start=capture");
    } catch {
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
          {lastLoginCode && <span className="field-hint">前回: {lastLoginCode}</span>}
        </label>

        <label className="field-label">
          PIN
          <div className="pin-input-wrap">
            <input
              autoComplete="current-password"
              inputMode="numeric"
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={handlePinChange}
              placeholder="PIN"
            />
            <button
              className="pin-toggle-button"
              type="button"
              onClick={() => setShowPin((current) => !current)}
              aria-label={showPin ? "PINを隠す" : "PINを表示"}
            >
              {showPin ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path
                    d="M10.58 10.58a2 2 0 002.83 2.83"
                    strokeLinecap="round"
                  />
                  <path
                    d="M9.88 4.24A9.8 9.8 0 0112 4c5 0 9 4 10 8-.32 1.14-.9 2.28-1.68 3.32M6.6 6.6C4.6 8 3.1 10 2 12c1 4 5 8 10 8 1.5 0 2.9-.36 4.16-.98"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    d="M2 12c1-4 5-8 10-8s9 4 10 8c-1 4-5 8-10 8s-9-4-10-8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <button className="action-button primary-wide" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "確認中" : "ログインして撮影へ"}
        </button>
      </form>

      <p className="notice">{message}</p>
      {detail && <p className="notice error">{detail}</p>}
    </section>
  );
}
