import Link from "next/link";
import { AdminMaintenance } from "@/components/AdminMaintenance";

export default function AdminPage() {
  return (
    <main className="app-shell">
      <section className="workspace admin-workspace">
        <div className="admin-filter-panel">
          <p className="eyebrow">枠登録をする場合</p>
          <h2>かんたん枠登録</h2>
          <p>枠名と画像を選んで、1回のボタンで登録できます。</p>
          <Link className="action-button" href="/admin/frames">
            枠登録画面を開く
          </Link>
        </div>
        <AdminMaintenance />
      </section>
    </main>
  );
}
