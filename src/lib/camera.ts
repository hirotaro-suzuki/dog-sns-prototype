export type CameraStreamOptions = {
  facingMode?: "user" | "environment";
};

export async function requestCameraStream({
  facingMode = "environment",
}: CameraStreamOptions = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("このブラウザではカメラ機能を利用できません。");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
    audio: false,
  });
}

export function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
