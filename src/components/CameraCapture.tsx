"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { DogInfoForm } from "@/components/DogInfoForm";
import { MosaicCanvas } from "@/components/MosaicCanvas";
import { PhotoPicker } from "@/components/PhotoPicker";
import { requestCameraStream, stopCameraStream } from "@/lib/camera";
import {
  CapturedPhoto,
  createCapturedPhoto,
  releaseCapturedPhoto,
  releaseCapturedPhotos,
} from "@/lib/imageStore";
import { phaseZeroStore } from "@/config/stores";
import type { CaptureStaff, CaptureStore } from "@/types/captureContext";

const MAX_PHOTOS = 3;
const MAX_CAPTURE_EDGE = 2000;
const CAPTURE_JPEG_QUALITY = 0.9;

type Step = "capture" | "pick" | "info" | "process";

type CameraCaptureProps = {
  store?: CaptureStore;
  staffMembers?: CaptureStaff[];
  onBack?: () => void;
  onLogout?: () => void;
};

function getTodayLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDisplayStore(store?: CaptureStore) {
  return store?.displayName ?? phaseZeroStore.displayName;
}

function getThemeStyle(store?: CaptureStore): CSSProperties | undefined {
  if (!store?.themeColor) return undefined;

  return {
    "--accent": store.themeColor,
    "--accent-dark": store.themeColor,
  } as CSSProperties;
}

function getCaptureSize(video: HTMLVideoElement) {
  const sourceWidth = video.videoWidth || 1280;
  const sourceHeight = video.videoHeight || 960;
  const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(sourceWidth, sourceHeight));

  return {
    sourceWidth,
    sourceHeight,
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
  };
}

function StoreSettingsSummary({ store, staff }: { store?: CaptureStore; staff?: CaptureStaff }) {
  if (!store) return null;

  return (
    <div className="store-settings-panel compact" aria-label="DBから読み込んだ店舗設定">
      <p className="eyebrow">DBから読み込んだ店舗設定</p>
      <dl className="settings-list">
        <div>
          <dt>店舗コード</dt>
          <dd>{store.storeCode}</dd>
        </div>
        <div>
          <dt>表示名</dt>
          <dd>{store.displayName}</dd>
        </div>
        <div>
          <dt>担当者</dt>
          <dd>{staff?.displayName ?? "写真選択後に選択"}</dd>
        </div>
        <div>
          <dt>テーマ色</dt>
          <dd>{store.themeColor ?? "未設定"}</dd>
        </div>
        <div>
          <dt>ロゴURL</dt>
          <dd>{store.logoUrl ?? "未設定"}</dd>
        </div>
        <div>
          <dt>フレームURL</dt>
          <dd>{store.frameUrl ?? "未設定"}</dd>
        </div>
      </dl>
    </div>
  );
}

export function CameraCapture({ store, staffMembers = [], onBack, onLogout }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const selectedPhotoRef = useRef<CapturedPhoto | null>(null);
  const hasAutoStartedCameraRef = useRef(false);
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [canRetryCamera, setCanRetryCamera] = useState(false);
  const [message, setMessage] = useState("カメラを準備しています。");

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef.current);
      releaseCapturedPhotos(photosRef.current);
      const selectedPhotoWasReleased = photosRef.current.some(
        (photo) => photo.id === selectedPhotoRef.current?.id
      );
      if (selectedPhotoRef.current && !selectedPhotoWasReleased) {
        releaseCapturedPhoto(selectedPhotoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (hasAutoStartedCameraRef.current) return;
    hasAutoStartedCameraRef.current = true;
    void startCamera();
  }, []);

  function replacePhotos(nextPhotos: CapturedPhoto[]) {
    photosRef.current = nextPhotos;
    setPhotos(nextPhotos);
  }

  function replaceSelectedPhoto(photo: CapturedPhoto | null) {
    selectedPhotoRef.current = photo;
    setSelectedPhoto(photo);
  }

  function clearCaptureData() {
    releaseCapturedPhotos(photosRef.current);
    const selectedPhotoWasReleased = photosRef.current.some(
      (photo) => photo.id === selectedPhotoRef.current?.id
    );
    replacePhotos([]);
    if (selectedPhotoRef.current && !selectedPhotoWasReleased) {
      releaseCapturedPhoto(selectedPhotoRef.current);
    }
    replaceSelectedPhoto(null);
    setSelectedStaffId(null);
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setIsCameraReady(false);
    setCanRetryCamera(false);
  }

  function handleLogout() {
    clearCaptureData();
    onLogout?.();
  }

  async function startCamera() {
    setCanRetryCamera(false);
    setMessage("カメラを準備しています。");

    try {
      stopCameraStream(streamRef.current);
      const stream = await requestCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraReady(true);
      setStep("capture");
      setMessage("撮影できます。最大3枚まで一時保持します。");
    } catch (error) {
      setIsCameraReady(false);
      setCanRetryCamera(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "カメラの起動に失敗しました。"
      );
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || photosRef.current.length >= MAX_PHOTOS) return;

    const { sourceWidth, sourceHeight, width, height } = getCaptureSize(video);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("画像を作成できませんでした。");
      return;
    }

    context.drawImage(video, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("撮影データの作成に失敗しました。");
          return;
        }

        const next = [
          ...photosRef.current,
          createCapturedPhoto(blob),
        ].slice(0, MAX_PHOTOS);
        replacePhotos(next);

        if (next.length === MAX_PHOTOS) {
          stopCameraStream(streamRef.current);
          streamRef.current = null;
          setIsCameraReady(false);
          setCanRetryCamera(false);
          setStep("pick");
          setMessage("3枚の撮影が完了しました。ベストショットを1枚選んでください。");
          return;
        }

        setMessage(`${next.length}枚を一時保持中です。クラウドには送信していません。`);
      },
      "image/jpeg",
      CAPTURE_JPEG_QUALITY
    );
  }

  function selectPhoto(photo: CapturedPhoto) {
    replaceSelectedPhoto(photo);
    setStep("info");
    setMessage("1枚を選びました。担当者を選んでから画像編集へ進みます。");
  }

  function backToPhotoPicker() {
    replaceSelectedPhoto(null);
    setStep("pick");
    setMessage("3枚の候補写真を保持しています。別の写真を選び直せます。");
  }

  function confirmStaff() {
    if (!selectedStaff) return;
    setStep("process");
    setMessage("担当者を保持しました。Canvasで画像加工プレビューを作成します。");
  }

  function retakePhotos() {
    clearCaptureData();
    hasAutoStartedCameraRef.current = true;
    setStep("capture");
    setMessage("一時保持データを破棄しました。撮り直せます。");
    void startCamera();
  }

  function cancelSession() {
    clearCaptureData();
    hasAutoStartedCameraRef.current = true;
    setStep("capture");
    setMessage("キャンセルしました。写真データは残していません。");
    void startCamera();
  }

  const canCapture = isCameraReady && photos.length < MAX_PHOTOS;
  const displayStore = getDisplayStore(store);
  const themeStyle = getThemeStyle(store);
  const selectedStaff = staffMembers.find((staff) => staff.id === selectedStaffId);

  if (step === "pick") {
    return (
      <div className="camera-panel" style={themeStyle}>
        <PhotoPicker
          photos={photos}
          onSelect={selectPhoto}
          onRetake={retakePhotos}
          onCancel={cancelSession}
        />
        {onLogout && (
          <div className="toolbar utility-toolbar">
            <button className="action-button secondary" type="button" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        )}
        <p className="notice">{message}</p>
      </div>
    );
  }

  if (step === "info" && selectedPhoto) {
    return (
      <div className="camera-panel" style={themeStyle}>
        <DogInfoForm
          photo={selectedPhoto}
          staffMembers={staffMembers}
          selectedStaffId={selectedStaffId}
          onStaffChange={setSelectedStaffId}
          onConfirm={confirmStaff}
          onBackToPhotos={backToPhotoPicker}
          onCancel={cancelSession}
        />
        {onLogout && (
          <div className="toolbar utility-toolbar">
            <button className="action-button secondary" type="button" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        )}
        <p className="notice">{message}</p>
      </div>
    );
  }

  if (step === "process" && selectedPhoto) {
    return (
      <div className="camera-panel" style={themeStyle}>
        <MosaicCanvas
          photo={selectedPhoto}
          store={store}
          staff={selectedStaff}
          onCancel={cancelSession}
          onBackToPhotos={backToPhotoPicker}
          onLogout={onLogout ? handleLogout : undefined}
        />
        <p className="notice">{message}</p>
      </div>
    );
  }

  return (
    <div className="camera-panel" style={themeStyle}>
      <div className="top-action-bar compact-action-bar">
        <div>
          <p className="eyebrow">撮影店舗</p>
          <h2>{displayStore}</h2>
          <p>担当者は写真を選んだ後に選択します。</p>
        </div>
        {onLogout && (
          <button className="action-button secondary" type="button" onClick={handleLogout}>
            ログアウト
          </button>
        )}
      </div>

      <div className="camera-stage" aria-label="カメラプレビュー">
        <video ref={videoRef} playsInline muted />
        {!isCameraReady && (
          <div className="empty-camera">
            <p>{message}</p>
          </div>
        )}
        {store?.frameUrl && (
          <img className="store-frame-image" src={store.frameUrl} alt="店舗フレーム" />
        )}
        {store?.logoUrl && (
          <img className="store-logo-badge" src={store.logoUrl} alt="店舗ロゴ" />
        )}
        <div
          className="frame-overlay"
          data-store={displayStore}
          data-date={getTodayLabel()}
        />
      </div>

      <div className="toolbar">
        {canRetryCamera && (
          <button className="action-button" type="button" onClick={startCamera}>
            カメラ開始
          </button>
        )}
        <button
          className="action-button"
          type="button"
          onClick={capturePhoto}
          disabled={!canCapture}
        >
          撮影
        </button>
        <button
          className="action-button secondary"
          type="button"
          onClick={retakePhotos}
          disabled={photos.length === 0}
        >
          やり直し
        </button>
        <button className="action-button danger" type="button" onClick={cancelSession}>
          キャンセル
        </button>
        {onBack && (
          <button className="action-button secondary" type="button" onClick={onBack}>
            店舗ホームへ戻る
          </button>
        )}
        {onLogout && (
          <button className="action-button secondary" type="button" onClick={handleLogout}>
            ログアウト
          </button>
        )}
        <span className="status-pill">{photos.length} / {MAX_PHOTOS} 枚</span>
      </div>

      <p className="notice">{message}</p>

      {photos.length > 0 && (
        <div className="photo-grid" aria-label="一時保持された写真">
          {photos.map((photo, index) => (
            <div className="photo-tile" key={photo.id}>
              <img src={photo.objectUrl} alt={`一時保持写真 ${index + 1}`} />
            </div>
          ))}
        </div>
      )}

      <StoreSettingsSummary store={store} staff={selectedStaff} />
    </div>
  );
}
