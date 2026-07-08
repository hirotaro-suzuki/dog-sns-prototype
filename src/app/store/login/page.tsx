import { StoreLoginForm } from "@/components/StoreLoginForm";

export default function StoreLoginPage() {
  return (
    <main className="app-shell store-app-shell">
      <section className="workspace narrow-workspace">
        <div className="page-heading">
          <p className="eyebrow">Store</p>
          <h1>今日のわんちゃん</h1>
          <p>店舗コードとPINでログインします。</p>
        </div>
        <StoreLoginForm />
      </section>
    </main>
  );
}
