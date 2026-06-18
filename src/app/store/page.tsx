import { StoreHome } from "@/components/StoreHome";

export default function StorePage() {
  return (
    <main className="app-shell">
      <section className="workspace narrow-workspace">
        <div className="page-heading">
          <p className="eyebrow">Store</p>
          <h1>店舗ホーム</h1>
          <p>ログイン中の店舗と担当者を確認します。</p>
        </div>
        <StoreHome />
      </section>
    </main>
  );
}
