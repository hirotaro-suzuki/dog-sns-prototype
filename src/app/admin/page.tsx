import { AdminMaintenance } from "@/components/AdminMaintenance";

export default function AdminPage() {
  return (
    <main className="app-shell">
      <section className="workspace admin-workspace">
        <AdminMaintenance />
      </section>
    </main>
  );
}
