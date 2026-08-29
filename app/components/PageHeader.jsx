"use client";

import Link from "next/link";

import { theme } from "../lib/theme";
import AccountLink from "./AccountLink";
import NotificationBell from "./NotificationBell";

function IconWhatsApp({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

/*
 * whatsappMessage: pass a page-specific pre-filled message.
 * maxWidth: matches the content width of the page using it
 * (theme.maxWidth.content for narrow pages, theme.maxWidth.wide
 * for the home page).
 * showAccountLink / showWhatsapp: hide either action where it
 * doesn't apply (e.g. login/signup pages hide both).
 */
export default function PageHeader({
  maxWidth = theme.maxWidth.content,
  showAccountLink = true,
  showWhatsapp = true,
  whatsappHref = null,
}) {
  return (
    <header
      style={{
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          width: `min(${maxWidth}px, calc(100% - 32px))`,
          margin: "0 auto",
          minHeight: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 11,
              background: theme.gradients.primary,
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 19,
              boxShadow: "0 6px 14px rgba(8,120,63,0.24)",
            }}
          >
            V
          </div>
          <span
            style={{
              color: theme.colors.primary,
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            VOYNU
          </span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NotificationBell />
          {showAccountLink && <AccountLink />}

          {showWhatsapp && (
            <a
              href={
                whatsappHref ||
                "https://wa.me/919123456789?text=" +
                  encodeURIComponent(
                    "Hi VOYNU, I have a question."
                  )
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 15px",
                borderRadius: theme.radius.pill,
                background: "#1fa855",
                color: "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: "0 6px 16px rgba(31,168,85,0.25)",
              }}
            >
              <IconWhatsApp size={14} />
              <span className="whatsappLabel">Chat with us</span>
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 420px) {
          .whatsappLabel {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
