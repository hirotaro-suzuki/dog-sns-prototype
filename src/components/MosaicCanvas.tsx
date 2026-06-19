"use client";

import { TouchEvent, useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import { phaseZeroStore } from "@/config/stores";
import type { CaptureStaff, CaptureStore } from "@/types/captureContext";
import type { DogInfo } from "@/types/dog";

type MosaicCanvasProps = {
  photo: CapturedPhoto;
  dogInfo: DogInfo;
  store?: CaptureStore;
  staff?: CaptureStaff;
  onCancel: () => void;
  onBackToPhotos?: () => void;
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

type EditMode = "adjust" | "mosaic";

const CANVAS_WIDTH = 1270;
const CANVAS_HEIGHT = 890;
const MOSAIC_RADIUS = 52;
const MOSAIC_SAMPLE_SIZE = 12;
const FALLBACK_THEME_COLOR = "#176f62";

function createStrokeId() {
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

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

function getStoreDisplayName(store?: CaptureStore) {
  return store?.displayName ?? phaseZeroStore.displayName;
}

function getLogoLabel(store?: CaptureStore) {
  return store?.storeName ?? "DEMO STORE LOGO";
}

function getStoreThemeColor(store?: CaptureStore) {
  return store?.themeColor ?? FALLBACK_THEME_COLOR;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : FALLBACK_THEME_COLOR;
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, x + maxWidth - width, y + (maxHeight - height) / 2, width, height);
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

function drawFixedFrame(
  context: CanvasRenderingContext2D,
  dogInfo: DogInfo,
  store?: CaptureStore,
  staff?: CaptureStaff,
  logoImage?: HTMLImageElement | null,
  frameImage?: HTMLImageElement | null
) {
  const themeColor = getStoreThemeColor(store);

  if (frameImage) {
    context.drawImage(frameImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  context.fillStyle = hexToRgba(themeColor, 0.78);
  context.fillRect(0, 0, CANVAS_WIDTH, 120);
  context.fillRect(0, CANVAS_HEIGHT - 150, CANVAS_WIDTH, 150);

  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 10;
  context.strokeRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

  context.strokeStyle = themeColor;
  context.lineWidth = 6;
  context.strokeRect(44, 44, CANVAS_WIDTH - 88, CANVAS_HEIGHT - 88);

  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.font = "700 52px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText(getStoreDisplayName(store), 56, 70);

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

  if (logoImage) {
    drawContainedImage(context, logoImage, CANVAS_WIDTH - 516, CANVAS_HEIGHT - 138, 460, 96);
  } else {
    context.textAlign = "right";
    context.font = "700 42px Arial, sans-serif";
    context.fillText(getLogoLabel(store), CANVAS_WIDTH - 56, CANVAS_HEIGHT - 64);
  }

  if (staff) {
    context.textAlign = "right";
    context.font = "500 24px Arial, sans-serif";
    context.fillText(`担当: ${staff.displayName}`, CANVAS_WIDTH - 56, CANVAS_HEIGHT - 24);
  }
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

export function MosaicCanvas({
  photo,
  dogInfo,
  store,
  staff,
  onCancel,
  onBackToPhotos,
  onLogout,
}: MosaicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const frameImageRef = useRef<HTMLImageElement | null>(null);
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
  const [assetStatus, setAssetStatus] = useState("店舗ロゴ・フレームのURLを確認しています。");
  const [status, setStatus] = useState("Canvas加工を準備しています。");

  function renderCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image) return;

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawPhotoLayer(context, image, transformRef.current);
    drawMosaicStrokes(context, image, transformRef.current, strokesRef.current);
    drawFixedFrame(
      context,
      dogInfo,
      store,
      staff,
      logoImageRef.current,
      frameImageRef.current
    );
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
    let isCancelled = false;
    logoImageRef.current = null;
    frameImageRef.current = null;

    async function loadStoreImages() {
      const [logoImage, frameImage] = await Promise.all([
        store?.logoUrl ? loadCanvasImage(store.logoUrl) : Promise.resolve(null),
        store?.frameUrl ? loadCanvasImage(store.frameUrl) : Promise.resolve(null),
      ]);

      if (isCancelled) return;

      logoImageRef.current = logoImage;
      frameImageRef.current = frameImage;

      const logoState = store?.logoUrl ? (logoImage ? "ロゴ画像を読み込みました" : "ロゴURLはありますが画像は読めませんでした") : "ロゴURL未設定";
      const frameState = store?.frameUrl ? (frameImage ? "フレーム画像を読み込みました" : "フレームURLはありますが画像は読めませんでした") : "フレームURL未設定";
      setAssetStatus(`${logoState}。${frameState}。`);
      renderCanvas();
    }

    void loadStoreImages();

    return () => {
      isCancelled = true;
    };
  }, [store?.logoUrl, store?.frameUrl]);

  useEffect(() => {
    renderCanvas();
  }, [dogInfo, store, staff]);

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

    try {
      const nextUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCompletedImageUrl(nextUrl);
      setStatus("完成画像を作成しました。次の段階ではこの画像を印刷・保存に使います。");
    } catch {
      setCompletedImageUrl(null);
      setStatus("完成画像を作成できませんでした。ロゴまたはフレーム画像の読み込み設定を確認してください。");
    }
  }

  if (completedImageUrl) {
    return (
      <section className="final-screen" aria-label="完成画像確認">
        <div className="section-heading">
          <p className="eyebrow">Final Image</p>
          <h2>完成画像確認</h2>
          <p>この画像を確認してから、印刷や保存の流れへ進みます。</p>
        </div>

        <div className="final-image-panel final-image-screen-panel">
          <img src={completedImageUrl} alt="完成画像" />
        </div>

        <div className="toolbar">
          <button
            className="action-button primary-wide"
            type="button"
            onClick={() => window.print()}
          >
            印刷
          </button>
          <button className="action-button secondary" type="button" onClick={() => setCompletedImageUrl(null)}>
            編集へ戻る
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

        <p className="notice">完成画像はまだクラウドへ保存していません。</p>
      </section>
    );
  }

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      <div className="section-heading">
        <p className="eyebrow">Canvas Preview</p>
        <h2>画像加工プレビュー</h2>
        <p>写真位置を調整し、必要な場所だけ手動でモザイクを追加できます。</p>
      </div>

      <StoreSettingsSummary store={store} staff={staff} />

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
