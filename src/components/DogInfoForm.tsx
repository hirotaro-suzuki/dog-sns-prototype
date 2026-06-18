"use client";

import { useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import type { CaptureStaff } from "@/types/captureContext";
import type { DogInfo } from "@/types/dog";

type DogInfoFormProps = {
  photo: CapturedPhoto;
  staff?: CaptureStaff;
  onConfirm: (dogInfo: DogInfo) => void;
  onCancel: () => void;
};

export function DogInfoForm({ photo, staff, onConfirm, onCancel }: DogInfoFormProps) {
  const [dogInfo, setDogInfo] = useState<DogInfo>({
    dogName: "",
    dogBreed: "",
    dogAge: "",
  });

  function updateField(field: keyof DogInfo, value: string) {
    setDogInfo((current) => ({
      ...current,
      [field]: value,
    }));
  }

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

        {staff && (
          <div className="login-summary compact-summary">
            <p className="eyebrow">担当</p>
            <p>{staff.displayName}</p>
          </div>
        )}

        <div className="form-grid">
          <label className="field-label">
            <span>わんちゃんの名前</span>
            <input
              type="text"
              name="dogName"
              value={dogInfo.dogName}
              placeholder="例: こむぎ"
              autoComplete="off"
              onChange={(event) => updateField("dogName", event.target.value)}
            />
          </label>

          <label className="field-label">
            <span>犬種</span>
            <input
              type="text"
              name="dogBreed"
              value={dogInfo.dogBreed}
              placeholder="例: トイプードル"
              autoComplete="off"
              onChange={(event) => updateField("dogBreed", event.target.value)}
            />
          </label>

          <label className="field-label">
            <span>犬齢</span>
            <input
              type="text"
              name="dogAge"
              value={dogInfo.dogAge}
              placeholder="例: 3歳"
              autoComplete="off"
              onChange={(event) => updateField("dogAge", event.target.value)}
            />
          </label>
        </div>

        <div className="toolbar">
          <button
            className="action-button primary-wide"
            type="button"
            onClick={() => onConfirm(dogInfo)}
          >
            この内容で確定（画像加工へ）
          </button>
          <button className="action-button danger" type="button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </section>
  );
}
