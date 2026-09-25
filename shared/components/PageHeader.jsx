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
  showWhatsapp = true,
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
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid " + theme.colors.border,
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
              <span className="whatsappLabel">{whatsappLabel}</span>
            </a>
          )}
        </div>
      </div>

      {showProductBar && <div className="homeProductBar">
        <div className="homeProductInner">
          <div className="homeProductSwitch">
            <Link href="/" className={isHome ? "homeProductOption active" : "homeProductOption"}>
              <span>🚕</span>
              <span>
                <b>Ride</b>
                <small>We drive. You relax.</small>
              </span>
            </Link>
            <Link href="/rentals" className={pathname?.startsWith("/rentals") ? "homeProductOption active" : "homeProductOption"}>
              <span>🚗</span>
              <span>
                <b>Rent</b>
                <small>You drive. You decide.</small>
              </span>
            </Link>
            <Link href="/subscriptions" className={isCommute ? "homeProductOption active commuteOption" : "homeProductOption commuteOption"}>
              <span>🗓️</span>
              <span>
                <b>Commute</b>
                <small>Fixed daily route.</small>
              </span>
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
          border-top: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
        }
        .homeProductInner {
          width: min(${maxWidth}px, calc(100% - 32px));
          margin: 0 auto;
          padding: 10px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .homeProductIntro {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .homeProductInner strong {
          font-size: 11px;
          color: ${theme.colors.text};
          letter-spacing: -0.1px;
        }
        .homeProductInner span {
          font-size: 9.5px;
          color: ${theme.colors.textMuted};
        }
        .homeProductSwitch {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
          padding: 4px;
          border-radius: 16px;
          background: ${theme.colors.bg};
          border: 1px solid ${theme.colors.border};
          width: min(560px, 100%);
        }
        .homeProductOption {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 54px;
          padding: 8px 12px;
          border-radius: 12px;
          text-decoration: none;
          color: ${theme.colors.textMuted};
          transition: 0.18s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .homeProductOption.active {
          background: ${theme.gradients.primary};
          color: #fff;
          box-shadow: 0 5px 14px rgba(10, 127, 166, 0.18);
        }
        .homeProductOption b,
        .homeProductOption small {
          display: block;
        }
        .homeProductOption b {
          font-size: 13px;
          line-height: 1.1;
        }
        .homeProductOption small {
          font-size: 9.5px;
          margin-top: 3px;
          opacity: 0.8;
        }
        .homeProductOption > span:first-child {
          font-size: 19px;
          line-height: 1;
        }
        .whatsappLabel {
          display: inline;
        }
        @media (max-width: 700px) {
          .voynuPageHeaderInner {
            width: 100% !important;
            padding: 8px 10px;
            min-height: 62px !important;
            gap: 6px !important;
          }
          .voynuHeaderBrand {
            gap: 7px !important;
          }
          .voynuHeaderBrand img {
            width: 34px !important;
            height: 34px !important;
          }
          .voynuHeaderBrandWord {
            font-size: 16px !important;
          }
          .voynuHeaderActions {
            gap: 4px !important;
            min-width: 0;
          }
          .voynuHeaderAction {
            padding: 8px 7px !important;
            font-size: 10px !important;
          }
          .voynuHeaderWhatsapp {
            padding: 8px 10px !important;
          }
          .homeProductInner {
            width: calc(100% - 20px);
            padding: 8px 0;
          }
          .homeProductSwitch {
            width: 100%;
          }
          /* Below 700px there isn't room for icon + two lines of text side by side without
             the subtitle shrinking past readable size, so tabs switch to icon-over-label and
             the marketing subtitle (\"We drive, you relax\" etc.) is dropped rather than shrunk. */
          .homeProductOption {
            flex-direction: column;
            gap: 3px;
            min-height: 56px;
            padding: 8px 4px;
          }
          .homeProductOption > span:first-child {
            font-size: 18px;
            line-height: 1;
          }
          .homeProductOption b {
            font-size: 11.5px;
            line-height: 1.15;
          }
          .homeProductOption small {
            display: none;
          }
        }
        @media (max-width: 520px) {
          .voynuHeaderBrandWord {
            display: none;
          }
          .voynuHeaderAccount :global(a) {
            padding: 9px 10px !important;
            font-size: 10.5px !important;
          }
          .voynuHeaderAccount :global(a span) {
            display: none;
          }
          .voynuHeaderWhatsapp .whatsappLabel {
            display: none;
          }
          .voynuHeaderWhatsapp {
            padding: 9px 9px !important;
          }
          .homeProductBar {
            padding: 6px 0;
          }
          .homeProductSwitch {
            padding: 3px;
            gap: 4px;
          }
          .homeProductOption {
            min-height: 52px;
            padding: 7px 3px;
          }
          .homeProductOption > span:first-child {
            font-size: 16px;
          }
          .homeProductOption b {
            font-size: 10.5px;
          }
          .whatsappLabel {
            display: none;
          }
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
            width: calc(100% - 14px);
          }
          .homeProductOption b {
            font-size: 10px;
          }
        }
      `}</style>
    </header>
  );
}
