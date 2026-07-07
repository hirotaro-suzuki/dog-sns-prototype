"use client";

import type { CSSProperties, TouchEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import type { CaptureStaff, CaptureStore } from "@/types/captureContext";

type MosaicCanvasProps = {
  photo: CapturedPhoto;
  store?: CaptureStore;
  staff?: CaptureStaff;
  onCancel: () => void;
  onBackToPhotos?: () => void;
  onStartNext?: () => void;
  onFinishSession?: () => void;
  onLogout?: () => void;
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

type PhotoPoint = {
  x: number;
  y: number;
};

type MosaicPoint = {
  point: PhotoPoint;
  radius: number;
};

type MosaicStroke = {
  id: string;
  points: MosaicPoint[];
};

type TextBoxSize = "small" | "medium" | "large";

type TextBox = {
  id: string;
  text: string;
  point: PhotoPoint;
  size: TextBoxSize;
  color: string;
  rotation: number;
};

type TextDragSnapshot = {
  id: string;
  offset: PhotoPoint;
};

type EditMode = "adjust" | "mosaic" | "text";

const CANVAS_SIZE = 1080;
const CANVAS_WIDTH = CANVAS_SIZE;
const CANVAS_HEIGHT = CANVAS_SIZE;
const MOSAIC_RADIUS = 52;
const MOSAIC_SAMPLE_SIZE = 12;
const MAX_TEXT_BOXES = 8;
const MAX_TEXT_LENGTH = 15;
const TEXT_COLORS = [
  { label: "白", value: "#ffffff" },
  { label: "黒", value: "#111111" },
  { label: "赤", value: "#d73a31" },
  { label: "青", value: "#1d64d8" },
  { label: "黄", value: "#f2c94c" },
];
const TEXT_SIZE_LABELS: Record<TextBoxSize, string> = {
  small: "小",
  medium: "中",
  large: "大",
};
const TEXT_FONT_SIZES: Record<TextBoxSize, number> = {
  small: 34,
  medium: 46,
  large: 58,
};

function createStrokeId() {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createTextBoxId() {
  return `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function loadCanvasImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function transformPhotoPointToCanvas(
  image: HTMLImageElement,
  transform: PhotoTransform,
  point: PhotoPoint
) {
  const baseScale = getBaseImageScale(image);
  const width = image.naturalWidth * baseScale;
  const height = image.naturalHeight * baseScale;
  const localX = point.x * baseScale - width / 2;
  const localY = point.y * baseScale - height / 2;
  const scaledX = localX * transform.scale;
  const scaledY = localY * transform.scale;
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);

  return {
    x: transform.x + scaledX * cos - scaledY * sin,
    y: transform.y + scaledX * sin + scaledY * cos,
  };
}

function transformCanvasPointToPhoto(
  image: HTMLImageElement,
  transform: PhotoTransform,
  point: CanvasPoint
): PhotoPoint | null {
  const baseScale = getBaseImageScale(image);
  const width = image.naturalWidth * baseScale;
  const height = image.naturalHeight * baseScale;
  const dx = point.x - transform.x;
  const dy = point.y - transform.y;
  const cos = Math.cos(-transform.rotation);
  const sin = Math.sin(-transform.rotation);
  const unrotatedX = dx * cos - dy * sin;
  const unrotatedY = dx * sin + dy * cos;
  const localX = unrotatedX / transform.scale;
  const localY = unrotatedY / transform.scale;
  const photoX = (localX + width / 2) / baseScale;
  const photoY = (localY + height / 2) / baseScale;

  if (
    photoX < 0 ||
    photoX > image.naturalWidth ||
    photoY < 0 ||
    photoY > image.naturalHeight
  ) {
    return null;
  }

  return { x: photoX, y: photoY };
}

function getPhotoSpaceRadius(image: HTMLImageElement, transform: PhotoTransform) {
  return MOSAIC_RADIUS / (getBaseImageScale(image) * transform.scale);
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

function getTodayLabel() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function getSelectedFrame(store?: CaptureStore) {
  return store?.frames.find((frame) => frame.frameUrl === store.frameUrl) ?? store?.frames[0] ?? null;
}

function getFrameDateColor(color?: string) {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#ffffff";
}

function drawFrameDate(context: CanvasRenderingContext2D, store?: CaptureStore) {
  const frame = getSelectedFrame(store);
  if (frame?.dateEnabled === false) return;

  const fontSize = frame?.dateFontSize ?? 38;
  const x = frame?.dateX ?? 900;
  const y = frame?.dateY ?? 90;

  context.save();
  context.textBaseline = "middle";
  context.textAlign = "center";
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  context.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
  context.strokeStyle = "rgba(0, 0, 0, 0.45)";
  context.fillStyle = getFrameDateColor(frame?.dateColor);
  context.strokeText(getTodayLabel(), x, y);
  context.fillText(getTodayLabel(), x, y);
  context.restore();
}

function drawFixedFrame(
  context: CanvasRenderingContext2D,
  store: CaptureStore | undefined,
  frameImage?: HTMLImageElement | null
) {
  if (frameImage) {
    context.drawImage(frameImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawFrameDate(context, store);
    return;
  }

  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.88)";
  context.lineWidth = 10;
  context.strokeRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

  context.strokeStyle = "rgba(23, 111, 98, 0.78)";
  context.lineWidth = 6;
  context.strokeRect(44, 44, CANVAS_WIDTH - 88, CANVAS_HEIGHT - 88);
  context.restore();
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
  image: HTMLImageElement,
  transform: PhotoTransform,
  strokes: MosaicStroke[]
) {
  const baseScale = getBaseImageScale(image);
  const canvasScale = baseScale * transform.scale;

  strokes.forEach((stroke) => {
    stroke.points.forEach(({ point, radius }) => {
      drawMosaicSpot(
        context,
        transformPhotoPointToCanvas(image, transform, point),
        radius * canvasScale
      );
    });
  });
}

function getTextBoxLocalBounds(
  context: CanvasRenderingContext2D,
  textBox: TextBox
) {
  const fontSize = TEXT_FONT_SIZES[textBox.size];
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  const metrics = context.measureText(textBox.text || "文字");
  const width = Math.max(metrics.width, 72);
  const height = fontSize + 18;

  return {
    left: -14,
    top: -height + 6,
    right: width + 14,
    bottom: 12,
    width: width + 28,
    height,
  };
}

function getTextBoxCanvasPoint(
  image: HTMLImageElement,
  transform: PhotoTransform,
  textBox: TextBox
) {
  return transformPhotoPointToCanvas(image, transform, textBox.point);
}

function getTextBoxCanvasRotation(transform: PhotoTransform, textBox: TextBox) {
  return transform.rotation + textBox.rotation;
}

function drawTextBoxes(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  transform: PhotoTransform,
  textBoxes: TextBox[],
  selectedTextBoxId: string | null,
  showSelection: boolean
) {
  const baseScale = getBaseImageScale(image);
  const width = image.naturalWidth * baseScale;
  const height = image.naturalHeight * baseScale;

  context.save();
  context.translate(transform.x, transform.y);
  context.rotate(transform.rotation);
  context.scale(transform.scale, transform.scale);
  context.translate(-width / 2, -height / 2);

  textBoxes.forEach((textBox) => {
    const fontSize = TEXT_FONT_SIZES[textBox.size];
    const x = textBox.point.x * baseScale;
    const y = textBox.point.y * baseScale;

    context.save();
    context.translate(x, y);
    context.rotate(textBox.rotation);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.font = `700 ${fontSize}px Arial, sans-serif`;
    context.lineWidth = Math.max(5, Math.round(fontSize * 0.12));
    context.strokeStyle = textBox.color === "#111111" ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.72)";
    context.fillStyle = textBox.color;
    context.strokeText(textBox.text || "文字", 0, 0);
    context.fillText(textBox.text || "文字", 0, 0);

    if (showSelection && textBox.id === selectedTextBoxId) {
      const bounds = getTextBoxLocalBounds(context, textBox);
      context.setLineDash([12, 8]);
      context.lineWidth = 3;
      context.strokeStyle = "rgba(255, 255, 255, 0.95)";
      context.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
      context.setLineDash([]);
    }

    context.restore();
  });

  context.restore();
}

function findTextBoxAtPoint(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  textBoxes: TextBox[],
  point: CanvasPoint,
  transform: PhotoTransform
) {
  const photoPoint = transformCanvasPointToPhoto(image, transform, point);
  if (!photoPoint) return null;

  const baseScale = getBaseImageScale(image);
  const localPoint = {
    x: photoPoint.x * baseScale,
    y: photoPoint.y * baseScale,
  };

  for (let index = textBoxes.length - 1; index >= 0; index -= 1) {
    const textBox = textBoxes[index];
    const anchorX = textBox.point.x * baseScale;
    const anchorY = textBox.point.y * baseScale;
    const dx = localPoint.x - anchorX;
    const dy = localPoint.y - anchorY;
    const cos = Math.cos(-textBox.rotation);
    const sin = Math.sin(-textBox.rotation);
    const rotatedPoint = {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
    const bounds = getTextBoxLocalBounds(context, textBox);
    if (
      rotatedPoint.x >= bounds.left &&
      rotatedPoint.x <= bounds.right &&
      rotatedPoint.y >= bounds.top &&
      rotatedPoint.y <= bounds.bottom
    ) {
      return {
        textBox,
        photoPoint,
      };
    }
  }

  return null;
}

export function MosaicCanvas({
  photo,
  store,
  staff,
  onCancel,
  onBackToPhotos,
  onStartNext,
  onFinishSession,
  onLogout,
}: MosaicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<PhotoTransform>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    scale: 1,
    rotation: 0,
  });
  const gestureRef = useRef<GestureSnapshot | null>(null);
  const textDragRef = useRef<TextDragSnapshot | null>(null);
  const strokesRef = useRef<MosaicStroke[]>([]);
  const textBoxesRef = useRef<TextBox[]>([]);
  const selectedTextBoxIdRef = useRef<string | null>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const editModeRef = useRef<EditMode>("adjust");
  const [editMode, setEditMode] = useState<EditMode>("adjust");
  const [strokeCount, setStrokeCount] = useState(0);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);
  const [completedImageUrl, setCompletedImageUrl] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [savedAssetCode, setSavedAssetCode] = useState<string | null>(null);
  const [assetStatus, setAssetStatus] = useState("店舗フレームのURLを確認しています。");
  const [status, setStatus] = useState("Canvas加工を準備しています。");
  const [, refreshTextEditor] = useReducer((value: number) => value + 1, 0);

  function prepareCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    return true;
  }

  function renderCanvas(showSelection = true) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image) return;

    if (canvas.width !== CANVAS_WIDTH || canvas.height !== CANVAS_HEIGHT) {
      prepareCanvas();
    }

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPhotoLayer(context, image, transformRef.current);
    drawMosaicStrokes(context, image, transformRef.current, strokesRef.current);
    drawTextBoxes(context, image, transformRef.current, textBoxesRef.current, selectedTextBoxIdRef.current, showSelection);
    drawFixedFrame(context, store, frameImageRef.current);
  }

  function syncTextBoxes(nextTextBoxes: TextBox[], nextSelectedId = selectedTextBoxIdRef.current) {
    textBoxesRef.current = nextTextBoxes;
    selectedTextBoxIdRef.current = nextSelectedId;
    setTextBoxes(nextTextBoxes);
    setSelectedTextBoxId(nextSelectedId);
    setCompletedImageUrl(null);
    renderCanvas();
  }

  function switchMode(nextMode: EditMode) {
    editModeRef.current = nextMode;
    setEditMode(nextMode);
    setStatus(
      nextMode === "mosaic"
        ? "モザイクモードです。隠したい場所を指でなぞってください。"
        : nextMode === "text"
          ? "文字を選択中です。文字の上を指で動かせます。"
          : "写真調整モードです。写真だけを移動・拡大縮小・回転できます。"
    );
  }

  useEffect(() => {
    if (!prepareCanvas()) return;

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
      textBoxesRef.current = [];
      selectedTextBoxIdRef.current = null;
      activeStrokeIdRef.current = null;
      setStrokeCount(0);
      setTextBoxes([]);
      setSelectedTextBoxId(null);
      renderCanvas();
      setStatus("写真調整モードです。文字を入れる場合は文字を追加してください。");
    };

    image.onerror = () => {
      setStatus("画像の読み込みに失敗しました。");
    };

    image.src = photo.objectUrl;
  }, [photo.objectUrl]);

  useEffect(() => {
    if (completedImageUrl) return;
    if (!prepareCanvas()) return;
    renderCanvas();
  }, [completedImageUrl]);

  useEffect(() => {
    let isCancelled = false;
    frameImageRef.current = null;

    // TODO(logo-deprecation): logoUrl remains in DB for old data. Remove standalone logo fields/admin controls after all logos are embedded in frame images.
    async function loadStoreImages() {
      const frameImage = store?.frameUrl ? await loadCanvasImage(store.frameUrl) : null;

      if (isCancelled) return;

      frameImageRef.current = frameImage;

      const frameState = store?.frameUrl ? (frameImage ? "フレーム画像を読み込みました" : "フレームURLはありますが画像は読めませんでした") : "フレームURL未設定";
      setAssetStatus(`${frameState}。`);
      renderCanvas();
    }

    void loadStoreImages();

    return () => {
      isCancelled = true;
    };
  }, [store?.frameUrl]);

  useEffect(() => {
    if (!completedImageUrl) {
      renderCanvas();
    }
  }, [store, staff, completedImageUrl]);

  function createMosaicPoint(canvasPoint: CanvasPoint): MosaicPoint | null {
    const image = imageRef.current;
    if (!image) return null;

    const photoPoint = transformCanvasPointToPhoto(
      image,
      transformRef.current,
      canvasPoint
    );
    if (!photoPoint) return null;

    return {
      point: photoPoint,
      radius: getPhotoSpaceRadius(image, transformRef.current),
    };
  }

  function startMosaicStroke(canvasPoint: CanvasPoint) {
    const mosaicPoint = createMosaicPoint(canvasPoint);
    if (!mosaicPoint) return;

    const stroke: MosaicStroke = {
      id: createStrokeId(),
      points: [mosaicPoint],
    };
    strokesRef.current = [...strokesRef.current, stroke];
    activeStrokeIdRef.current = stroke.id;
    setStrokeCount(strokesRef.current.length);
    setCompletedImageUrl(null);
    renderCanvas();
  }

  function appendMosaicPoint(canvasPoint: CanvasPoint) {
    const activeStrokeId = activeStrokeIdRef.current;
    if (!activeStrokeId) return;

    const mosaicPoint = createMosaicPoint(canvasPoint);
    if (!mosaicPoint) return;

    const lastStroke = strokesRef.current.find((stroke) => stroke.id === activeStrokeId);
    const lastPoint = lastStroke?.points[lastStroke.points.length - 1];
    if (
      lastPoint &&
      Math.hypot(
        mosaicPoint.point.x - lastPoint.point.x,
        mosaicPoint.point.y - lastPoint.point.y
      ) < mosaicPoint.radius * 0.35
    ) {
      return;
    }

    strokesRef.current = strokesRef.current.map((stroke) =>
      stroke.id === activeStrokeId
        ? { ...stroke, points: [...stroke.points, mosaicPoint] }
        : stroke
    );
    renderCanvas();
  }

  function addTextBox() {
    const image = imageRef.current;
    if (!image) return;

    if (textBoxesRef.current.length >= MAX_TEXT_BOXES) {
      setStatus(`文字は最大${MAX_TEXT_BOXES}個までです。`);
      return;
    }

    const centerPoint = transformCanvasPointToPhoto(
      image,
      transformRef.current,
      { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 }
    ) ?? { x: image.naturalWidth / 2, y: image.naturalHeight / 2 };
    const textBox: TextBox = {
      id: createTextBoxId(),
      text: "",
      point: centerPoint,
      size: "medium",
      color: "#ffffff",
      rotation: 0,
    };
    switchMode("text");
    syncTextBoxes([...textBoxesRef.current, textBox], textBox.id);
    setStatus("文字を追加しました。15文字以内で入力し、文字の上を指で動かせます。");
  }

  function updateTextBox(id: string, nextValues: Partial<TextBox>) {
    const nextTextBoxes = textBoxesRef.current.map((textBox) =>
      textBox.id === id ? { ...textBox, ...nextValues } : textBox
    );
    syncTextBoxes(nextTextBoxes, id);
  }

  function deleteSelectedTextBox() {
    const selectedId = selectedTextBoxIdRef.current;
    if (!selectedId) return;
    syncTextBoxes(
      textBoxesRef.current.filter((textBox) => textBox.id !== selectedId),
      null
    );
    switchMode("adjust");
    setStatus("選択中の文字を削除しました。");
  }

  function clearSelectedTextBox() {
    selectedTextBoxIdRef.current = null;
    setSelectedTextBoxId(null);
    switchMode("adjust");
    renderCanvas();
    setStatus("文字の編集を閉じました。文字を動かす場合は、もう一度文字を指で触って動かしてください。");
  }

  function levelSelectedTextBox() {
    const selectedId = selectedTextBoxIdRef.current;
    if (!selectedId) return;
    updateTextBox(selectedId, { rotation: -transformRef.current.rotation });
    setStatus("選択中の文字を画面上で水平にしました。");
  }

  function startTextDrag(canvasPoint: CanvasPoint) {
    const context = canvasRef.current?.getContext("2d");
    const image = imageRef.current;
    if (!context || !image) return false;

    const hit = findTextBoxAtPoint(context, image, textBoxesRef.current, canvasPoint, transformRef.current);
    if (!hit) {
      return false;
    }

    selectedTextBoxIdRef.current = hit.textBox.id;
    setSelectedTextBoxId(hit.textBox.id);
    textDragRef.current = {
      id: hit.textBox.id,
      offset: {
        x: hit.photoPoint.x - hit.textBox.point.x,
        y: hit.photoPoint.y - hit.textBox.point.y,
      },
    };
    switchMode("text");
    renderCanvas();
    return true;
  }

  function startSelectedTextDrag(canvasPoint: CanvasPoint) {
    const image = imageRef.current;
    const selectedId = selectedTextBoxIdRef.current;
    const selected = textBoxesRef.current.find((textBox) => textBox.id === selectedId);
    if (!image || !selectedId || !selected) return false;

    const photoPoint = transformCanvasPointToPhoto(image, transformRef.current, canvasPoint);
    if (!photoPoint) return false;

    textDragRef.current = {
      id: selectedId,
      offset: {
        x: photoPoint.x - selected.point.x,
        y: photoPoint.y - selected.point.y,
      },
    };
    switchMode("text");
    renderCanvas();
    return true;
  }

  function moveTextBox(canvasPoint: CanvasPoint) {
    const drag = textDragRef.current;
    const image = imageRef.current;
    if (!drag || !image) return;

    const photoPoint = transformCanvasPointToPhoto(image, transformRef.current, canvasPoint);
    if (!photoPoint) return;

    const nextPoint = {
      x: Math.min(Math.max(photoPoint.x - drag.offset.x, 0), image.naturalWidth),
      y: Math.min(Math.max(photoPoint.y - drag.offset.y, 0), image.naturalHeight),
    };
    const nextTextBoxes = textBoxesRef.current.map((textBox) =>
      textBox.id === drag.id
        ? {
            ...textBox,
            point: nextPoint,
          }
        : textBox
    );
    textBoxesRef.current = nextTextBoxes;
    setTextBoxes(nextTextBoxes);
    setCompletedImageUrl(null);
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

    const canvasPoint = getTouchPoint(canvas, event.touches[0]);
    if (event.touches.length === 1 && startTextDrag(canvasPoint)) {
      return;
    }

    const geometry = getTouchGeometry(canvas, event.touches);
    gestureRef.current = {
      ...geometry,
      transform: { ...transformRef.current },
    };
    if (editModeRef.current !== "adjust") {
      switchMode("adjust");
    }
  }

  function handleTouchMove(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    if (editModeRef.current === "mosaic") {
      appendMosaicPoint(getTouchPoint(canvas, event.touches[0]));
      return;
    }

    if (editModeRef.current === "text" && textDragRef.current) {
      moveTextBox(getTouchPoint(canvas, event.touches[0]));
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
    refreshTextEditor();
    renderCanvas();
  }

  function handleTouchEnd(event: TouchEvent<HTMLCanvasElement>) {
    event.preventDefault();

    if (editModeRef.current === "mosaic") {
      activeStrokeIdRef.current = null;
      setStatus(`${strokesRef.current.length}か所のモザイクを追加しました。`);
      return;
    }

    if (textDragRef.current) {
      textDragRef.current = null;
      setStatus("文字の位置を調整しました。写真を動かすと文字も一緒に動きます。");
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

  function handleSelectedTextTouchStart(event: TouchEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest(".canvas-text-control-panel")) return;

    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0) return;

    event.stopPropagation();
    startSelectedTextDrag(getTouchPoint(canvas, event.touches[0]));
  }

  function handleSelectedTextTouchMove(event: TouchEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas || event.touches.length === 0 || !textDragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    moveTextBox(getTouchPoint(canvas, event.touches[0]));
  }

  function handleSelectedTextTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!textDragRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    textDragRef.current = null;
    setStatus("文字の位置を調整しました。選択中の文字は、もう一度触って動かせます。");
  }

  function resetTransform() {
    transformRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      scale: 1,
      rotation: 0,
    };
    setCompletedImageUrl(null);
    refreshTextEditor();
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
    renderCanvas(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const nextUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCompletedImageUrl(nextUrl);
      setPrintedAt(null);
      setHasConsent(false);
      setSavedAssetCode(null);
      setStatus("完成画像を作成しました。お客様に画面または印刷で確認し、SNS掲載OKをもらった場合だけ保存してください。");
    } catch {
      setCompletedImageUrl(null);
      setStatus("完成画像を作成できませんでした。フレーム画像の読み込み設定を確認してください。");
    }
  }

  function handlePrintFinalImage() {
    setPrintedAt(new Date().toISOString());
    setStatus("印刷画面を開きました。印刷後にお客様からSNS掲載OKをもらった場合だけ保存してください。");
    window.print();
  }

  async function saveFinalImage() {
    if (!completedImageUrl || !store || !staff) {
      setStatus("店舗または担当者を確認できないため保存できません。");
      return;
    }

    if (!hasConsent) {
      setStatus("お客様からSNS掲載OKをもらったことを確認してから保存してください。");
      return;
    }

    setIsSavingAsset(true);
    setStatus("完成画像をクラウドへ保存しています。");

    try {
      const response = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId: store.id,
          staffId: staff.id,
          finalImageDataUrl: completedImageUrl,
          frameUrl: store.frameUrl,
          printedAt,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        detail?: string;
        manageCode?: string;
      };

      if (!response.ok) {
        throw new Error([result.message, result.detail].filter(Boolean).join(" / "));
      }

      setSavedAssetCode(result.manageCode ?? "保存済み");
      setStatus(`保存しました。管理コード: ${result.manageCode ?? "確認中"}`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "完成画像を保存できませんでした。"
      );
    } finally {
      setIsSavingAsset(false);
    }
  }

  const selectedTextBox = textBoxes.find((textBox) => textBox.id === selectedTextBoxId);
  const selectedTextEditor = (() => {
    const image = imageRef.current;
    if (!image || !selectedTextBox) return null;

    const canvasPoint = getTextBoxCanvasPoint(image, transformRef.current, selectedTextBox);
    const fontSize = TEXT_FONT_SIZES[selectedTextBox.size];
    const textWidth = Math.max((selectedTextBox.text.length || 4) * fontSize * 0.72, 120);
    const widthPercent = Math.min(72, Math.max(24, (textWidth / CANVAS_WIDTH) * 100));
    const layerStyle: CSSProperties = {
      left: `${(canvasPoint.x / CANVAS_WIDTH) * 100}%`,
      top: `${(canvasPoint.y / CANVAS_HEIGHT) * 100}%`,
    };
    const inputStyle: CSSProperties = {
      width: `${widthPercent}vw`,
      maxWidth: `${widthPercent}%`,
      color: selectedTextBox.color,
      fontSize: `clamp(16px, ${fontSize / 16}vw, ${Math.round(fontSize * 0.72)}px)`,
      transform: `translateY(-100%) rotate(${getTextBoxCanvasRotation(transformRef.current, selectedTextBox)}rad)`,
    };

    return {
      layerStyle,
      inputStyle,
    };
  })();

  if (completedImageUrl) {
    return (
      <section className="final-screen" aria-label="完成画像確認">
        <div className="section-heading compact-section-heading">
          <p className="eyebrow">Final Image</p>
          <h2>完成画像確認</h2>
          <p>お客様に画面または印刷で確認し、SNS掲載OKをもらった場合だけ保存します。</p>
        </div>

        <div className="final-image-panel final-image-screen-panel">
          <img className="print-final-image" src={completedImageUrl} alt="完成画像" />
        </div>

        <div className="toolbar">
          <button
            className="action-button primary-wide"
            type="button"
            onClick={handlePrintFinalImage}
          >
            印刷
          </button>
          <label className="field-label compact-summary">
            <input
              type="checkbox"
              checked={hasConsent}
              disabled={Boolean(savedAssetCode)}
              onChange={(event) => setHasConsent(event.target.checked)}
            />
            お客様からSNS掲載OKをもらいました
          </label>
          <button
            className="action-button primary-wide"
            type="button"
            onClick={saveFinalImage}
            disabled={isSavingAsset || Boolean(savedAssetCode) || !store || !staff || !hasConsent}
          >
            {isSavingAsset
              ? "保存中"
              : savedAssetCode
                ? "保存済み"
                : "SNS掲載OKを確認したので保存"}
          </button>
          {savedAssetCode && onStartNext && (
            <button className="action-button primary-wide" type="button" onClick={onStartNext}>
              次のわんちゃんを撮る
            </button>
          )}
          {savedAssetCode && onFinishSession && (
            <button className="action-button secondary" type="button" onClick={onFinishSession}>
              撮影を終了する
            </button>
          )}
          <button className="action-button secondary" type="button" onClick={() => setCompletedImageUrl(null)} disabled={Boolean(savedAssetCode)}>
            編集へ戻る
          </button>
          {onBackToPhotos && (
            <button className="action-button secondary" type="button" onClick={onBackToPhotos} disabled={Boolean(savedAssetCode)}>
              写真選択へ戻る
            </button>
          )}
          {!savedAssetCode && (
            <button className="action-button secondary" type="button" onClick={onCancel}>
              キャンセル
            </button>
          )}
          {onLogout && (
            <button className="action-button secondary" type="button" onClick={onLogout}>
              ログアウト
            </button>
          )}
        </div>

        <p className="notice">
          {savedAssetCode
            ? `クラウドへ保存済みです。管理コード: ${savedAssetCode}`
            : printedAt
              ? "印刷済みです。SNS掲載OKをもらった場合だけチェックして保存してください。"
              : "画面でお客様に確認し、SNS掲載OKをもらった場合だけチェックして保存してください。印刷は必要に応じて行えます。"}
        </p>
        <p className="notice">{status}</p>
      </section>
    );
  }

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      <div className="section-heading compact-section-heading">
        <p className="eyebrow">Canvas Preview</p>
        <h2>画像加工プレビュー</h2>
        <p>写真位置を調整し、必要な場所だけモザイクや文字を追加できます。</p>
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
        {selectedTextBox && selectedTextEditor && (
          <div
            className="canvas-text-editor"
            style={selectedTextEditor.layerStyle}
            onTouchStart={handleSelectedTextTouchStart}
            onTouchMove={handleSelectedTextTouchMove}
            onTouchEnd={handleSelectedTextTouchEnd}
            onTouchCancel={handleSelectedTextTouchEnd}
          >
            <input
              className="canvas-text-input"
              type="text"
              value={selectedTextBox.text}
              maxLength={MAX_TEXT_LENGTH}
              autoComplete="off"
              autoFocus
              placeholder="文字"
              style={selectedTextEditor.inputStyle}
              onChange={(event) =>
                updateTextBox(selectedTextBox.id, {
                  text: event.target.value.slice(0, MAX_TEXT_LENGTH),
                })
              }
            />

            <div className="canvas-text-control-panel" aria-label="選択中の文字編集">
              <div className="canvas-text-control-row">
                <button className="mini-control-button" type="button" onClick={levelSelectedTextBox}>
                  水平
                </button>
                {Object.entries(TEXT_SIZE_LABELS).map(([size, label]) => (
                  <button
                    className={`mini-control-button ${selectedTextBox.size === size ? "is-selected" : ""}`}
                    key={size}
                    type="button"
                    onClick={() => updateTextBox(selectedTextBox.id, { size: size as TextBoxSize })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="canvas-text-color-row" aria-label="文字色">
                {TEXT_COLORS.map((color) => (
                  <button
                    className={`mini-color-button ${selectedTextBox.color === color.value ? "is-selected" : ""}`}
                    key={color.value}
                    type="button"
                    style={{ backgroundColor: color.value }}
                    onClick={() => updateTextBox(selectedTextBox.id, { color: color.value })}
                    aria-label={`${color.label}にする`}
                  />
                ))}
                <button className="mini-control-button danger" type="button" onClick={deleteSelectedTextBox}>
                  削除
                </button>
                <button className="mini-control-button" type="button" onClick={clearSelectedTextBox}>
                  閉じる
                </button>
              </div>

              <p className="text-count">あと{MAX_TEXT_LENGTH - selectedTextBox.text.length}文字</p>
            </div>
          </div>
        )}
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
        <button className="action-button secondary" type="button" onClick={addTextBox} disabled={textBoxes.length >= MAX_TEXT_BOXES}>
          文字を追加
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
        {onBackToPhotos && (
          <button className="action-button secondary" type="button" onClick={onBackToPhotos}>
            写真選択へ戻る
          </button>
        )}
        <button className="action-button secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
        {onLogout && (
          <button className="action-button secondary" type="button" onClick={onLogout}>
            ログアウト
          </button>
        )}
      </div>

      <p className="notice">{assetStatus}</p>
      <p className="notice">{status}</p>
    </section>
  );
}
