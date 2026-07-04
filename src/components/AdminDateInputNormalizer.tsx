"use client";

import { useLayoutEffect } from "react";

const DATE_FILTER_LABELS = ["開始日", "終了日"];
const DATE_PATTERN = "\\d{4}-\\d{2}-\\d{2}";
const SOURCE_KEY = "adminDateSource";
const BOUND_KEY = "adminDateBound";

function isDateFilterInput(input: HTMLInputElement) {
  const label = input.closest("label");
  if (!label) return false;
  const labelText = label.textContent ?? "";
  return DATE_FILTER_LABELS.some((dateLabel) => labelText.includes(dateLabel));
}

function setDateInputAttributes(input: HTMLInputElement) {
  input.inputMode = "numeric";
  input.placeholder = "YYYY-MM-DD";
  input.autocomplete = "off";
  input.pattern = DATE_PATTERN;
}

function dispatchDateChange(input: HTMLInputElement) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function ensureTextProxy(input: HTMLInputElement) {
  const label = input.closest("label");
  if (!label) return;

  const sourceId =
    input.dataset[SOURCE_KEY] ?? `admin-date-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  input.dataset[SOURCE_KEY] = sourceId;

  let proxy = label.querySelector<HTMLInputElement>(`input[data-admin-date-proxy="${sourceId}"]`);
  if (!proxy) {
    proxy = document.createElement("input");
    proxy.type = "text";
    proxy.dataset.adminDateProxy = sourceId;
    setDateInputAttributes(proxy);
    proxy.value = input.value;
    proxy.addEventListener("input", () => {
      input.value = proxy?.value ?? "";
      dispatchDateChange(input);
    });
    input.insertAdjacentElement("beforebegin", proxy);
  }

  setDateInputAttributes(proxy);
  if (document.activeElement !== proxy) proxy.value = input.value;

  input.style.position = "absolute";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.margin = "0";
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");

  if (!input.dataset[BOUND_KEY]) {
    input.addEventListener("input", () => {
      if (document.activeElement !== proxy) proxy.value = input.value;
    });
    input.addEventListener("change", () => {
      if (document.activeElement !== proxy) proxy.value = input.value;
    });
    input.dataset[BOUND_KEY] = "true";
  }
}

function normalizeDateFilterInputs() {
  const inputs = document.querySelectorAll<HTMLInputElement>(".admin-date-row input");
  inputs.forEach((input) => {
    if (input.dataset.adminDateProxy) return;
    if (!isDateFilterInput(input)) return;
    ensureTextProxy(input);
  });
}

export function AdminDateInputNormalizer() {
  useLayoutEffect(() => {
    normalizeDateFilterInputs();

    const observer = new MutationObserver(() => normalizeDateFilterInputs());
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["type", "value"],
      childList: true,
      subtree: true,
    });

    const handleInteraction = () => normalizeDateFilterInputs();
    document.addEventListener("focusin", handleInteraction, true);
    document.addEventListener("pointerdown", handleInteraction, true);

    const timer = window.setInterval(normalizeDateFilterInputs, 500);

    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", handleInteraction, true);
      document.removeEventListener("pointerdown", handleInteraction, true);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
