"use client";

import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
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

type CanvasPoint = {
  x: number;
  y: number;
};

type MosaicStroke = {
  id: string;
  points: CanvasPoint[];
  radius: number;
};

type EditMode = "adjust" | "mosaic";

const CANVAS_WIDTH = 1270;
const CANVAS_HEIGHT = 890;
const MOSAIC_RADIUS = 52;
const MOSAIC_SAMPLE_SIZE = 12;

function getTodayLabel() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTouchPoint(canvas: HTMLCanvasElement, touch: Touch) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;

  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
  };
}

function getTouchGeometry(canvas: HTMLCanvasElement, touches: TouchList) {
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

function drawMosaicSpot(
  context: CanvasRenderingContext2D,
  point: CanvasPoint,
  radius: number
) {
  const sourceX = Math.max(0, Math.round(point.x - radius));
  const sourceY = Math.max(0, Math.round(point.y - radius));
  const sourceWidth = Math.min(radius * 2, CANVAS_WIDTH - sourceX);
  const sourceHeight = Math.min(radius * 2, CANVAS_HEIGHT - sourceY);
  if (sourceWidth <= 0 || sourceHeight <= 0) return;

  const buffer = document.createElement("canvas");
  buffer.width = MOSAIC_SAMPLE_SIZE;
  buffer.height = MOSAIC_SAMPLE_SIZE;
  const bufferContext = buffer.getContext("2d");
  if (!bufferContext) return;

  bufferContext.imageSmoothingEnabled = false;
  bufferContext.drawImage(
    context.canvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    MOSAIC_SAMPLE_SIZE,
    MOSAIC_SAMPLE_SIZE
  );

  context.save();
  context.imageSmoothingEnabled = false;
  context.drawImage(
    buffer,
    0,
    0,
    MOSAIC_SAMPLE_SIZE,
    MOSAIC_SAMPLE_SIZE,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight
  );
  context.strokeStyle = "rgba(255, 255, 255, 0.35)";
  context.lineWidth = 2;
  context.strokeRect(sourceX, sourceY, sourceWidth, sourceHeight);
  context.restore();
}

function drawMosaicStrokes(
  context: CanvasRenderingContext2D,
  strokes: MosaicStroke[]
) {
  strokes.forEach((stroke) => {
    stroke.points.forEach((point) => drawMosaicSpot(context, point, stroke.radius));
  });
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
  const strokesRef = useRef<MosaicStroke[]>([]);
  const activeStrokeIdRef = useRef<string | null>(null);
  const editModeRef = useRef<EditMode>("adjust");
  const [editMode, setEditMode] = useState<EditMode>("adjust");
  const [strokeCount, setStrokeCount] = useState(0);
  const [completedImageUrl, setCompletedImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("Canvas加工を準備しています。");

  function renderCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPhotoLayer(context, image, transformRef.current);
    drawMosaicStrokes(context, strokesRef.current);
    drawFixedFrame(context, dogInfo);
  }

  function switchMode(nextMode: EditMode) {
    editModeRef.current = nextMode;
    setEditMode(nextMode);
    setStatus(
      nextMode === "mosaic"
        ? "モザイクモードです。隠したい場所を指でなぞってください。"
        : "写真調整モードです。写真だけを移動・拡大縮小・回転できます。"
    );
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
      strokesRef.current = [];
      activeStrokeIdRef.current = null;
      setStrokeCount(0);
      setCompletedImageUrl(null);
      renderCanvas();
      setStatus("写真調整モードです。モザイクが必要な場合はモザイクボタンを押してください。");
    };

    image.onerror = () => {
      setStatus("画像の読み込みに失敗しました。");
    };

    image.src = photo.objectUrl;
  }, [photo.objectUrl]);

  useEffect(() => {
    renderCanvas();
  }, [dogInfo]);

  function startMosaicStroke(point: CanvasPoint) {
    const stroke: MosaicStroke = {
      id: crypto.randomUUID(),
      points: [point],
      radius: MOSAIC_RADIUS,
    };
    strokesRef.current = [...strokesRef.current, stroke];
    activeStrokeIdRef.current = stroke.id;
    setStrokeCount(strokesRef.current.length);
    setCompletedImageUrl(null);
    renderCanvas();
  }

  function appendMosaicPoint(point: CanvasPoint) {
    const activeStrokeId = activeStrokeIdRef.current;
    if (!activeStrokeId) return;

    const lastStroke = strokesRef.current.find((stroke) => stroke.id === activeStrokeId);
    const lastPoint = lastStroke?.points.at(-1);
    if (lastPoint && Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) < 18) {
      return;
    }

    strokesRef.current = strokesRef.current.map((stroke) =>
      stroke.id === activeStrokeId
        ? { ...stroke, points: [...stroke.points, point] }
        : stroke
    );
    renderCanvas();
  }

  function handleTouchStart(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    if (editModeRef.current === "mosaic") {
      startMosaicStroke(getTouchPoint(canvas, event.touches[0]));
      return;
    }

    const geometry = getTouchGeometry(canvas, event.touches);
    gestureRef.current = {
      ...geometry,
      transform: { ...transformRef.current },
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    if (editModeRef.current === "mosaic") {
      appendMosaicPoint(getTouchPoint(canvas, event.touches[0]));
      return;
    }

    const gesture = gestureRef.current;
    if (!gesture) return;

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
    setCompletedImageUrl(null);
    renderCanvas();
  }

  function handleTouchEnd(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();

    if (editModeRef.current === "mosaic") {
      activeStrokeIdRef.current = null;
      setStatus(`${strokesRef.current.length}か所のモザイクを追加しました。`);
      return;
    }

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
    setCompletedImageUrl(null);
    renderCanvas();
    setStatus("写真位置を初期状態に戻しました。");
  }

  function undoLastMosaic() {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    setCompletedImageUrl(null);
    renderCanvas();
    setStatus("直前のモザイクを取り消しました。");
  }

  function finalizeImage() {
    renderCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const nextUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCompletedImageUrl(nextUrl);
    setStatus("完成画像を作成しました。次の段階ではこの画像を印刷・保存に使います。");
  }

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      <div className="section-heading">
        <p className="eyebrow">Canvas Preview</p>
        <h2>画像加工プレビュー</h2>
        <p>写真位置を調整し、必要な場所だけ手動でモザイクを追加できます。</p>
      </div>

      <div className={`canvas-frame ${editMode === "mosaic" ? "is-mosaic-mode" : ""}`}>
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
        <button
          className={`action-button ${editMode === "adjust" ? "" : "secondary"}`}
          type="button"
          onClick={() => switchMode("adjust")}
        >
          写真を調整
        </button>
        <button
          className={`action-button ${editMode === "mosaic" ? "" : "secondary"}`}
          type="button"
          onClick={() => switchMode("mosaic")}
        >
          モザイク
        </button>
        <button className="action-button secondary" type="button" onClick={undoLastMosaic} disabled={strokeCount === 0}>
          直前のモザイクを戻す
        </button>
        <button className="action-button secondary" type="button" onClick={resetTransform}>
          写真位置をリセット
        </button>
        <button className="action-button primary-wide" type="button" onClick={finalizeImage}>
          確定して完成画像にする
        </button>
        <button className="action-button secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
      </div>

      {completedImageUrl && (
        <div className="final-image-panel">
          <p className="eyebrow">Final Image</p>
          <img src={completedImageUrl} alt="完成画像" />
        </div>
      )}

      <p className="notice">{status}</p>
    </section>
  );
}
