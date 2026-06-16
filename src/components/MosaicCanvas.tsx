"use client";

import { useEffect, useRef, useState } from "react";
import type { CapturedPhoto } from "@/lib/imageStore";
import { phaseZeroStore } from "@/config/stores";
import type { DogInfo } from "@/types/dog";

type MosaicCanvasProps = {
  photo: CapturedPhoto;
  dogInfo: DogInfo;
  onCancel: () => void;
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

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  const sourceWidth = imageRatio > canvasRatio ? image.naturalHeight * canvasRatio : image.naturalWidth;
  const sourceHeight = imageRatio > canvasRatio ? image.naturalHeight : image.naturalWidth / canvasRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height
  );
}

export function MosaicCanvas({ photo, dogInfo, onCancel }: MosaicCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState("Canvas加工を準備しています。");

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawCoverImage(context, image, CANVAS_WIDTH, CANVAS_HEIGHT);

      context.fillStyle = "rgba(0, 0, 0, 0.34)";
      context.fillRect(0, 0, CANVAS_WIDTH, 120);
      context.fillRect(0, CANVAS_HEIGHT - 150, CANVAS_WIDTH, 150);

      context.strokeStyle = "rgba(255, 255, 255, 0.9)";
      context.lineWidth = 10;
      context.strokeRect(32, 32, CANVAS_WIDTH - 64, CANVAS_HEIGHT - 64);

      context.fillStyle = "#ffffff";
      context.textBaseline = "middle";
      context.font = "700 52px Arial, sans-serif";
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

      setStatus("日付と仮店舗ロゴをCanvasで合成しました。顔モザイクは次の段階で追加します。");
    };

    image.onerror = () => {
      setStatus("画像の読み込みに失敗しました。");
    };

    image.src = photo.objectUrl;
  }, [dogInfo, photo.objectUrl]);

  return (
    <section className="canvas-panel" aria-label="画像加工プレビュー">
      <div className="section-heading">
        <p className="eyebrow">Canvas Preview</p>
        <h2>画像加工プレビュー</h2>
        <p>選択画像に本日の日付と仮店舗ロゴを合成しています。まだクラウドには送信していません。</p>
      </div>

      <div className="canvas-frame">
        <canvas ref={canvasRef} aria-label="加工済み画像プレビュー" />
      </div>

      <div className="toolbar">
        <button className="action-button secondary" type="button" onClick={onCancel}>
          キャンセル
        </button>
        <span className="status-pill">加工プレビュー</span>
      </div>

      <p className="notice">{status}</p>
    </section>
  );
}
