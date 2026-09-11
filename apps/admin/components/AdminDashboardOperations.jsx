"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminDashboardOperations() {
  const pathname = usePathname();
  if (pathname !== "/admin") return null;

  return (
    <section style={{ maxWidth: 1200, margin: "18px auto 40px", padding: "0 14px" }}>
      <div style={{ background: "#fff", border: "1px solid #d9e0dc", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(22,36,29,.04)" }}>
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #e7ece9" }}>
          <div>
            <strong style={{ fontSize: 14, color: "#16241d" }}>OPERATIONS · TRIP MONITOR</strong>
            <div style={{ marginTop: 4, color: "#68766f", fontSize: 11, lineHeight: 1.4 }}>
              Scheduled starts, actual starts, late trips and overdue alerts are monitored here.
            </div>
          </div>
          <Link href="/admin/trip-monitor" style={{ padding: "8px 12px", borderRadius: 7, background: "#00456B", color: "#fff", textDecoration: "none", fontSize: 10.5, fontWeight: 800 }}>
            OPEN FULL MONITOR
          </Link>
        </div>
        <div style={{ padding: 10, background: "#f4f6f5" }}>
          <iframe
            title="VOYNU Trip Monitor"
            src="/admin/trip-monitor"
            style={{ display: "block", width: "100%", height: 620, border: 0, borderRadius: 8, background: "#f4f6f5" }}
          />
        </div>
      </div>
    </section>
  );
}
