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

export default function PageHeader({
  maxWidth = theme.maxWidth.content,
  showAccountLink = true,
  showWhatsapp = false,
  whatsappHref = null,
  whatsappLabel = "Chat with us",
  showProductBar = true,
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isCommute = pathname?.startsWith("/subscriptions");
  const headerWidth = "min(" + maxWidth + "px, calc(100% - 32px))";
  const whatsappUrl =
    whatsappHref ||
    "https://wa.me/919123456789?text=" +
      encodeURIComponent("Hi VOYNU, I have a question.");

  return (
    <header
      className="voynuPageHeader"
      style={{
        background: "linear-gradient(180deg, rgba(248,252,253,.82) 0%, rgba(238,247,249,.52) 100%)",
        backdropFilter: "blur(18px) saturate(125%)",
        boxShadow: "0 12px 32px rgba(10,35,55,.055), inset 0 -1px 0 rgba(255,255,255,.72)",
        borderBottom: "1px solid rgba(255,255,255,.72)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="voynuPageHeaderInner"
        style={{
          width: headerWidth,
          margin: "0 auto",
          minHeight: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Link
          href="/"
          className="voynuHeaderBrand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <img
            src="/icon.svg"
            alt="VOYNU"
            width="40"
            height="40"
            style={{
              borderRadius: 11,
              display: "block",
              boxShadow: "0 6px 14px rgba(10,35,55,.16)",
            }}
          />
          <span
            className="voynuHeaderBrandWord"
            style={{
              color: theme.colors.navy,
              fontWeight: 800,
              fontSize: 19,
              letterSpacing: "-0.4px",
            }}
          >
            VOYNU
          </span>
        </Link>

        <div
          className="voynuHeaderActions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 1,
            minWidth: 0,
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <NotificationBell />

          {showAccountLink && (
            <div className="voynuHeaderAccount">
              <AccountLink />
            </div>
          )}

          {showWhatsapp && (
            <a
              className="voynuHeaderWhatsapp"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 15px",
                borderRadius: theme.radius.pill,
                background: "#22C55E",
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: "0 6px 16px rgba(34,197,94,.22)",
                textDecoration: "none",
              }}
            >
              <IconWhatsApp size={14} />
              <span className={"whatsappLabel" + (showProductBar ? "" : " whatsappLabelAlways")}>{whatsappLabel}</span>
            </a>
          )}
        </div>
      </div>

      {showProductBar && <div className="homeProductBar">
        <div className="homeProductInner">
          <div className="homeProductSwitch" aria-label="VOYNU services">
            <Link href="/" className={isHome ? "homeProductOption active" : "homeProductOption"} style={isHome ? { minHeight: 78, borderRadius: 22, background: "linear-gradient(145deg, #12a8c5 0%, #f46b2a 100%)", color: "#fff", border: "1px solid rgba(255,255,255,.55)", boxShadow: "0 12px 28px rgba(16,145,173,.24), inset 0 1px 0 rgba(255,255,255,.34)" } : { minHeight: 78, borderRadius: 22, background: "linear-gradient(145deg, rgba(255,255,255,.92), rgba(235,245,248,.72))", color: "#19334A", border: "1px solid rgba(255,255,255,.8)", boxShadow: "0 10px 24px rgba(10,35,55,.08), inset 0 1px 0 rgba(255,255,255,.9)" }}>
              <span className="productCopy"><b>Ride</b><small>Book a cab</small></span>
            </Link>
            <Link href="/rentals" className={pathname?.startsWith("/rentals") ? "homeProductOption active" : "homeProductOption"} style={pathname?.startsWith("/rentals") ? { minHeight: 78, borderRadius: 22, background: "linear-gradient(135deg, #079bb8 0%, #f46b2a 100%)", color: "#fff", border: "1px solid rgba(255,255,255,.42)", boxShadow: "0 10px 24px rgba(16,145,173,.22)" } : { minHeight: 78, borderRadius: 22, background: "rgba(255,255,255,.82)", color: "#19334A", border: "1px solid rgba(28,111,138,.10)", boxShadow: "0 8px 20px rgba(10,35,55,.06)" }}>
              <span className="productCopy"><b>Rent</b><small>Drive yourself</small></span>
            </Link>
            <Link href="/subscriptions" className={isCommute ? "homeProductOption active commuteOption" : "homeProductOption commuteOption"} style={isCommute ? { minHeight: 78, borderRadius: 22, background: "linear-gradient(135deg, #079bb8 0%, #f46b2a 100%)", color: "#fff", border: "1px solid rgba(255,255,255,.42)", boxShadow: "0 10px 24px rgba(16,145,173,.22)" } : { minHeight: 78, borderRadius: 22, background: "rgba(255,255,255,.82)", color: "#19334A", border: "1px solid rgba(28,111,138,.10)", boxShadow: "0 8px 20px rgba(10,35,55,.06)" }}>
              <span className="productCopy"><b>Commute</b><small>Daily route</small></span>
            </Link>
          </div>
        </div>
      </div>}
      <style jsx>{`
        .voynuHeaderActions {
          scrollbar-width: none;
        }
        .voynuHeaderActions::-webkit-scrollbar {
          display: none;
        }
        .voynuHeaderActions > :global(*) {
          flex-shrink: 0;
        }
        .homeProductBar {
          border-top: 1px solid rgba(28, 111, 138, .06);
          background: transparent;
        }
        .homeProductInner {
          width: min(760px, calc(100% - 32px));
          margin: 0 auto;
          padding: 9px 0;
          display: flex;
          justify-content: center;
        }
        .homeProductSwitch {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 0;
          background: transparent;
        }
        .homeProductOption {
          min-width: 0;
          width: 100%;
          height: 88px;
          min-height: 88px;
          display: grid;
          place-items: center;
          padding: 0 6px;
          border-radius: 22px;
          overflow: hidden;
          isolation: isolate;
          transform: translateZ(0);
          text-decoration: none;
          color: ${theme.colors.textMuted};
          background: rgba(255,255,255,.78);
          border: 1px solid rgba(28, 111, 138, .10);
          box-shadow: 0 7px 18px rgba(10,35,55,.055);
          backdrop-filter: blur(12px);
          transition: transform .18s ease, background .18s ease, color .18s ease, box-shadow .18s ease;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          outline: none;
          -webkit-focus-ring-color: transparent;
        }
        .homeProductOption:hover {
          transform: translateY(-1px) translateZ(0);
          background: #f8fcfd;
        }
        .homeProductOption:focus,
        .homeProductOption:focus-visible,
        .homeProductOption:active {
          outline: none;
          -webkit-tap-highlight-color: transparent;
        }
        .homeProductOption.active {
          background: ${theme.gradients.primary};
          color: #fff;
          box-shadow: 0 9px 22px rgba(10,127,166,.22);
        }
        .productIcon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #e8f5f8;
          color: ${theme.colors.primary};
        }
        .homeProductOption.active .productIcon {
          background: rgba(255,255,255,.18);
          color: #fff;
        }
        .productCopy {
          min-width: 0;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
        }
        .productCopy b,
        .productCopy small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .productCopy b {
          font-size: 17px;
          line-height: 1.05;
          letter-spacing: -0.35px;
          text-align: center;
          font-weight: 800;
        }
        .productCopy small {
          font-size: 11.5px;
          line-height: 1.15;
          letter-spacing: -0.1px;
          text-align: center;
          opacity: .72;
        }
        .homeProductOption.active .productCopy small {
          opacity: .86;
        }
        .whatsappLabel {
          display: inline;
        }
        @media (max-width: 700px) {
          .voynuPageHeaderInner { width: 100% !important; padding: 8px 10px; min-height: 62px !important; gap: 6px !important; }
          .voynuHeaderBrand { gap: 7px !important; }
          .voynuHeaderBrand img { width: 34px !important; height: 34px !important; }
          .voynuHeaderBrandWord { font-size: 16px !important; }
          .voynuHeaderActions { gap: 4px !important; min-width: 0; }
          .voynuHeaderAction { padding: 8px 7px !important; font-size: 10px !important; }
          .homeProductInner { width: calc(100% - 32px); padding: 8px 0; }
          .homeProductSwitch { width: 100%; gap: 10px; padding: 0; }
          .homeProductOption { height: 78px !important; min-height: 78px !important; padding: 0 4px; border-radius: 22px; }
          .productIcon { width: 29px; height: 29px; flex-basis: 29px; border-radius: 10px; }
          .productIcon svg { width: 16px; height: 16px; }
          .productCopy b { font-size: 16px; }
          .productCopy small { font-size: 11px; }
        }
        @media (max-width: 520px) {
          .voynuHeaderBrandWord { display: none; }
          .voynuHeaderAccount :global(a) { padding: 9px 11px !important; font-size: 10.5px !important; }
          .voynuHeaderAccount :global(a span) { display: inline !important; }
          .homeProductInner { width: calc(100% - 32px); padding: 7px 0; }
          .homeProductSwitch { gap: 8px; padding: 0; }
          .homeProductOption { height: 78px !important; min-height: 78px !important; padding: 0 3px; border-radius: 22px; }
          .productIcon { width: 27px; height: 27px; flex-basis: 27px; }
          .productIcon svg { width: 15px; height: 15px; }
          .productCopy b { font-size: 16px; }
          .productCopy small { font-size: 11px; }
        }
        @media (max-width: 380px) {
          .voynuHeaderActions {
            gap: 3px !important;
          }
          .voynuHeaderAction {
            padding: 8px 7px !important;
            font-size: 10px !important;
          }
          .voynuHeaderAccount :global(a) {
            padding: 8px 8px !important;
          }
          .voynuHeaderWhatsapp {
            padding: 8px 8px !important;
          }
          .voynuPageHeaderInner {
            padding-inline: 7px;
          }
          .homeProductInner {
            width: calc(100% - 32px);
          }
          .homeProductOption b {
            font-size: 14px;
          }
          .homeProductOption small {
            font-size: 10px;
          }
        }
      `}</style>
    </header>
  );
}
