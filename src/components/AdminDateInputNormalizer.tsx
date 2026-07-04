"use client";

import { useLayoutEffect } from "react";

const DATE_FILTER_LABELS = ["開始日", "終了日"];
const DATE_PATTERN = "\\d{4}-\\d{2}-\\d{2}";

function isDateFilterInput(input: HTMLInputElement) {
  const label = input.closest("label");
  if (!label) return false;
  const labelText = label.textContent ?? "";
  return DATE_FILTER_LABELS.some((dateLabel) => labelText.includes(dateLabel));
}

function normalizeDateFilterInputs() {
  const inputs = document.querySelectorAll<HTMLInputElement>(".admin-date-row input");
  inputs.forEach((input) => {
    if (!isDateFilterInput(input)) return;
    if (input.type !== "text") {
      input.type = "text";
      input.setAttribute("type", "text");
    }
    input.inputMode = "numeric";
    input.placeholder = "YYYY-MM-DD";
    input.autocomplete = "off";
    input.pattern = DATE_PATTERN;
    input.setAttribute("aria-label", input.closest("label")?.textContent?.trim() ?? "日付");
  });
}

export function AdminDateInputNormalizer() {
  useLayoutEffect(() => {
    normalizeDateFilterInputs();

    const observer = new MutationObserver(() => normalizeDateFilterInputs());
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["type"],
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
