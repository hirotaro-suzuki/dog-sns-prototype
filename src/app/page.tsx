import { CameraCapture } from "@/components/CameraCapture";

export default function Home() {
  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="page-heading">
          <p className="eyebrow">Phase 0</p>
          <h1>カメラ撮影と一時保持</h1>
          <p>
            外部DBには送信せず、ブラウザのメモリ内だけで最大3枚の写真を一時保持します。
          </p>
        </div>
        <CameraCapture />
      </section>
    </main>
  );
}
