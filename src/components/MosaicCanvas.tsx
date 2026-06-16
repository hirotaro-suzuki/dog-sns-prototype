"use client";

import { TouchEvent, useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import { phaseZeroStore } from "@/config/stores";
import type { DogInfo } from "@/types/dog";

type MosaicCanvasProps = {
  photo: CapturedPhoto;
  dogInfo: DogInfo;
  onCancel: () => void;
};

type PhotoTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type GestureSnapshot = {
  centerX: number;
  centerY: number;
  distance: number;
  angle: number;
  transform: PhotoTransform;
};

const CANVAS_WIDTH = 1270;
const CANVAS_HEIGHT = 890;

function getTodayLabel() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTouchPoint(canvas: HTMLCanvasElement, touch: React.Touch) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;

  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

function getTouchGeometry(canvas: HTMLCanvasElement, touches: React.TouchList) {
  const first = getTouchPoint(canvas, touches[0]);

  if (touches.length === 1) {
    return {
      centerX: first.x,
      centerY: first.y,
      distance: 1,
      angle: 0,
    };
  }

  const second = getTouchPoint(canvas, touches[1]);
  const dx = second.x - first.x;
  const dy = second.y - first.y;

  return {
    centerX: (first.x + second.x) / 2,
    centerY: (first.y + second.y) / 2,
    distance: Math.hypot(dx, dy),
    angle: Math.atan2(dy, dx),
  };
}

function getBaseImageScale(image: HTMLImageElement) {
  return Math.max(
    CANVAS_WIDTH / image.naturalWidth,
    CANVAS_HEIGHT / image.naturalHeight
  );
}

function drawPhotoLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: PhotoTransform
) {
  const baseScale = getBaseImageScale(image);
  const width = image.naturalWidth * baseScale;
  const height = image.naturalHeight * baseScale;

  context.save();
  context.translate(transform.x, transform.y);
  context.rotate(transform.rotation);
  context.scale(transform.scale, transform.scale);
  context.drawImage(image, -width / 2, -height / 2, width, height);
  context.restore();
}

function drawFixedFrame(
  context: CanvasRenderingContext2D,
  dogInfo: DogInfo
) {
  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fillRect(0, 0, CANVAS_WIDTH, 120);
  context.fillRect(0, CANVAS_HEIGHT - 150, CANVAS_WIDTH, 150);

  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 10;
  context.strokeRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.font = "700 52px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText(phaseZeroStore.displayName, 56, 70);

  context.font = "700 38px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(getTodayLabel(), CANVAS_WIDTH - 56, 70);

  context.textAlign = "left";
  context.font = "700 44px Arial, sans-serif";
  const nameLabel = dogInfo.dogName.trim() || "お名前未入力";
  context.fillText(nameLabel, 56, CANVAS_HEIGHT - 92);

  context.font = "500 30px Arial, sans-serif";
  const detailLabel = [dogInfo.dogBreed, dogInfo.dogAge]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" / ");
  context.fillText(detailLabel || "犬種・犬齢未入力", 56, CANVAS_HEIGHT - 45);

  context.textAlign = "right";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("DEMO STORE LOGO", CANVAS_WIDTH - 56, CANVAS_HEIGHT - 64);
}

function clampScale(scale: number) {
  return Math.min(Math.max(scale, 0.55), 4);
}

export function MosaicCanvas({ photo, dogInfo, onCancel }: MosaicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<PhotoTransform>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    scale: 1,
    rotation: 0,
  });
  const gestureRef = useRef<GestureSnapshot | null>(null);
  const [status, setStatus] = useState("Canvas加工を準備しています。");

  function renderCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPhotoLayer(context, image, transformRef.current);
    drawFixedFrame(context, dogInfo);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      transformRef.current = {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        scale: 1,
        rotation: 0,
      };
      renderCanvas();
      setStatus("写真だけを指で移動・拡大縮小・回転できます。文字とフレームは固定です。");
    };

    image.onerror = () => {
      setStatus("画像の読み込みに失敗しました。");
    };

    image.src = photo.objectUrl;
  }, [photo.objectUrl]);

  useEffect(() => {
    renderCanvas();
  }, [dogInfo]);

  function handleTouchStart(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    const geometry = getTouchGeometry(canvas, event.touches);
    gestureRef.current = {
      ...geometry,
      transform: { ...transformRef.current },
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const gesture = gestureRef.current;
    if (!canvas || !gesture || event.touches.length === 0) return;

    const geometry = getTouchGeometry(canvas, event.touches);
    const nextTransform: PhotoTransform = {
      x: gesture.transform.x + (geometry.centerX - gesture.centerX),
      y: gesture.transform.y + (geometry.centerY - gesture.centerY),
      scale: gesture.transform.scale,
      rotation: gesture.transform.rotation,
    };

    if (event.touches.length >= 2) {
      nextTransform.scale = clampScale(
        gesture.transform.scale * (geometry.distance / gesture.distance)
      );
      nextTransform.rotation =
        gesture.transform.rotation + (geometry.angle - gesture.angle);
    }

    transformRef.current = nextTransform;
    renderCanvas();
  }

  function handleTouchEnd(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) {
      gestureRef.current = null;
      return;
    }

    const geometry = getTouchGeometry(canvas, event.touches);
    gestureRef.current = {
      ...geometry,
      transform: { ...transformRef.current },
    };
  }

  function resetTransform() {
    transformRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      scale: 1,
      rotation: 0,
    };
    renderCanvas();
    setStatus("写真位置を初期状態に戻しました。");
  }

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      <div className="section-heading">
        <p className="eyebrow">Canvas Preview</p>
        <h2>画像加工プレビュー</h2>
        <p>写真だけを指で動かせます。文字、日付、店舗ロゴ、外枠は固定されたままです。</p>
      </div>

      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          aria-label="加工済み画像プレビュー"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        />
      </div>

      <div className="toolbar">
        <button className="action-button secondary" type="button" onClick={resetTransform}>
          写真位置をリセット
        </button>
        <button className="action-button secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
        <span className="status-pill">タッチ調整対応</span>
      </div>

      <p className="notice">{status}</p>
    </section>
  );
}
