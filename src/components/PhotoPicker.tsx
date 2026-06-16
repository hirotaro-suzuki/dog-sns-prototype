"use client";

import type { CapturedPhoto } from "@/lib/imageStore";

type PhotoPickerProps = {
  photos: CapturedPhoto[];
  onSelect: (photo: CapturedPhoto) => void;
  onRetake: () => void;
  onCancel: () => void;
};

export function PhotoPicker({
  photos,
  onSelect,
  onRetake,
  onCancel,
}: PhotoPickerProps) {
  return (
    <section className="picker-panel" aria-label="写真選択">
      <div className="section-heading">
        <p className="eyebrow">Choose One</p>
        <h2>ベストショットを1枚選択</h2>
        <p>選んだ1枚だけを次の入力画面へ進めます。まだクラウドには送信していません。</p>
      </div>

      <div className="photo-grid pick-grid">
        {photos.map((photo, index) => (
          <button
            className="photo-choice"
            key={photo.id}
            type="button"
            onClick={() => onSelect(photo)}
            aria-label={`写真 ${index + 1} を選択`}
          >
            <img src={photo.objectUrl} alt={`候補写真 ${index + 1}`} />
            <span>{index + 1}枚目を選択</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button className="action-button secondary" type="button" onClick={onRetake}>
          やり直し
        </button>
        <button className="action-button danger" type="button" onClick={onCancel}>
          キャンセル
        </button>
        <span className="status-pill">{photos.length}枚を一時保持中</span>
      </div>
    </section>
  );
}
