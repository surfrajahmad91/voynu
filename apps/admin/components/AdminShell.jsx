"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNotificationBell from "./AdminNotificationBell";

const nav = [
  ["/admin", "Overview"],
  ["/admin/bookings", "Bookings"],
  ["/admin/dispatch", "Dispatch"],
  ["/admin/trip-monitor", "Live trips"],
  ["/admin/drivers", "Drivers"],
  ["/admin/vehicles", "Fleet"],
  ["/admin/vehicle-categories", "Vehicle types"],
  ["/admin/rentals", "Rentals"],
  ["/admin/pricing", "Pricing"],
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login" || pathname === "/forgot-password" || pathname === "/reset-password";
  if (isLogin) return children;
  return <><header className="adminShellHeader"><div className="adminShellInner"><Link href="/admin" className="adminBrand" aria-label="VOYNU Admin home"><img src="/icon.svg" alt="VOYNU" width="42" height="42" /><span><strong>VOYNU</strong><small>ADMIN CONTROL CENTRE</small></span></Link><div className="adminHeaderActions"><AdminNotificationBell /><Link href="/admin/configuration" className="adminSettingsLink">Configuration</Link></div></div><nav className="adminShellNav" aria-label="Admin navigation"><div className="adminShellNavInner">{nav.map(([href,label])=>{const active=href==="/admin"?pathname===href:pathname?.startsWith(href);return <Link key={href} href={href} className={`adminNavLink${active?" active":""}`}>{label}</Link>;})}</div></nav></header><div className="adminShellContent">{children}</div></>;
}
