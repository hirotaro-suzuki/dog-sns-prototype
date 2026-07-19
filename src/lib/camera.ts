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
      // 完成画像(1080×1080)へ「縮小」で入るよう高解像度を希望する。1280×960では
      // 正方形切り出し(960)を引き伸ばすことになり、ピンボケ状に写る（2026-07-19実機報告）。
      // idealは希望値なので、出せない機種では自動的に最大解像度へ丸められる。
      width: { ideal: 2560 },
      height: { ideal: 1920 },
    },
    audio: false,
  });
}

export function stopCameraStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
