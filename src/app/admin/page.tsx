import { AdminMaintenance } from "@/components/AdminMaintenance";
import styles from "./admin-page.module.css";

export default function AdminPage() {
  return (
    <main className="app-shell">
      <section className={`workspace admin-workspace ${styles.adminPage}`}>
        <AdminMaintenance />
      </section>
    </main>
  );
}
