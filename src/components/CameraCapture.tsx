"use client";

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
import type { DogInfo } from "@/types/dog";

const MAX_PHOTOS = 3;

type Step = "capture" | "pick" | "info" | "process";

function getTodayLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const photosRef = useRef<CapturedPhoto[]>([]);
  const selectedPhotoRef = useRef<CapturedPhoto | null>(null);
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [dogInfo, setDogInfo] = useState<DogInfo | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [message, setMessage] = useState("カメラを開始してください。");

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef.current);
      releaseCapturedPhotos(photosRef.current);
      if (selectedPhotoRef.current) {
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
      setDogInfo(null);
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
    const unselectedPhotos = photosRef.current.filter((item) => item.id !== photo.id);
    releaseCapturedPhotos(unselectedPhotos);
    replacePhotos([]);
    replaceSelectedPhoto(photo);
    setDogInfo(null);
    setStep("info");
    setMessage("1枚を確定画像として保持しました。追加情報を入力してください。");
  }

  function confirmDogInfo(nextDogInfo: DogInfo) {
    setDogInfo(nextDogInfo);
    setStep("process");
    setMessage("入力内容を保持しました。Canvasで画像加工プレビューを作成します。");
  }

  function retakePhotos() {
    releaseCapturedPhotos(photosRef.current);
    replacePhotos([]);
    if (selectedPhotoRef.current) {
      releaseCapturedPhoto(selectedPhotoRef.current);
      replaceSelectedPhoto(null);
    }
    setDogInfo(null);
    setStep("capture");
    setMessage("一時保持データを破棄しました。撮り直せます。");
    void startCamera();
  }

  function cancelSession() {
    releaseCapturedPhotos(photosRef.current);
    replacePhotos([]);
    if (selectedPhotoRef.current) {
      releaseCapturedPhoto(selectedPhotoRef.current);
      replaceSelectedPhoto(null);
    }
    setDogInfo(null);
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setIsCameraReady(false);
    setStep("capture");
    setMessage("キャンセルしました。写真データは残していません。");
  }

  const canCapture = isCameraReady && photos.length < MAX_PHOTOS;

  if (step === "pick") {
    return (
      <div className="camera-panel">
        <PhotoPicker
          photos={photos}
          onSelect={selectPhoto}
          onRetake={retakePhotos}
          onCancel={cancelSession}
        />
        <p className="notice">{message}</p>
      </div>
    );
  }

  if (step === "info" && selectedPhoto) {
    return (
      <div className="camera-panel">
        <DogInfoForm
          photo={selectedPhoto}
          onConfirm={confirmDogInfo}
          onCancel={cancelSession}
        />
        <p className="notice">{message}</p>
      </div>
    );
  }

  if (step === "process" && selectedPhoto && dogInfo) {
    return (
      <div className="camera-panel">
        <MosaicCanvas photo={selectedPhoto} dogInfo={dogInfo} onCancel={cancelSession} />
        <p className="notice">{message}</p>
      </div>
    );
  }

  return (
    <div className="camera-panel">
      <div className="camera-stage" aria-label="カメラプレビュー">
        <video ref={videoRef} playsInline muted />
        {!isCameraReady && (
          <div className="empty-camera">
            <p>{message}</p>
          </div>
        )}
        <div
          className="frame-overlay"
          data-store={phaseZeroStore.displayName}
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
