"use client";

import type { CapturedPhoto } from "@/lib/imageStore";

type DogInfoFormProps = {
  photo: CapturedPhoto;
  onCancel: () => void;
};

export function DogInfoForm({ photo, onCancel }: DogInfoFormProps) {
  return (
    <section className="form-panel" aria-label="わんちゃん情報入力">
      <div className="selected-preview">
        <img src={photo.objectUrl} alt="確定画像" />
      </div>

      <div className="form-content">
        <div>
          <p className="eyebrow">Selected Photo</p>
          <h2>わんちゃん情報</h2>
          <p>この画面ではまだクラウド保存しません。確定画像はブラウザメモリ内だけに保持しています。</p>
        </div>

        <div className="form-grid">
          <label className="field-label">
            <span>わんちゃんの名前</span>
            <input type="text" name="dogName" placeholder="例: こむぎ" autoComplete="off" />
          </label>

          <label className="field-label">
            <span>犬種</span>
            <input type="text" name="dogBreed" placeholder="例: トイプードル" autoComplete="off" />
          </label>

          <label className="field-label">
            <span>犬齢</span>
            <input type="text" name="dogAge" placeholder="例: 3歳" autoComplete="off" />
          </label>
        </div>

        <div className="toolbar">
          <button className="action-button" type="button">
            入力内容を仮保持
          </button>
          <button className="action-button danger" type="button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </section>
  );
}
