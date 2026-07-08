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
      <button className="photo-preview-close" type="button" onClick={onClose} aria-label="閉じる">
        ×
      </button>

      <div className="photo-preview-image-wrap">
        <img src={photo.objectUrl} alt="撮影した写真のプレビュー" />
      </div>

      <div className="photo-preview-actions">
        <button className="action-button danger" type="button" onClick={onDelete}>
          この写真を消す
        </button>
        <button className="action-button primary-wide" type="button" onClick={onConfirm}>
          これに決める
        </button>
      </div>
    </div>
  );
}
