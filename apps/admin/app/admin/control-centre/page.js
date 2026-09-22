"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme } from "../../../../../shared/lib/theme";

// Control Centre duplicated Configuration almost line for line — same four metrics
// (categories / customer-visible / fleet vehicles / active fleet) and the same set of
// area tiles, and nothing in the app linked here except Configuration's own header link.
// Rather than maintain two "admin home for settings" pages, this now forwards to the
// one that's actually current, so any bookmark or typed URL to /admin/control-centre
// still lands somewhere real instead of 404ing.
export default function ControlCentreRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/configuration"); }, [router]);
  return <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", background: theme.colors.bg, color: theme.colors.textFaint, fontFamily: theme.fontFamily, fontSize: 13 }}>Redirecting to Configuration…</main>;
}
