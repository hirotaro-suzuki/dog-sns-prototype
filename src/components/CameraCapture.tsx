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
import type { DogInfo } from "@/types/dog";

const MAX_PHOTOS = 3;
const EMPTY_DOG_INFO: DogInfo = {
  dogName: "",
  dogBreed: "",
  dogAge: "",
};

type Step = "capture" | "pick" | "info" | "process";

type CameraCaptureProps = {
  store?: CaptureStore;
  staff?: CaptureStaff;
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
          <dd>{staff?.displayName ?? "未選択"}</dd>
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

export function CameraCapture({ store, staff, onBack, onLogout }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const selectedPhotoRef = useRef<CapturedPhoto | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [dogInfo, setDogInfo] = useState<DogInfo>(EMPTY_DOG_INFO);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [message, setMessage] = useState("カメラを開始してください。");

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
    setDogInfo(EMPTY_DOG_INFO);
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setIsCameraReady(false);
  }

  function handleLogout() {
    clearCaptureData();
    onLogout?.();
  }

  async function startCamera() {
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
      setDogInfo(EMPTY_DOG_INFO);
      setMessage("撮影できます。最大3枚まで一時保持します。");
    } catch (error) {
      setIsCameraReady(false);
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

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;

    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("画像を作成できませんでした。");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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
          setStep("pick");
          setMessage("3枚の撮影が完了しました。ベストショットを1枚選んでください。");
          return;
        }

        setMessage(`${next.length}枚を一時保持中です。クラウドには送信していません。`);
      },
      "image/jpeg",
      0.9
    );
  }

  function selectPhoto(photo: CapturedPhoto) {
    replaceSelectedPhoto(photo);
    setStep("info");
    setMessage("1枚を選びました。間違えた場合は写真選択へ戻れます。");
  }

  function backToPhotoPicker() {
    replaceSelectedPhoto(null);
    setStep("pick");
    setMessage("3枚の候補写真を保持しています。別の写真を選び直せます。");
  }

  function confirmDogInfo(nextDogInfo: DogInfo) {
    setDogInfo(nextDogInfo);
    setStep("process");
    setMessage("入力内容を保持しました。Canvasで画像加工プレビューを作成します。");
  }

  function retakePhotos() {
    clearCaptureData();
    setStep("capture");
    setMessage("一時保持データを破棄しました。撮り直せます。");
    void startCamera();
  }

  function cancelSession() {
    clearCaptureData();
    setStep("capture");
    setMessage("キャンセルしました。写真データは残していません。");
  }

  const canCapture = isCameraReady && photos.length < MAX_PHOTOS;
  const displayStore = getDisplayStore(store);
  const themeStyle = getThemeStyle(store);

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
          dogInfo={dogInfo}
          staff={staff}
          onChange={setDogInfo}
          onConfirm={confirmDogInfo}
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
          dogInfo={dogInfo}
          store={store}
          staff={staff}
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
      <div className="top-action-bar">
        <div>
          <p className="eyebrow">撮影店舗</p>
          <h2>{displayStore}</h2>
          <p>{staff ? `担当: ${staff.displayName}` : "担当者未選択"}</p>
        </div>
        {onLogout && (
          <button className="action-button secondary" type="button" onClick={handleLogout}>
            ログアウト
          </button>
        )}
      </div>

      <StoreSettingsSummary store={store} staff={staff} />

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
        <button className="action-button" type="button" onClick={startCamera}>
          カメラ開始
        </button>
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
    </div>
  );
}
