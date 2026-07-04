"use client";

import { useEffect } from "react";

function findOriginalReloadButton() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".admin-maintenance .top-action-bar button"));
  return buttons.find((button) => button.textContent?.trim() === "再読み込み") ?? null;
}

function removeTabReloadRow() {
  document.querySelector(".admin-tab-reload-row")?.remove();
}

export function AdminTabReloadButton() {
  useEffect(() => {
    function syncReloadButton() {
      const adminMaintenance = document.querySelector(".admin-maintenance");
      const tabs = document.querySelector(".admin-tabs");
      const originalReloadButton = findOriginalReloadButton();

      if (!adminMaintenance || !tabs || !originalReloadButton) {
        removeTabReloadRow();
        return;
      }

      originalReloadButton.style.display = "none";

      let row = document.querySelector<HTMLDivElement>(".admin-tab-reload-row");
      if (!row) {
        row = document.createElement("div");
        row.className = "admin-tab-reload-row";
        tabs.insertAdjacentElement("afterend", row);
      }

      let button = row.querySelector<HTMLButtonElement>("button");
      if (!button) {
        button = document.createElement("button");
        button.className = "action-button secondary";
        button.type = "button";
        button.textContent = "再読み込み";
        row.appendChild(button);
      }

      button.onclick = () => originalReloadButton.click();
    }

    syncReloadButton();
    const intervalId = window.setInterval(syncReloadButton, 500);
    return () => {
      window.clearInterval(intervalId);
      removeTabReloadRow();
      const originalReloadButton = findOriginalReloadButton();
      if (originalReloadButton) originalReloadButton.style.display = "";
    };
  }, []);

  return null;
}
