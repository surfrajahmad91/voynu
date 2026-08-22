"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { buildWhatsAppLink } from "../lib/contact";

const fontFamily = "'Plus Jakarta Sans', -apple-system, sans-serif";

function IconLogout({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

/*
 * Extracts a short, human-friendly name from a full address —
 * e.g. "Barra 2, Barra World Bank, Barra, Kanpur, Uttar Pradesh
 * 208027, India" -> "Barra 2".
 *
 * Takes the first comma-separated segment, since Google's
 * formatted_address always puts the most specific/local part
 * first.
 */
function shortLocationName(fullAddress) {
  if (!fullAddress) return "";
  const firstSegment = fullAddress.split(",")[0].trim();
  return firstSegment || fullAddress;
}

function shortBookingId(id) {
  if (!id) return "";
  return id.slice(0, 8).toUpperCase();
}

const statusColors = {
  pending: { bg: "#fdf3dc", text: "#7a5a10" },
  confirmed: { bg: "#eaf6ee", text: "#0a7d42" },
  completed: { bg: "#e5ede8", text: "#45564c" },
  cancelled: { bg: "#fbe4e0", text: "#c64a3f" },
};

export default function AccountPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data?.session) {
        router.replace("/login");
        return;
      }

      if (!cancelled) {
        setUser(data.session.user);
        setChecking(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);

      const { data } = await supabase
        .from("bookings")
        .select("*")
        .order("travel_date", { ascending: false });

      setLoadingBookings(false);
      setBookings(data || []);
    };

    fetchBookings();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = bookings.filter((b) => b.travel_date >= today);
  const past = bookings.filter((b) => b.travel_date < today);

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5faf6",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            border: "3px solid rgba(8,120,63,0.18)",
            borderTopColor: "#0a7d42",
            borderRadius: "50%",
          }}
        />
      </main>
    );
  }

  const renderBookingCard = (b) => {
    const status = statusColors[b.status] || statusColors.pending;

    return (
      <div
        key={b.id}
        style={{
          padding: "16px 18px",
          borderRadius: 16,
          background: "#ffffff",
          border: "1px solid #e5ede8",
          boxShadow: "0 8px 20px rgba(10,40,25,0.05)",
          marginBottom: 12,
        }}
      >

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "#8a9790",
              letterSpacing: 0.3,
            }}
          >
            BOOKING #{shortBookingId(b.id)}
          </span>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "capitalize",
              background: status.bg,
              color: status.text,
              flexShrink: 0,
            }}
          >
            {b.status}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0a7d42", flexShrink: 0 }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#16241d" }}>
            {shortLocationName(b.pickup_name)}
          </span>
          <span style={{ color: "#a3b0aa" }}>→</span>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#c8622a", flexShrink: 0 }} />
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "#16241d" }}>
            {shortLocationName(b.drop_name)}
          </span>
        </div>

        <div
          style={{
            fontSize: 11,
            color: "#8a9790",
            marginBottom: 10,
            lineHeight: 1.5,
          }}
        >
          {b.pickup_name} → {b.drop_name}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
          }}
        >
          <InfoChip label={b.trip_type === "roundtrip" ? "Round Trip" : "One Way"} />
          <InfoChip label={`${b.travel_date} • ${b.pickup_time}`} />
          <InfoChip label={b.vehicle_type} />
          {b.one_way_distance_km && (
            <InfoChip label={`${Number(b.one_way_distance_km).toFixed(1)} km`} />
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 10,
            borderTop: "1px dashed #e5ede8",
          }}
        >
          <div>
            <div style={{ fontSize: 10.5, color: "#8a9790", fontWeight: 700 }}>
              {b.payment_method === "upi" ? "UPI Payment" : "Pay on Pickup"}
            </div>
            <div style={{ fontSize: 10, color: "#a3b0aa", marginTop: 1 }}>
              {b.status === "completed" ? "Paid" : "To pay"}
            </div>
          </div>

          <div style={{ fontSize: 18, fontWeight: 800, color: "#0a7d42" }}>
            ₹{b.fare}
          </div>
        </div>

      </div>
    );
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f5faf6", fontFamily, color: "#16241d" }}>

      <header
        style={{
          background: "rgba(255,255,255,0.92)",
          borderBottom: "1px solid #e8eee9",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: "min(680px, calc(100% - 32px))",
            margin: "0 auto",
            minHeight: 66,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                background: "linear-gradient(135deg, #0a7d42, #075c31)",
                color: "#ffffff",
                fontWeight: 800,
              }}
            >
              V
            </div>
            <span style={{ color: "#0a7d42", fontWeight: 800, fontSize: 16 }}>VOYNU</span>
          </Link>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 20,
              border: "1.5px solid #e5ede8",
              background: "#ffffff",
              color: "#45564c",
              fontFamily,
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <IconLogout size={13} />
            Log out
          </button>
        </div>
      </header>

      <div style={{ width: "min(680px, calc(100% - 32px))", margin: "0 auto", padding: "24px 0 60px" }}>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 18,
            borderRadius: 16,
            background: "#ffffff",
            border: "1px solid #e5ede8",
            boxShadow: "0 12px 30px rgba(10,40,25,0.06)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #0a7d42, #075c31)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {(user?.user_metadata?.full_name || user?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
              {user?.user_metadata?.full_name || "VOYNU Customer"}
            </div>
            <div style={{ fontSize: 12, color: "#7a8981", marginTop: 2 }}>
              {user?.email}
            </div>
          </div>
        </div>

        <h2 style={{ margin: "24px 0 12px", fontSize: 15, fontWeight: 800 }}>
          Upcoming journeys
        </h2>

        {loadingBookings ? (
          <p style={{ color: "#8a9790", fontSize: 13 }}>Loading...</p>
        ) : upcoming.length === 0 ? (
          <p style={{ color: "#8a9790", fontSize: 13 }}>No upcoming bookings.</p>
        ) : (
          upcoming.map(renderBookingCard)
        )}

        <h2 style={{ margin: "24px 0 12px", fontSize: 15, fontWeight: 800 }}>
          Past journeys
        </h2>

        {loadingBookings ? (
          <p style={{ color: "#8a9790", fontSize: 13 }}>Loading...</p>
        ) : past.length === 0 ? (
          <p style={{ color: "#8a9790", fontSize: 13 }}>No past bookings yet.</p>
        ) : (
          past.map(renderBookingCard)
        )}

        <a
          href={buildWhatsAppLink("Hi VOYNU, I need help with my account/booking.")}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            marginTop: 26,
            textAlign: "center",
            color: "#0a7d42",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Need help? Chat with us on WhatsApp
        </a>

      </div>

    </main>
  );
}

function InfoChip({ label }) {
  return (
    <span
      style={{
        padding: "5px 10px",
        borderRadius: 20,
        background: "#f4f6f4",
        border: "1px solid #e5ede8",
        color: "#45564c",
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
