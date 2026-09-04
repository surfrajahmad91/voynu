"use client";
import Link from "next/link";
import { theme } from "../lib/theme";
import AccountLink from "./AccountLink";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";

export default function PageHeader({ maxWidth = theme.maxWidth.content, showAccountLink = true, showWhatsapp = false, whatsappHref = null }) {
  return <header className="voynu-page-header"><div className="voynu-page-header-inner" style={{ width:`min(${maxWidth}px, calc(100% - 32px))` }}>
    <Link href="/" className="voynu-header-brand" aria-label="VOYNU home"><img src="/voynu-lockup.svg" alt="VOYNU — Move Together" /></Link>
    <nav className="voynu-header-nav" aria-label="Primary navigation"><Link href="/">Ride</Link><Link href="/#booking">Outstation</Link><Link href="/#booking">Airport</Link><Link href="/#how-it-works">How it works</Link><Link href="/#help">Help</Link></nav>
    <div className="voynu-header-actions"><ThemeToggle compact />{showAccountLink && <AccountLink />}<Link href="/signup" className="voynu-signup">Sign up</Link>{showWhatsapp && <a href={whatsappHref || "https://wa.me/919123456789?text=" + encodeURIComponent("Hi VOYNU, I have a question.")} target="_blank" rel="noopener noreferrer" className="voynu-whatsapp">Chat</a>}<NotificationBell /></div>
  </div><style jsx>{`
    .voynu-page-header{background:color-mix(in srgb,var(--voynu-surface,#fff) 96%,transparent);backdrop-filter:blur(16px);border-bottom:1px solid var(--voynu-border,#E5E9EF);position:sticky;top:0;z-index:50;padding-top:env(safe-area-inset-top,0px)}
    .voynu-page-header-inner{margin:0 auto;min-height:76px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:28px}.voynu-header-brand{display:flex;align-items:center;text-decoration:none;min-width:176px}.voynu-header-brand img{display:block;width:176px;height:auto;max-height:56px;object-fit:contain}.voynu-header-nav{display:flex;align-items:center;justify-content:center;gap:26px}.voynu-header-nav a{color:var(--voynu-text,#1F2937);text-decoration:none;font-size:12px;font-weight:650;white-space:nowrap}.voynu-header-nav a:hover{color:var(--voynu-teal,#00B4A6)}.voynu-header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;white-space:nowrap}.voynu-signup{display:inline-flex;align-items:center;justify-content:center;min-width:82px;height:40px;padding:0 18px;border-radius:12px;background:var(--voynu-navy,#0D1B2A);color:#fff!important;text-decoration:none;font-size:12.5px;font-weight:750;box-shadow:0 7px 18px rgba(13,27,42,.16)}.voynu-whatsapp{display:inline-flex;padding:9px 13px;border-radius:12px;background:#22C55E;color:#fff;text-decoration:none;font-size:12px;font-weight:700}
    @media(max-width:900px){.voynu-page-header-inner{grid-template-columns:auto 1fr;gap:14px}.voynu-header-nav{display:none}.voynu-header-actions{justify-self:end}}@media(max-width:520px){.voynu-page-header-inner{width:calc(100% - 24px)!important;min-height:64px;gap:7px}.voynu-header-brand{min-width:118px}.voynu-header-brand img{width:126px}.voynu-header-actions{gap:5px}.voynu-signup{min-width:66px;height:36px;padding:0 12px;border-radius:10px;font-size:12px}.voynu-whatsapp{display:none}}
  `}</style></header>;
}
