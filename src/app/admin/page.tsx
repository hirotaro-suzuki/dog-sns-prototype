import { AdminMaintenance } from "@/components/AdminMaintenance";
import { AdminLogoutButton } from "@/components/AdminLogoutButton";
import styles from "./admin-page.module.css";

export default function AdminPage() {
  return (
    <main className="app-shell">
      <section className={`workspace admin-workspace ${styles.adminPage}`}>
        <div className={styles.logoutRow}>
          <AdminLogoutButton />
        </div>
        <AdminMaintenance />
      </section>
    </main>
  );
}
