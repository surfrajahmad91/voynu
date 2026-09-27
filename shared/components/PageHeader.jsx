"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountLink from "./AccountLink";
import NotificationBell from "./NotificationBell";

const navItems = [
  { href: "/", label: "Ride", sub: "Cab", match: (p) => p === "/" || p?.startsWith("/cab-selection") || p?.startsWith("/booking-confirmed") },
  { href: "/rentals", label: "Rent", sub: "Vehicle", match: (p) => p?.startsWith("/rentals") },
  { href: "/subscriptions", label: "Commute", sub: "Daily", match: (p) => p?.startsWith("/subscriptions") },
];

function Icon({ type }) {
  if (type === "car") return <span aria-hidden="true">🚕</span>;
  if (type === "rent") return <span aria-hidden="true">🚙</span>;
  return <span aria-hidden="true">🗓️</span>;
}

export default function PageHeader({
  maxWidth = 1240,
  showAccountLink = true,
  showWhatsapp = false,
  whatsappHref = "https://wa.me/919123456789?text=Hi%20VOYNU%2C%20I%20have%20a%20question.",
  whatsappLabel = "Chat with us",
  showProductBar = false,
}) {
  const pathname = usePathname();
  const isCabSelection = pathname?.startsWith("/cab-selection");
  const isSubscriptionFlow = pathname?.startsWith("/subscriptions");
  const isPublicTracking = pathname?.startsWith("/track/");
  const showMobileDock = showAccountLink && !isCabSelection && !isSubscriptionFlow && !isPublicTracking;

  return (
    <>
      <header className="voynuAppHeader">
        <div className="voynuAppHeaderInner" style={{ maxWidth }}>
          <Link href="/" className="voynuBrand" aria-label="VOYNU home">
            <img src="/icon.svg" alt="" width="36" height="36" />
            <strong>VOYNU</strong>
          </Link>

          <nav className="voynuPrimaryNav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={item.match(pathname) ? "active" : ""}>
                <Icon type={item.href === "/" ? "car" : item.href === "/rentals" ? "rent" : "commute"} />
                <span><b>{item.label}</b><small>{item.sub}</small></span>
              </Link>
            ))}
          </nav>

          <div className="voynuHeaderActions">
            <NotificationBell />
            {showWhatsapp && (
              <a className="voynuWhatsapp" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={whatsappLabel}>
                <span>◉</span><span className="desktopOnly">{whatsappLabel}</span>
              </a>
            )}
            {showAccountLink && <AccountLink />}
          </div>
        </div>

        {showProductBar && (
          <div className="voynuProductBar">
            <div className="voynuProductBarInner">
              <span>Move with VOYNU</span>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={item.match(pathname) ? "active" : ""}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {showMobileDock && (
        <nav className="voynuMobileDock" aria-label="Mobile navigation">
          <Link href="/" className={pathname === "/" ? "active" : ""}>⌂<span>Home</span></Link>
          <Link href="/account" className={pathname === "/account" ? "active" : ""}>▤<span>Trips</span></Link>
          <Link href="/subscriptions" className={pathname?.startsWith("/subscriptions") ? "active" : ""}>🚕<span>Commute</span></Link>
          <Link href="/wallet" className={pathname?.startsWith("/wallet") ? "active" : ""}>◫<span>Wallet</span></Link>
          <Link href="/account" className={pathname === "/account" ? "active" : ""}>●<span>Account</span></Link>
        </nav>
      )}

      <style jsx>{`
        .voynuAppHeader{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);border-bottom:1px solid #E6EDF2;box-shadow:0 6px 24px rgba(10,35,55,.05)}
        .voynuAppHeaderInner{width:calc(100% - 28px);min-height:68px;margin:auto;display:flex;align-items:center;gap:18px}
        .voynuBrand{display:flex;align-items:center;gap:8px;color:#0A2337;text-decoration:none;flex:0 0 auto}.voynuBrand img{border-radius:10px}.voynuBrand strong{font-size:18px;letter-spacing:-.5px}
        .voynuPrimaryNav{display:flex;align-items:center;gap:5px;flex:1}.voynuPrimaryNav a{display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:13px;text-decoration:none;color:#5B6B7C}.voynuPrimaryNav a:hover,.voynuPrimaryNav a.active{background:#EAF5F8;color:#00456B}.voynuPrimaryNav b{display:block;font-size:11px}.voynuPrimaryNav small{display:block;font-size:8px;opacity:.65;margin-top:2px}
        .voynuHeaderActions{display:flex;align-items:center;gap:7px;margin-left:auto}.voynuWhatsapp{display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:11px;background:#EAFBF2;color:#138A4B;text-decoration:none;font-size:10px;font-weight:800}
        .voynuProductBar{border-top:1px solid #EEF3F7;background:#F8FAFC}.voynuProductBarInner{width:min(760px,calc(100% - 28px));min-height:44px;margin:auto;display:flex;align-items:center;justify-content:center;gap:7px}.voynuProductBarInner>span{font-size:9px;color:#7A8795;font-weight:800;text-transform:uppercase;letter-spacing:.7px}.voynuProductBarInner a{padding:7px 11px;border-radius:99px;color:#5B6B7C;text-decoration:none;font-size:10px;font-weight:800}.voynuProductBarInner a.active{background:#0A7FA6;color:#fff}
        .voynuMobileDock{display:none}
        @media(max-width:900px){.voynuAppHeaderInner{width:calc(100% - 18px);min-height:60px;gap:8px}.voynuPrimaryNav{display:none}.voynuBrand strong{font-size:16px}.voynuHeaderActions{gap:4px}.desktopOnly{display:none}.voynuWhatsapp{width:36px;height:36px;padding:0;justify-content:center}}
        @media(max-width:600px){.voynuMobileDock{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));z-index:120;height:60px;display:grid;grid-template-columns:repeat(5,1fr);padding:4px;border:1px solid #E3EAF0;border-radius:19px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);box-shadow:0 16px 40px rgba(10,35,55,.15)}.voynuMobileDock a{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:14px;text-decoration:none;color:#7A8795;font-size:18px}.voynuMobileDock a span{font-size:8px;font-weight:800}.voynuMobileDock a.active{background:#0A7FA6;color:#fff}:global(body){padding-bottom:78px}}
      `}</style>
    </>
  );
}
