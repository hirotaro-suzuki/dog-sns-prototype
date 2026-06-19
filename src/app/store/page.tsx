import { StoreHome } from "@/components/StoreHome";

export default function StorePage() {
  return (
    <main className="app-shell store-app-shell">
      <section className="workspace store-workspace">
        <StoreHome />
      </section>
    </main>
  );
}
