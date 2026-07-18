"use client";

import type { CSSProperties, ReactNode, TouchEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import type { CaptureStaff, CaptureStore } from "@/types/captureContext";

type MosaicCanvasProps = {
  photo: CapturedPhoto;
  store?: CaptureStore;
  staff?: CaptureStaff;
  // 完成画像は選択済みの枠で焼き付け済みのため、枠選択バーは編集画面でだけ表示する。
  frameChooser?: ReactNode;
  onCancel: () => void;
  onBackToPhotos?: () => void;
  onStartNext?: () => void;
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

type EditSnapshot = {
  transform: PhotoTransform;
  strokes: MosaicStroke[];
  textBoxes: TextBox[];
  selectedTextBoxId: string | null;
};

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
const TEXT_SIZE_ICON_PX: Record<TextBoxSize, number> = {
  small: 14,
  medium: 18,
  large: 22,
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

// 再描画は指の動きに合わせて毎秒何十回も走るため、縮小用の作業キャンバスは1枚を使い回す。
let mosaicSampleBuffer: HTMLCanvasElement | null = null;

function getMosaicSampleBuffer() {
  if (!mosaicSampleBuffer) {
    mosaicSampleBuffer = document.createElement("canvas");
    mosaicSampleBuffer.width = MOSAIC_SAMPLE_SIZE;
    mosaicSampleBuffer.height = MOSAIC_SAMPLE_SIZE;
  }
  return mosaicSampleBuffer;
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

  const buffer = getMosaicSampleBuffer();
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
  frameChooser,
  onCancel,
  onBackToPhotos,
  onStartNext,
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
  const hasPushedGestureHistoryRef = useRef(false);
  const textDragRef = useRef<TextDragSnapshot | null>(null);
  const strokesRef = useRef<MosaicStroke[]>([]);
  const textBoxesRef = useRef<TextBox[]>([]);
  const selectedTextBoxIdRef = useRef<string | null>(null);
  const activeStrokeIdRef = useRef<string | null>(null);
  const editModeRef = useRef<EditMode>("adjust");
  const historyRef = useRef<EditSnapshot[]>([]);
  const [editMode, setEditMode] = useState<EditMode>("adjust");
  const [historyCount, setHistoryCount] = useState(0);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);
  const [completedImageUrl, setCompletedImageUrl] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string | null>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [shortCaption, setShortCaption] = useState("");
  const [isSavingAsset, setIsSavingAsset] = useState(false);
  const [savedAssetCode, setSavedAssetCode] = useState<string | null>(null);
  const [frameLoadError, setFrameLoadError] = useState("");
  const [editError, setEditError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [, refreshTextEditor] = useReducer((value: number) => value + 1, 0);

  function pushHistory() {
    historyRef.current.push({
      transform: { ...transformRef.current },
      strokes: strokesRef.current,
      textBoxes: textBoxesRef.current,
      selectedTextBoxId: selectedTextBoxIdRef.current,
    });
    setHistoryCount(historyRef.current.length);
  }

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) return;

    transformRef.current = previous.transform;
    strokesRef.current = previous.strokes;
    textBoxesRef.current = previous.textBoxes;
    selectedTextBoxIdRef.current = previous.selectedTextBoxId;
    setTextBoxes(previous.textBoxes);
    setSelectedTextBoxId(previous.selectedTextBoxId);
    setHistoryCount(historyRef.current.length);
    setCompletedImageUrl(null);
    refreshTextEditor();
    renderCanvas();
  }

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
      historyRef.current = [];
      setHistoryCount(0);
      setTextBoxes([]);
      setSelectedTextBoxId(null);
      renderCanvas();
      setEditError("");
    };

    image.onerror = () => {
      setEditError("画像の読み込みに失敗しました。");
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

      setFrameLoadError(
        store?.frameUrl && !frameImage ? "店舗フレーム画像を読み込めませんでした。本部の管理画面で確認してください。" : ""
      );
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

    pushHistory();
    const stroke: MosaicStroke = {
      id: createStrokeId(),
      points: [mosaicPoint],
    };
    strokesRef.current = [...strokesRef.current, stroke];
    activeStrokeIdRef.current = stroke.id;
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
      setEditError(`文字は最大${MAX_TEXT_BOXES}個までです。`);
      return;
    }

    pushHistory();
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
    setEditError("");
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
    pushHistory();
    syncTextBoxes(
      textBoxesRef.current.filter((textBox) => textBox.id !== selectedId),
      null
    );
    switchMode("adjust");
  }

  function clearSelectedTextBox() {
    selectedTextBoxIdRef.current = null;
    setSelectedTextBoxId(null);
    switchMode("adjust");
    renderCanvas();
  }

  function levelSelectedTextBox() {
    const selectedId = selectedTextBoxIdRef.current;
    if (!selectedId) return;
    pushHistory();
    updateTextBox(selectedId, { rotation: -transformRef.current.rotation });
  }

  function startTextDrag(canvasPoint: CanvasPoint) {
    const context = canvasRef.current?.getContext("2d");
    const image = imageRef.current;
    if (!context || !image) return false;

    const hit = findTextBoxAtPoint(context, image, textBoxesRef.current, canvasPoint, transformRef.current);
    if (!hit) {
      return false;
    }

    pushHistory();
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

    pushHistory();
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

    // 文字以外の場所を触ったら選択を解除し、編集パネルを閉じる（一般的なスマホ操作に合わせる）。
    if (selectedTextBoxIdRef.current) {
      clearSelectedTextBox();
    }

    const geometry = getTouchGeometry(canvas, event.touches);
    gestureRef.current = {
      ...geometry,
      transform: { ...transformRef.current },
    };
    hasPushedGestureHistoryRef.current = false;
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

    if (!hasPushedGestureHistoryRef.current) {
      pushHistory();
      hasPushedGestureHistoryRef.current = true;
    }

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
      return;
    }

    if (textDragRef.current) {
      textDragRef.current = null;
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
  }

  function resetTransform() {
    pushHistory();
    transformRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      scale: 1,
      rotation: 0,
    };
    setCompletedImageUrl(null);
    refreshTextEditor();
    renderCanvas();
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
      setShortCaption("");
      setSavedAssetCode(null);
    } catch {
      setCompletedImageUrl(null);
      setEditError("完成画像を作成できませんでした。フレーム画像の読み込み設定を確認してください。");
    }
  }

  function handlePrintFinalImage() {
    setPrintedAt(new Date().toISOString());
    window.print();
  }

  function handleCancelSession() {
    if (!window.confirm("撮影した写真をすべて消して、撮影からやり直します。よろしいですか？")) return;
    onCancel();
  }

  async function saveFinalImage() {
    if (!completedImageUrl || !store || !staff || !hasConsent) return;

    setIsSavingAsset(true);
    setSaveError("");

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
          shortCaption,
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
    } catch (error) {
      setSaveError(
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
        <div className="toolbar utility-toolbar">
          <button
            className="icon-button"
            type="button"
            onClick={() => setCompletedImageUrl(null)}
            disabled={Boolean(savedAssetCode)}
            aria-label="編集へ戻る"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {!savedAssetCode && (
            <button className="icon-button" type="button" onClick={handleCancelSession} aria-label="キャンセル">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {onLogout && (
            <button className="icon-button" type="button" onClick={onLogout} aria-label="ログアウト">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="final-image-wrap">
          <img className="print-final-image" src={completedImageUrl} alt="完成画像" />
        </div>

        {!savedAssetCode ? (
          <div className="final-action-area">
            <label className="field-label consent-label">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(event) => setHasConsent(event.target.checked)}
              />
              お客様からSNS掲載OKをもらいました
            </label>
            <input
              className="short-caption-input"
              type="text"
              value={shortCaption}
              maxLength={40}
              placeholder="一言メモ（任意）"
              onChange={(event) => setShortCaption(event.target.value.slice(0, 40))}
            />
            <div className="toolbar">
              <button className="icon-button large" type="button" onClick={handlePrintFinalImage} aria-label="印刷">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9V4h12v5" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="4" y="9" width="16" height="8" rx="1.5" />
                  <path d="M8 14h8v6H8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                className="icon-button large primary"
                type="button"
                onClick={saveFinalImage}
                disabled={isSavingAsset || !store || !staff || !hasConsent}
                aria-label={isSavingAsset ? "保存中" : "保存"}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 18a4 4 0 01-1-7.87A5 5 0 0116 7a4.5 4.5 0 011 8.9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 12v7m0-7l-3 3m3-3l3 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="final-action-area">
            <span className="status-pill">保存済み: {savedAssetCode}</span>
            {onStartNext && (
              <button className="action-button primary-wide" type="button" onClick={onStartNext}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
                次のわんちゃんを撮る
              </button>
            )}
          </div>
        )}

        {saveError && <p className="notice error">{saveError}</p>}
      </section>
    );
  }

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      {frameChooser}
      <div className="toolbar utility-toolbar">
        {onBackToPhotos && (
          <button className="icon-button" type="button" onClick={onBackToPhotos} aria-label="写真選択へ戻る">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button className="icon-button" type="button" onClick={handleCancelSession} aria-label="キャンセル">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {onLogout && (
          <button className="icon-button" type="button" onClick={onLogout} aria-label="ログアウト">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
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
                <button className="mini-control-button" type="button" onClick={levelSelectedTextBox} aria-label="水平にする">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {Object.entries(TEXT_SIZE_ICON_PX).map(([size, px]) => (
                  <button
                    className={`mini-control-button ${selectedTextBox.size === size ? "is-selected" : ""}`}
                    key={size}
                    type="button"
                    style={{ fontSize: px }}
                    onClick={() => {
                      pushHistory();
                      updateTextBox(selectedTextBox.id, { size: size as TextBoxSize });
                    }}
                    aria-label={`文字サイズ ${TEXT_SIZE_LABELS[size as TextBoxSize]}`}
                  >
                    A
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
                    onClick={() => {
                      pushHistory();
                      updateTextBox(selectedTextBox.id, { color: color.value });
                    }}
                    aria-label={`${color.label}にする`}
                  />
                ))}
                <button className="mini-control-button danger" type="button" onClick={deleteSelectedTextBox} aria-label="削除">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M9 7V4h6v3m-9 0 1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="mini-control-button" type="button" onClick={clearSelectedTextBox} aria-label="閉じる">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <p className="text-count">あと{MAX_TEXT_LENGTH - selectedTextBox.text.length}文字</p>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar">
        <button
          className={`icon-button ${editMode === "adjust" ? "is-selected" : ""}`}
          type="button"
          onClick={() => switchMode("adjust")}
          aria-label="写真を調整"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="5 9 2 12 5 15" />
            <polyline points="9 5 12 2 15 5" />
            <polyline points="15 19 12 22 9 19" />
            <polyline points="19 9 22 12 19 15" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="12" y1="2" x2="12" y2="22" />
          </svg>
        </button>
        <button
          className={`icon-button ${editMode === "mosaic" ? "is-selected" : ""}`}
          type="button"
          onClick={() => switchMode("mosaic")}
          aria-label="モザイク"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              d="M3 15c1.5-3 2.5-5 4-5s1 4 2.5 4 1.5-6 3-6 1.5 5 3 5 2-3 3-4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="icon-button" type="button" onClick={addTextBox} disabled={textBoxes.length >= MAX_TEXT_BOXES} aria-label="文字を追加">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <text x="12" y="18" textAnchor="middle" fontSize="18" fontWeight="800">T</text>
          </svg>
        </button>
        <button className="icon-button" type="button" onClick={undo} disabled={historyCount === 0} aria-label="ひとつ戻す">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 14 4 9 9 4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="icon-button" type="button" onClick={resetTransform} aria-label="写真位置をリセット">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="confirm-row">
        <button className="photo-preview-action confirm" type="button" onClick={finalizeImage} aria-label="確定して完成画像にする">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M4 12l6 6L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {frameLoadError && <p className="notice error">{frameLoadError}</p>}
      {editError && <p className="notice error">{editError}</p>}
    </section>
  );
}
