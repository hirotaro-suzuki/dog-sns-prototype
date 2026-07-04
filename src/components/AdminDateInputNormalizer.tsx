"use client";

import { useEffect } from "react";

const DATE_FILTER_LABELS = ["開始日", "終了日"];

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
    if (input.type === "date") input.type = "text";
    input.inputMode = "numeric";
    input.placeholder = "YYYY-MM-DD";
    input.autocomplete = "off";
    input.pattern = "\\d{4}-\\d{2}-\\d{2}";
  });
}

export function AdminDateInputNormalizer() {
  useEffect(() => {
    normalizeDateFilterInputs();

    const observer = new MutationObserver(() => normalizeDateFilterInputs());
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
