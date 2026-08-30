"use client";

import { usePathname } from "next/navigation";

import NotificationBell from "./NotificationBell";

export default function RoleNotificationBell() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return (
      <div
        style={{
          position: "fixed",
          top: 7,
          right: 105,
          zIndex: 90,
        }}
      >
        <NotificationBell targetPath="/admin" />
      </div>
    );
  }

  if (pathname?.startsWith("/driver")) {
    return (
      <div style={{ position: "fixed", top: 78, right: 14, zIndex: 90 }}>
        <NotificationBell targetPath="/driver" />
      </div>
    );
  }

  return null;
}
