"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../../shared/lib/supabaseClient";

// Bottom tab bar for the two live features + account, shown for signed-in
// customers on the home, commute and account screens. The commute flow has its
// own bottom action dock; global CSS lifts that dock above this bar.
const SHOW_ON = ["/", "/account", "/booking-confirmed", "/subscriptions", "/subscriptions/manage", "/subscriptions/confirmed"];

const icons = {
  ride: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16h15M5.8 16l1.6-5.2a2.2 2.2 0 0 1 2.1-1.5h5a2.2 2.2 0 0 1 2.1 1.5L18.2 16" /><path d="M8 9.3V7h8v2.3" /><circle cx="8" cy="17.6" r="1.6" /><circle cx="16" cy="17.6" r="1.6" /></svg>),
  commute: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>),
  account: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.2 4-6.4 8-6.4s8 2.2 8 6.4" /></svg>),
};

const TABS = [
  { href: "/", label: "Ride", icon: "ride", match: (p) => p === "/" },
  { href: "/subscriptions", label: "Commute", icon: "commute", match: (p) => p.startsWith("/subscriptions") },
  { href: "/account", label: "Account", icon: "account", match: (p) => p.startsWith("/account") },
];

export default function BottomNav() {
  const pathname = usePathname() || "/";
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let dead = false;
    supabase.auth.getSession().then(({ data }) => { if (!dead) setSignedIn(Boolean(data?.session)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(Boolean(s)));
    return () => { dead = true; listener?.subscription?.unsubscribe(); };
  }, []);

  const visible = signedIn && SHOW_ON.includes(pathname);

  useEffect(() => {
    if (visible) document.body.setAttribute("data-bottom-nav", "on");
    else document.body.removeAttribute("data-bottom-nav");
    return () => document.body.removeAttribute("data-bottom-nav");
  }, [visible]);

  if (!visible) return null;

  return (
    <nav className="voynuBottomNav" aria-label="Main">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            {icons[t.icon]}
            <span>{t.label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .voynuBottomNav{position:fixed;left:0;right:0;bottom:0;z-index:30;display:grid;grid-template-columns:repeat(3,1fr);background:rgba(255,255,255,.96);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-top:1px solid #D8DEE8;padding-bottom:env(safe-area-inset-bottom,0px)}
        .voynuBottomNav :global(a){min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#5B6B7C;font-size:12px;font-weight:700;text-decoration:none}
        .voynuBottomNav :global(a.active){color:#0A7FA6}
        @media(min-width:901px){.voynuBottomNav{display:none}}
      `}</style>
    </nav>
  );
}
