export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function loadFaceDetectionModels() {
  const faceapi = await import("face-api.js");
  await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
  return faceapi;
}

export async function detectFaces(image: HTMLImageElement): Promise<FaceBox[]> {
  const faceapi = await loadFaceDetectionModels();
  const detections = await faceapi.detectAllFaces(
    image,
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    })
  );

  return detections.map((detection) => {
    const { x, y, width, height } = detection.box;
    return { x, y, width, height };
  });
}
