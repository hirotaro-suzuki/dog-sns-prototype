"use client";

import type { CapturedPhoto } from "@/lib/imageStore";

type PhotoPreviewOverlayProps = {
  photo: CapturedPhoto;
  onConfirm: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function PhotoPreviewOverlay({ photo, onConfirm, onDelete, onClose }: PhotoPreviewOverlayProps) {
  return (
    <div className="photo-preview-overlay" role="dialog" aria-modal="true" aria-label="写真プレビュー">
      <div className="photo-preview-image-wrap">
        <img src={photo.objectUrl} alt="撮影した写真のプレビュー" />
      </div>

      <div className="photo-preview-actions">
        <button className="photo-preview-action delete" type="button" onClick={onDelete} aria-label="この写真を消す">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="photo-preview-action back" type="button" onClick={onClose} aria-label="そのまま戻る">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="photo-preview-action confirm" type="button" onClick={onConfirm} aria-label="これに決める">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M4 12l6 6L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
