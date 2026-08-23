"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  buildWhatsAppLink,
} from "../lib/contact";

import { theme } from "../lib/theme";
import PageHeader from "../components/PageHeader";

function IconCheckBig() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconPhoneCall({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h4l2 5-2.5 1.6a11.3 11.3 0 0 0 5.4 5.4L15.4 13l5 2v4a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function IconWhatsApp({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

export default function BookingConfirmedPage() {
  const router = useRouter();

  const [booking, setBooking] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("voynu_confirmed_booking");
      if (raw) {
        setBooking(JSON.parse(raw));
      }
    } catch (error) {
      console.error("VOYNU: unable to read confirmed booking:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded && !booking) {
      router.replace("/");
    }
  }, [loaded, booking, router]);

  if (loaded && !booking) {
    return null;
  }

  if (!loaded || !booking) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.colors.bg,
      }}>
        <div style={{
          width: 34,
          height: 34,
          border: "3px solid rgba(8,120,63,0.18)",
          borderTopColor: theme.colors.primary,
          borderRadius: "50%",
        }} />
      </main>
    );
  }

  const isRoundTrip = booking.tripType === "roundtrip";

  const helpMessage = `Hi VOYNU, I need help with my booking:\n\nPickup: ${
    booking.pickup?.name || ""
  }\nDrop: ${booking.drop?.name || ""}\nTravel date: ${
    booking.travelDate || ""
  }\nPickup time: ${
    booking.pickupTime || ""
  }\n\nI'd like to make an amendment / ask a question.`;

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>

      <PageHeader
        maxWidth={theme.maxWidth.content}
        whatsappHref={buildWhatsAppLink(helpMessage)}
      />

      <div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", padding: "32px 0 60px" }}>

        <div style={{ textAlign: "center", marginBottom: 26 }}>

          <div
            style={{
              width: 68,
              height: 68,
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1fa855, #0a7d42)",
              color: "#ffffff",
              boxShadow: "0 14px 30px rgba(31,168,85,0.28)",
            }}
          >
            <IconCheckBig />
          </div>

          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
            Booking Confirmed!
          </h1>

          <p style={{ margin: 0, color: theme.colors.textMuted, fontSize: 13.5, lineHeight: 1.55 }}>
            You'll receive a call{" "}
            <strong style={{ color: theme.colors.primary }}>1 hour before your journey</strong>{" "}
            to confirm the pickup details.
          </p>

        </div>

        <div
          style={{
            padding: 20,
            borderRadius: theme.radius.lg,
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            boxShadow: theme.shadow.card,
          }}
        >

          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.primary, flexShrink: 0 }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>
              {booking.pickup?.name}
            </div>
          </div>

          <div style={{ width: 1.5, height: 16, marginLeft: 4.25, background: "#dbe6df" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
            <div style={{ width: 10, height: 10, marginTop: 4, borderRadius: "50%", background: theme.colors.accent, flexShrink: 0 }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#24352b", lineHeight: 1.4 }}>
              {booking.drop?.name}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px dashed ${theme.colors.border}`,
            }}
          >

            <DetailCell label="Trip type" value={isRoundTrip ? "Round Trip" : "One Way"} />
            <DetailCell label="Distance" value={booking.journey?.oneWayDistanceText} />
            <DetailCell label="Travel date" value={booking.travelDate} />
            <DetailCell label="Pickup time" value={booking.pickupTime} />
            <DetailCell label="Cab type" value={booking.selectedFare?.vehicleName} />
            <DetailCell label="Fare" value={`₹${booking.selectedFare?.totalFare}`} />
            <DetailCell
              label="Payment"
              value={booking.paymentMethod === "upi" ? "UPI" : "Pay on Pickup"}
            />
            <DetailCell label="Passenger" value={booking.passengerName} />

          </div>

        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 22,
            padding: "16px 18px",
            borderRadius: theme.radius.lg,
            background: theme.colors.warningBg,
            border: "1px solid #f0dfa8",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              flex: "0 0 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "#f7e3ac",
              color: theme.colors.warning,
            }}
          >
            <IconPhoneCall size={17} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: theme.colors.warning }}>
              Need help in the meantime?
            </div>
            <div style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: "#8a6b1c" }}>
              You can reach out any time to ask about your booking or request an amendment.
            </div>
          </div>
        </div>

        <a
          href={buildWhatsAppLink(helpMessage)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            width: "100%",
            minHeight: 54,
            marginTop: 14,
            borderRadius: theme.radius.lg,
            background: "#1fa855",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 14,
            boxShadow: "0 10px 24px rgba(31,168,85,.24)",
          }}
        >
          <IconWhatsApp size={17} />
          <span>Chat with us on WhatsApp</span>
        </a>

        <Link
          href="/"
          style={{
            display: "block",
            marginTop: 18,
            textAlign: "center",
            color: theme.colors.primary,
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Book another ride
        </Link>

      </div>

    </main>
  );
}

function DetailCell({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: theme.colors.textFaint, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3 }}>
        {label}
      </span>
      <span style={{ color: theme.colors.text, fontSize: 13, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
    }
