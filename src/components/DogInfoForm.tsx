"use client";

import type { CapturedPhoto } from "@/lib/imageStore";
import type { CaptureStaff } from "@/types/captureContext";

type DogInfoFormProps = {
  photo: CapturedPhoto;
  staffMembers: CaptureStaff[];
  selectedStaffId: string | null;
  onStaffChange: (staffId: string) => void;
  onConfirm: () => void;
  onBackToPhotos?: () => void;
  onCancel: () => void;
};

export function DogInfoForm({
  photo,
  staffMembers,
  selectedStaffId,
  onStaffChange,
  onConfirm,
  onBackToPhotos,
  onCancel,
}: DogInfoFormProps) {
  const selectedStaff = staffMembers.find((staff) => staff.id === selectedStaffId);

  return (
    <section className="form-panel" aria-label="担当者選択">
      <div className="selected-preview">
        <img src={photo.objectUrl} alt="確定画像" />
      </div>

      <div className="form-content">
        <div>
          <p className="eyebrow">Selected Photo</p>
          <h2>担当者を選択</h2>
          <p>この写真を担当したスタッフを選んでから、画像編集へ進みます。</p>
        </div>

        <div className="login-summary compact-summary">
          <p className="eyebrow">本日の担当</p>
          {staffMembers.length > 0 ? (
            <div className="staff-selector" aria-label="担当者選択">
              {staffMembers.map((staff) => (
                <button
                  className={`staff-button ${staff.id === selectedStaffId ? "is-selected" : ""}`}
                  key={staff.id}
                  type="button"
                  onClick={() => onStaffChange(staff.id)}
                >
                  {staff.displayName}
                </button>
              ))}
            </div>
          ) : (
            <p>担当者が登録されていません。本部画面で担当者を登録してから撮影してください。</p>
          )}
          <p>
            {selectedStaff
              ? `${selectedStaff.displayName} さんを選択中です。`
              : "担当者を選択してください。"}
          </p>
        </div>

        <div className="toolbar">
          <button
            className="action-button primary-wide"
            type="button"
            disabled={!selectedStaff}
            onClick={onConfirm}
          >
            画像編集へ進む
          </button>
          {onBackToPhotos && (
            <button className="action-button secondary" type="button" onClick={onBackToPhotos}>
              写真選択へ戻る
            </button>
          )}
          <button className="action-button danger" type="button" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </section>
  );
}
