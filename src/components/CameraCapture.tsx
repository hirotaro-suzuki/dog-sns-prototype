"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MosaicCanvas } from "@/components/MosaicCanvas";
import { PhotoPreviewOverlay } from "@/components/PhotoPreviewOverlay";
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
const MAX_CAPTURE_EDGE = 2400;
const CAPTURE_JPEG_QUALITY = 0.9;
const MAX_FRAME_CHOICES = 3;

type Step = "capture" | "process";

type CameraCaptureProps = {
  store?: CaptureStore;
  staffMembers?: CaptureStaff[];
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
  // カメラ映像はcamera-stage内でobject-fit: coverにより正方形に見切れて表示されるため、
  // 保存する画像も同じ中央正方形切り抜きにして、プレビュー表示と一致させる。
  const cropSize = Math.min(sourceWidth, sourceHeight);
  const cropX = (sourceWidth - cropSize) / 2;
  const cropY = (sourceHeight - cropSize) / 2;
  const scale = Math.min(1, MAX_CAPTURE_EDGE / cropSize);
  const edge = Math.round(cropSize * scale);

  return { cropX, cropY, cropSize, edge };
}

export function CameraCapture({ store, staffMembers = [], onLogout }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const selectedPhotoRef = useRef<CapturedPhoto | null>(null);
  const hasAutoStartedCameraRef = useRef(false);
  const isEncodingRef = useRef(false);
  const returnedHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<CapturedPhoto | null>(null);
  const [returnedPhotoId, setReturnedPhotoId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [canRetryCamera, setCanRetryCamera] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("カメラを準備しています。");
  const [captureError, setCaptureError] = useState("");

  const frameChoices = useMemo(
    () => (store?.frames ?? []).slice(0, MAX_FRAME_CHOICES),
    [store?.frames]
  );
  const selectedFrame = frameChoices.find((frame) => frame.id === selectedFrameId) ?? frameChoices[0] ?? null;
  // TODO(logo-deprecation): logoUrl remains for old data only. New official designs should embed logos in frame images.
  const activeStore = store
    ? {
        ...store,
        frameUrl: selectedFrame?.frameUrl ?? store.frameUrl,
      }
    : undefined;

  useEffect(() => {
    if (frameChoices.length === 0) {
      setSelectedFrameId(null);
      return;
    }

    setSelectedFrameId((currentId) => {
      if (currentId && frameChoices.some((frame) => frame.id === currentId)) return currentId;
      return frameChoices.find((frame) => frame.isDefault)?.id ?? frameChoices[0].id;
    });
  }, [frameChoices]);

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
      if (returnedHighlightTimeoutRef.current) {
        clearTimeout(returnedHighlightTimeoutRef.current);
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
    setPreviewPhoto(null);
    setReturnedPhotoId(null);
    if (returnedHighlightTimeoutRef.current) {
      clearTimeout(returnedHighlightTimeoutRef.current);
    }
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
    setCameraMessage("カメラを準備しています。");

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
    } catch (error) {
      setIsCameraReady(false);
      setCanRetryCamera(true);
      setCameraMessage(
        error instanceof Error ? error.message : "カメラの起動に失敗しました。"
      );
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || isEncodingRef.current || !selectedStaffId || photosRef.current.length >= MAX_PHOTOS) return;

    isEncodingRef.current = true;
    const { cropX, cropY, cropSize, edge } = getCaptureSize(video);
    const canvas = document.createElement("canvas");
    canvas.width = edge;
    canvas.height = edge;

    const context = canvas.getContext("2d");
    if (!context) {
      isEncodingRef.current = false;
      setCaptureError("画像を作成できませんでした。");
      return;
    }

    context.drawImage(video, cropX, cropY, cropSize, cropSize, 0, 0, edge, edge);

    canvas.toBlob(
      (blob) => {
        isEncodingRef.current = false;
        if (!blob) {
          setCaptureError("撮影データの作成に失敗しました。");
          return;
        }

        setCaptureError("");
        const next = [...photosRef.current, createCapturedPhoto(blob)].slice(0, MAX_PHOTOS);
        replacePhotos(next);
      },
      "image/jpeg",
      CAPTURE_JPEG_QUALITY
    );
  }

  function selectPhoto(photo: CapturedPhoto) {
    replaceSelectedPhoto(photo);
    setPreviewPhoto(null);
    setStep("process");
  }

  function deletePhoto(photo: CapturedPhoto) {
    const next = photosRef.current.filter((item) => item.id !== photo.id);
    releaseCapturedPhoto(photo);
    replacePhotos(next);
    setPreviewPhoto(null);
  }

  function closePreview(photo: CapturedPhoto) {
    setPreviewPhoto(null);
    setReturnedPhotoId(photo.id);
    if (returnedHighlightTimeoutRef.current) {
      clearTimeout(returnedHighlightTimeoutRef.current);
    }
    returnedHighlightTimeoutRef.current = setTimeout(() => {
      setReturnedPhotoId(null);
    }, 3000);
  }

  function backToCapture() {
    replaceSelectedPhoto(null);
    setStep("capture");
  }

  function retakePhotos() {
    clearCaptureData();
    hasAutoStartedCameraRef.current = true;
    setStep("capture");
    void startCamera();
  }

  function cancelSession() {
    clearCaptureData();
    hasAutoStartedCameraRef.current = true;
    setStep("capture");
    void startCamera();
  }

  function finishSession() {
    clearCaptureData();
    hasAutoStartedCameraRef.current = true;
    setStep("capture");
  }

  const canCapture = isCameraReady && Boolean(selectedStaffId) && photos.length < MAX_PHOTOS;
  const isPhotoStockFull = photos.length >= MAX_PHOTOS;
  const displayStore = getDisplayStore(store);
  const themeStyle = getThemeStyle(store);
  const selectedStaff = staffMembers.find((staff) => staff.id === selectedStaffId);

  if (step === "process" && selectedPhoto) {
    return (
      <div className="camera-panel" style={themeStyle}>
        {frameChoices.length > 1 && (
          <div className="frame-choice-bar" aria-label="写真枠選択">
            {frameChoices.map((frame) => (
              <button
                key={frame.id}
                className={`frame-choice-button${selectedFrame?.id === frame.id ? " is-selected" : ""}`}
                type="button"
                onClick={() => setSelectedFrameId(frame.id)}
              >
                {frame.frameName}
              </button>
            ))}
          </div>
        )}
        <MosaicCanvas
          photo={selectedPhoto}
          store={activeStore}
          staff={selectedStaff}
          onCancel={cancelSession}
          onBackToPhotos={backToCapture}
          onStartNext={retakePhotos}
          onFinishSession={finishSession}
          onLogout={onLogout ? handleLogout : undefined}
        />
      </div>
    );
  }

  return (
    <div className="camera-panel" style={themeStyle}>
      <div className="top-action-bar compact-action-bar">
        <div>
          <p className="eyebrow">撮影店舗</p>
          <h2>{displayStore}</h2>
        </div>
        {onLogout && (
          <button className="icon-button" type="button" onClick={handleLogout} aria-label="ログアウト">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {frameChoices.length > 1 && (
        <div className="frame-choice-bar" aria-label="写真枠選択">
          {frameChoices.map((frame) => (
            <button
              key={frame.id}
              className={`frame-choice-button${selectedFrame?.id === frame.id ? " is-selected" : ""}`}
              type="button"
              onClick={() => setSelectedFrameId(frame.id)}
            >
              {frame.frameName}
            </button>
          ))}
        </div>
      )}

      {staffMembers.length > 0 && (
        <div className="staff-chip-row" aria-label="担当者選択">
          {staffMembers.map((staff) => (
            <button
              key={staff.id}
              className={`staff-chip${staff.id === selectedStaffId ? " is-selected" : ""}`}
              type="button"
              onClick={() => setSelectedStaffId(staff.id)}
            >
              {staff.displayName}
            </button>
          ))}
        </div>
      )}

      <div className="camera-stage-wrap">
        <div className="camera-stage" aria-label="カメラプレビュー">
          <video ref={videoRef} playsInline muted />
          {!isCameraReady && (
            <div className="empty-camera">
              <p>{cameraMessage}</p>
              {canRetryCamera && (
                <button className="action-button" type="button" onClick={startCamera}>
                  カメラ再開
                </button>
              )}
            </div>
          )}
          {isCameraReady && isPhotoStockFull && <div className="camera-stage-full-overlay" aria-hidden="true" />}
          {activeStore?.frameUrl ? (
            <img className="store-frame-image" src={activeStore.frameUrl} alt="店舗フレーム" />
          ) : (
            <div className="frame-overlay" data-store={displayStore} data-date={getTodayLabel()} />
          )}
        </div>
      </div>

      <div className="capture-control-row">
        <div className="thumbnail-strip" aria-label="一時保持された写真">
          {photos.map((photo, index) => (
            <div
              className={`thumbnail-item${photo.id === returnedPhotoId ? " is-returned" : ""}`}
              key={photo.id}
            >
              <button
                className="thumbnail-image-button"
                type="button"
                onClick={() => setPreviewPhoto(photo)}
                aria-label={`撮影写真 ${index + 1} をプレビュー`}
              >
                <img src={photo.objectUrl} alt={`撮影写真 ${index + 1}`} />
              </button>
              <button
                className="thumbnail-delete-badge"
                type="button"
                onClick={() => deletePhoto(photo)}
                aria-label={`撮影写真 ${index + 1} を消す`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          className="shutter-button"
          type="button"
          onClick={capturePhoto}
          disabled={!canCapture}
          aria-label="撮影"
        />

        <span className="status-pill" style={{ justifySelf: "end" }}>
          {photos.length} / {MAX_PHOTOS} 枚
        </span>
      </div>

      {staffMembers.length === 0 && (
        <p className="notice error">担当者が登録されていません。本部の管理画面で担当者を登録してください。</p>
      )}
      {captureError && <p className="notice error">{captureError}</p>}

      {previewPhoto && (
        <PhotoPreviewOverlay
          photo={previewPhoto}
          onConfirm={() => selectPhoto(previewPhoto)}
          onDelete={() => deletePhoto(previewPhoto)}
          onClose={() => closePreview(previewPhoto)}
        />
      )}
    </div>
  );
}
