"use client";

import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_FRAMES_PER_STORE } from "@/lib/frameLimits";
import type { FrameDraft, FramesResponse, StoreAssetUploadResponse, StoreFrame, StoreMaster, StoresResponse } from "./types";
import { DATE_MARKER_COLORS, emptyFrameDraft, getErrorMessage, validateFrameImageFile } from "./helpers";

export function AdminFrameMaintenance({ adminPin }: { adminPin: string }) {
  const [frameStores, setFrameStores] = useState<StoreMaster[]>([]);
  const [frames, setFrames] = useState<StoreFrame[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<FrameDraft>(emptyFrameDraft);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [isFrameSaving, setIsFrameSaving] = useState(false);
  const [frameMessage, setFrameMessage] = useState("");
  const [draggingFrameId, setDraggingFrameId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const createFileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const storeFrames = useMemo(
    () =>
      [...frames]
        .filter((frame) => frame.store_id === selectedStoreId)
        .sort((a, b) => {
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.frame_name.localeCompare(b.frame_name);
        }),
    [frames, selectedStoreId]
  );
  const slots = useMemo(
    () => Array.from({ length: MAX_FRAMES_PER_STORE }, (_, index) => storeFrames[index] ?? null),
    [storeFrames]
  );
  const editingFrame = useMemo(
    () => frames.find((frame) => frame.id === editingFrameId) ?? null,
    [frames, editingFrameId]
  );

  const loadFrameStores = useCallback(async () => {
    if (!adminPin) return;
    setIsFrameLoading(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/stores", { headers: { "x-admin-pin": adminPin } });
      const data = (await response.json()) as StoresResponse;

      if (!response.ok || !data.stores) {
        setFrameMessage(getErrorMessage(data, "店舗一覧を取得できませんでした。"));
        return;
      }

      setFrameStores(data.stores);
      setSelectedStoreId((currentId) => {
        if (currentId && data.stores?.some((store) => store.id === currentId)) return currentId;
        const activeStore = data.stores?.find((store) => store.is_active);
        return activeStore?.id ?? data.stores?.[0]?.id ?? "";
      });
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "店舗一覧を取得できませんでした。");
    } finally {
      setIsFrameLoading(false);
    }
  }, [adminPin]);

  const loadFrames = useCallback(async () => {
    if (!adminPin) return;
    setIsFrameLoading(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/frames", { headers: { "x-admin-pin": adminPin } });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frames) {
        setFrameMessage(getErrorMessage(data, "枠一覧を取得できませんでした。"));
        return;
      }

      setFrames(data.frames);
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠一覧を取得できませんでした。");
    } finally {
      setIsFrameLoading(false);
    }
  }, [adminPin]);

  useEffect(() => {
    void loadFrameStores();
    void loadFrames();
  }, [loadFrameStores, loadFrames]);

  useEffect(() => {
    setEditingFrameId(null);
  }, [selectedStoreId]);

  useEffect(() => {
    if (!editingFrame) return;
    setEditDraft({
      id: editingFrame.id,
      store_id: editingFrame.store_id,
      frame_url: editingFrame.frame_url,
      is_default: editingFrame.is_default,
      sort_order: editingFrame.sort_order,
      date_enabled: editingFrame.date_enabled,
      date_x: editingFrame.date_x,
      date_y: editingFrame.date_y,
      date_font_size: editingFrame.date_font_size,
      date_color: editingFrame.date_color,
    });
  }, [editingFrame]);

  async function createFrameInSlot(index: number, file: File) {
    if (!adminPin || !selectedStoreId) return;

    const sizeError = await validateFrameImageFile(file);
    if (sizeError) {
      setFrameMessage(sizeError);
      return;
    }

    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", selectedStoreId);
      formData.append("assetType", "frame");
      formData.append("file", file);

      const uploadResponse = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const uploadData = (await uploadResponse.json()) as StoreAssetUploadResponse;

      if (!uploadResponse.ok || !uploadData.publicUrl) {
        setFrameMessage(getErrorMessage(uploadData, "枠画像をアップロードできませんでした。"));
        return;
      }

      const createResponse = await fetch("/api/admin/frames", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          storeId: selectedStoreId,
          frameUrl: uploadData.publicUrl,
          sortOrder: index * 10,
          isDefault: index === 0,
        }),
      });
      const createData = (await createResponse.json()) as FramesResponse;

      if (!createResponse.ok || !createData.frame) {
        setFrameMessage(getErrorMessage(createData, "枠を追加できませんでした。"));
        return;
      }

      setFrames((current) => {
        const withoutOldDefault = createData.frame?.is_default
          ? current.map((frame) => (frame.store_id === createData.frame?.store_id ? { ...frame, is_default: false } : frame))
          : current;
        return [...withoutOldDefault, createData.frame as StoreFrame];
      });
      setFrameMessage("枠を追加しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を追加できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function saveEditDraft() {
    if (!adminPin || !editDraft.id) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch(`/api/admin/frames/${editDraft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({
          frameUrl: editDraft.frame_url,
          isDefault: editDraft.is_default,
          sortOrder: editDraft.sort_order,
          dateEnabled: editDraft.date_enabled,
          dateX: editDraft.date_x,
          dateY: editDraft.date_y,
          dateFontSize: editDraft.date_font_size,
          dateColor: editDraft.date_color,
        }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠を保存できませんでした。"));
        return;
      }

      setFrames((current) =>
        current.map((frame) => {
          if (frame.id === data.frame?.id) return data.frame as StoreFrame;
          if (data.frame?.is_default && frame.store_id === data.frame.store_id) return { ...frame, is_default: false };
          return frame;
        })
      );
      setEditingFrameId(null);
      setFrameMessage("枠を保存しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を保存できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function deleteEditingFrame() {
    if (!adminPin || !editingFrame) return;

    const confirmed = window.confirm("この枠を削除します。よろしいですか？");
    if (!confirmed) return;

    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch(`/api/admin/frames/${editingFrame.id}`, {
        method: "DELETE",
        headers: { "x-admin-pin": adminPin },
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.deletedFrameId) {
        setFrameMessage(getErrorMessage(data, "枠を削除できませんでした。"));
        return;
      }

      setFrames((current) => current.filter((frame) => frame.id !== data.deletedFrameId));
      setEditingFrameId(null);
      setFrameMessage("枠を削除しました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠を削除できませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function replaceEditingFrameImage(file: File) {
    if (!adminPin || !editingFrame) return;

    const sizeError = await validateFrameImageFile(file);
    if (sizeError) {
      setFrameMessage(sizeError);
      return;
    }

    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const formData = new FormData();
      formData.append("storeId", editingFrame.store_id);
      formData.append("assetType", "frame");
      formData.append("file", file);
      formData.append("frameId", editingFrame.id);

      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "x-admin-pin": adminPin },
        body: formData,
      });
      const data = (await response.json()) as StoreAssetUploadResponse;

      if (!response.ok || !data.frame) {
        setFrameMessage(getErrorMessage(data, "枠画像を差し替えできませんでした。"));
        return;
      }

      const updatedFrame = data.frame;
      setFrames((current) => current.map((frame) => (frame.id === updatedFrame.id ? updatedFrame : frame)));
      setEditDraft((current) => ({ ...current, frame_url: updatedFrame.frame_url }));
      setFrameMessage("枠画像を差し替えました。");
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "枠画像を差し替えできませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  async function reorderFrames(nextOrderedIds: string[]) {
    if (!adminPin || !selectedStoreId) return;
    setIsFrameSaving(true);
    setFrameMessage("");

    try {
      const response = await fetch("/api/admin/frames/reorder", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({ storeId: selectedStoreId, frameIds: nextOrderedIds }),
      });
      const data = (await response.json()) as FramesResponse;

      if (!response.ok || !data.frames) {
        setFrameMessage(getErrorMessage(data, "並び替えできませんでした。"));
        return;
      }

      const reorderedFrames = data.frames;
      setFrames((current) => [
        ...current.filter((frame) => frame.store_id !== selectedStoreId),
        ...reorderedFrames,
      ]);
    } catch (error) {
      setFrameMessage(error instanceof Error ? error.message : "並び替えできませんでした。");
    } finally {
      setIsFrameSaving(false);
    }
  }

  function handleSlotDrop(targetIndex: number) {
    const draggedId = draggingFrameId;
    setDraggingFrameId(null);
    setDragOverIndex(null);
    if (!draggedId) return;

    const currentIds = storeFrames.map((frame) => frame.id);
    const fromIndex = currentIds.indexOf(draggedId);
    if (fromIndex === -1) return;

    const nextIds = [...currentIds];
    nextIds.splice(fromIndex, 1);
    const insertAt = Math.min(targetIndex, nextIds.length);
    nextIds.splice(insertAt, 0, draggedId);

    void reorderFrames(nextIds);
  }

  function nudgeDatePosition(dx: number, dy: number) {
    setEditDraft((current) => ({
      ...current,
      date_x: Math.min(Math.max(current.date_x + dx, 0), 1080),
      date_y: Math.min(Math.max(current.date_y + dy, 0), 1080),
    }));
  }

  function nudgeFontSize(delta: number) {
    setEditDraft((current) => ({
      ...current,
      date_font_size: Math.min(Math.max(current.date_font_size + delta, 12), 96),
    }));
  }

  function updateMarkerFromPointer(clientX: number, clientY: number) {
    const wrap = previewRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 1080, 0), 1080);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 1080, 0), 1080);
    setEditDraft((current) => ({ ...current, date_x: Math.round(x), date_y: Math.round(y) }));
  }

  function handleMarkerPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateMarkerFromPointer(event.clientX, event.clientY);
  }

  function handleMarkerPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.buttons !== 1) return;
    updateMarkerFromPointer(event.clientX, event.clientY);
  }

  return (
    <section className="admin-frame-tab">
      <label className="field-label">
        店舗
        <select value={selectedStoreId} onChange={(event) => setSelectedStoreId(event.target.value)}>
          {frameStores.filter((store) => store.is_active).map((store) => (
            <option key={store.id} value={store.id}>
              {store.display_name}
            </option>
          ))}
        </select>
      </label>

      {frameMessage ? <p className="notice">{frameMessage}</p> : null}

      <div className="frame-slot-row">
        {slots.map((frame, index) =>
          frame ? (
            <div
              key={frame.id}
              className={`frame-slot-thumb${draggingFrameId === frame.id ? " is-dragging" : ""}${
                dragOverIndex === index ? " is-drag-over" : ""
              }`}
              draggable
              onDragStart={() => setDraggingFrameId(frame.id)}
              onDragEnd={() => {
                setDraggingFrameId(null);
                setDragOverIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleSlotDrop(index);
              }}
              onClick={() => setEditingFrameId(frame.id)}
            >
              <img src={frame.frame_url} alt="枠" />
              {index === 0 && <span className="frame-slot-badge">標準</span>}
            </div>
          ) : (
            <div
              key={`blank-${index}`}
              className={`frame-slot-blank${dragOverIndex === index ? " is-drag-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex((current) => (current === index ? null : current))}
              onDrop={(event) => {
                event.preventDefault();
                handleSlotDrop(index);
              }}
              onClick={() => createFileInputRefs.current[index]?.click()}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              <input
                ref={(element) => {
                  createFileInputRefs.current[index] = element;
                }}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isFrameSaving || isFrameLoading}
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (file) void createFrameInSlot(index, file);
                }}
              />
            </div>
          )
        )}
      </div>

      {editingFrame && (
        <div className="photo-preview-overlay admin-frame-edit-overlay" role="dialog" aria-modal="true" aria-label="枠編集">
          <button className="icon-button admin-frame-edit-close" type="button" onClick={() => setEditingFrameId(null)} aria-label="閉じる">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          <div className="admin-frame-edit-panel">
            <div className="frame-date-preview" ref={previewRef}>
              <img src={editDraft.frame_url} alt="枠プレビュー" />
              {editDraft.date_enabled && (
                <div
                  className="frame-date-marker"
                  style={{
                    left: `${(editDraft.date_x / 1080) * 100}%`,
                    top: `${(editDraft.date_y / 1080) * 100}%`,
                    color: editDraft.date_color,
                  }}
                  onPointerDown={handleMarkerPointerDown}
                  onPointerMove={handleMarkerPointerMove}
                >
                  2026.07.08
                </div>
              )}
            </div>

            <div className="toolbar">
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(0, -10)} aria-label="日付を上へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(0, 10)} aria-label="日付を下へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(-10, 0)} aria-label="日付を左へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="icon-button" type="button" onClick={() => nudgeDatePosition(10, 0)} aria-label="日付を右へ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <button className="mini-control-button" type="button" onClick={() => nudgeFontSize(-2)} aria-label="文字を小さく">
                −
              </button>
              <span className="text-count">{editDraft.date_font_size}</span>
              <button className="mini-control-button" type="button" onClick={() => nudgeFontSize(2)} aria-label="文字を大きく">
                ＋
              </button>
            </div>

            <div className="canvas-text-color-row" aria-label="日付の色">
              {DATE_MARKER_COLORS.map((color) => (
                <button
                  key={color.value}
                  className={`mini-color-button${editDraft.date_color === color.value ? " is-selected" : ""}`}
                  type="button"
                  style={{ backgroundColor: color.value }}
                  onClick={() => setEditDraft((current) => ({ ...current, date_color: color.value }))}
                  aria-label={`${color.label}にする`}
                />
              ))}
            </div>

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={editDraft.date_enabled}
                onChange={(event) => setEditDraft((current) => ({ ...current, date_enabled: event.target.checked }))}
              />
              日付を表示
            </label>

            <label className="field-label">
              画像差し替え
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={isFrameSaving}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  if (file) void replaceEditingFrameImage(file);
                }}
              />
            </label>

            <div className="toolbar">
              <button className="action-button" type="button" disabled={isFrameSaving} onClick={saveEditDraft}>
                保存
              </button>
              <button className="icon-button danger" type="button" disabled={isFrameSaving} onClick={deleteEditingFrame} aria-label="削除">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
