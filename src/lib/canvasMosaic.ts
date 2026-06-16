import type { FaceBox } from "./faceDetection";

export function drawMosaicOverlay(
  context: CanvasRenderingContext2D,
  boxes: FaceBox[]
) {
  boxes.forEach((box) => {
    context.save();
    context.fillStyle = "rgba(23, 111, 98, 0.48)";
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = "rgba(255, 255, 255, 0.92)";
    context.lineWidth = 3;
    context.strokeRect(box.x, box.y, box.width, box.height);
    context.restore();
  });
}
