"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { theme } from "../lib/theme";
import AccountLink from "./AccountLink";
import NotificationBell from "./NotificationBell";

function IconWhatsApp({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") return <svg {...common}><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></svg>;
  if (name === "trips") return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 8h10M7 12h7M7 16h5" /></svg>;
  if (name === "commute") return <svg {...common}><path d="M5 18h14M7 15h10l-1-6H8l-1 6Z" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /><path d="M9 9V6h6v3" /></svg>;
  if (name === "wallet") return <svg {...common}><path d="M4 7.5h14a2 2 0 0 1 2 2v8.5H4a2 2 0 0 1-2-2V7.5Z" /><path d="M4 7.5V6a2 2 0 0 1 2-2h12v3.5" /><path d="M15 12h5" /></svg>;
  if (name === "account") return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-4 3-6 7-6s6.5 2 7 6" /></svg>;
  if (name === "car") return <svg {...common}><path d="M4 16h16M6 16l1.4-5a2 2 0 0 1 2-1.5h5.2a2 2 0 0 1 2 1.5L18 16" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>;
  return null;
}

const navItems = [
  { href: "/", label: "Ride", sub: "Cab", icon: "car", match: (p) => p === "/" || p?.startsWith("/cab-selection") || p?.startsWith("/booking-confirmed") },
  { href: "/rentals", label: "Rent", sub: "Vehicle", icon: "calendar", match: (p) => p?.startsWith("/rentals") },
  { href: "/subscriptions", label: "Commute", sub: "Daily", icon: "commute", match: (p) => p?.startsWith("/subscriptions") },
];

const mobileItems = [
  { href: "/", label: "Home", icon: "home", match: (p) => p === "/" },
  { href: "/account", label: "Trips", icon: "trips", match: (p) => p === "/account" },
  { href: "/subscriptions", label: "Commute", icon: "commute", match: (p) => p?.startsWith("/subscriptions") },
  { href: "/wallet", label: "Wallet", icon: "wallet", match: (p) => p?.startsWith("/wallet") },
  { href: "/account", label: "Account", icon: "account", match: (p) => p === "/account" },
];

export default function PageHeader({
  maxWidth = theme.maxWidth.content,
  showAccountLink = true,
  showWhatsapp = false,
  whatsappHref = null,
  whatsappLabel = "Chat with us",
  showProductBar = false,
}) {
  const pathname = usePathname();
  const isCabSelection = pathname?.startsWith("/cab-selection");
  const isSubscriptionFlow = pathname?.startsWith("/subscriptions");
  const isPublicTracking = pathname?.startsWith("/track/");
  const showMobileDock = showAccountLink && !isCabSelection && !isSubscriptionFlow && !isPublicTracking;
  const headerWidth = "min(" + maxWidth + "px, calc(100% - 28px))";
  const whatsappUrl = whatsappHref || "https://wa.me/919123456789?text=" + encodeURIComponent("Hi VOYNU, I have a question.");

  return (
    <>
      <header className="voynuPageHeader">
        <div className="voynuPageHeaderInner" style={{ width: headerWidth }}>
          <Link href="/" className="voynuHeaderBrand" aria-label="VOYNU home">
            <img src="/icon.svg" alt="" width="38" height="38" />
            <span>VOYNU</span>
          </Link>

          <nav className="voynuDesktopNav" aria-label="Primary">
            {navItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link key={item.href} href={item.href} className={active ? "voynuTopNav active" : "voynuTopNav"}>
                  <span className="navIcon"><Icon name={item.icon} size={16} /></span>
                  <span><b>{item.label}</b><small>{item.sub}</small></span>
                </Link>
              );
            })}
          </nav>

          <div className="voynuHeaderActions">
            <NotificationBell />
            {showWhatsapp && (
              <a className="voynuHeaderWhatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <IconWhatsApp size={14} />
                <span>{whatsappLabel}</span>
              </a>
            )}
            {showAccountLink && <div className="voynuHeaderAccount"><AccountLink /></div>}
          </div>
        </div>

        {showProductBar && (
          <div className="voynuServiceStrip">
            <div className="voynuServiceStripInner">
              <span className="voynuServiceLabel">Move with VOYNU</span>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={item.match(pathname) ? "serviceLink active" : "serviceLink"}>
                  <Icon name={item.icon} size={15} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {showMobileDock && (
        <nav className="voynuMobileDock" aria-label="Mobile navigation">
          {mobileItems.map((item, index) => {
            const active = item.match(pathname);
            return (
              <Link key={item.label + index} href={item.href} className={active ? "mobileDockItem active" : "mobileDockItem"}>
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <style jsx>{`
        .voynuPageHeader {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          border-bottom: 1px solid rgba(10,35,55,.07);
          box-shadow: 0 8px 30px rgba(10,35,55,.045);
        }
        .voynuPageHeaderInner {
          min-height: 70px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .voynuHeaderBrand {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex: 0 0 auto;
        }
        .voynuHeaderBrand img {
          display: block;
          border-radius: 12px;
          box-shadow: 0 7px 18px rgba(10,35,55,.14);
        }
        .voynuHeaderBrand span {
          color: #0A2337;
          font-size: 19px;
          line-height: 1;
          font-weight: 850;
          letter-spacing: -.65px;
        }
        .voynuDesktopNav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .voynuTopNav {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 46px;
          padding: 5px 13px;
          border-radius: 14px;
          text-decoration: none;
          color: #5B6B7C;
          transition: .18s ease;
        }
        .voynuTopNav:hover { background: #F3F8FA; color: #0A2337; }
        .voynuTopNav.active {
          background: linear-gradient(135deg, rgba(18,160,198,.11), rgba(245,129,63,.08));
          color: #00456B;
        }
        .voynuTopNav .navIcon {
          width: 30px; height: 30px; display: grid; place-items: center;
          border-radius: 10px; background: #F0F7F9; color: #0A7FA6;
        }
        .voynuTopNav.active .navIcon { background: #0A7FA6; color: #fff; }
        .voynuTopNav b { display: block; font-size: 12px; line-height: 1.1; font-weight: 800; }
        .voynuTopNav small { display: block; margin-top: 2px; font-size: 9px; line-height: 1; opacity: .65; }
        .voynuHeaderActions {
          display: flex;
          align-items: center;
          gap: 7px;
          flex: 0 0 auto;
        }
        .voynuHeaderWhatsapp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 38px;
          padding: 0 13px;
          border-radius: 12px;
          background: #EAFBF2;
          color: #138A4B;
          border: 1px solid #CDEEDB;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }
        .voynuHeaderAccount :global(a) {
          min-height: 38px !important;
          border-radius: 12px !important;
          padding: 0 13px !important;
          display: inline-flex !important;
          align-items: center !important;
        }
        .voynuServiceStrip {
          border-top: 1px solid rgba(10,35,55,.045);
          background: rgba(247,250,252,.72);
        }
        .voynuServiceStripInner {
          width: min(760px, calc(100% - 28px));
          margin: 0 auto;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .voynuServiceLabel {
          margin-right: 5px;
          color: #7A8795;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .8px;
          text-transform: uppercase;
        }
        .serviceLink {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          color: #5B6B7C;
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
        }
        .serviceLink.active { color: #fff; background: linear-gradient(135deg,#12A0C6,#0A7FA6 55%,#F5813F); box-shadow: 0 6px 15px rgba(10,127,166,.16); }
        .voynuMobileDock { display: none; }

        @media (max-width: 900px) {
          .voynuPageHeaderInner { width: calc(100% - 20px) !important; min-height: 62px; gap: 8px; }
          .voynuDesktopNav { display: none; }
          .voynuHeaderBrand img { width: 34px; height: 34px; }
          .voynuHeaderBrand span { font-size: 17px; }
          .voynuHeaderActions { margin-left: auto; gap: 4px; }
          .voynuHeaderWhatsapp span { display: none; }
          .voynuHeaderWhatsapp { width: 38px; justify-content: center; padding: 0; }
          .voynuHeaderAccount :global(a) { min-height: 38px !important; padding: 0 10px !important; }
          .voynuServiceStripInner { overflow-x: auto; justify-content: flex-start; }
          .voynuServiceLabel { display: none; }
        }

        @media (max-width: 600px) {
          .voynuMobileDock {
            position: fixed;
            left: 8px;
            right: 8px;
            bottom: calc(8px + env(safe-area-inset-bottom));
            z-index: 120;
            height: 62px;
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            padding: 5px;
            border: 1px solid rgba(255,255,255,.85);
            border-radius: 20px;
            background: rgba(255,255,255,.88);
            backdrop-filter: blur(20px) saturate(140%);
            -webkit-backdrop-filter: blur(20px) saturate(140%);
            box-shadow: 0 18px 45px rgba(10,35,55,.16), 0 2px 8px rgba(10,35,55,.05);
          }
          .mobileDockItem {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border-radius: 15px;
            color: #7A8795;
            text-decoration: none;
            font-size: 8.5px;
            font-weight: 800;
            transition: .18s ease;
          }
          .mobileDockItem.active {
            color: #fff;
            background: linear-gradient(135deg,#12A0C6,#0A7FA6 55%,#F5813F);
            box-shadow: 0 8px 18px rgba(10,127,166,.18);
          }
          .mobileDockItem:active { transform: scale(.96); }
          :global(body) { padding-bottom: 82px; }
        }
      `}</style>
    </>
  );
}
