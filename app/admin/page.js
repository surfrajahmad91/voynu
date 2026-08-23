"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../lib/theme";
import PageHeader from "../components/PageHeader";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

function IconLogout({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

const statusColors = {
  pending: { bg: theme.colors.warningBg, text: theme.colors.warning },
  confirmed: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  completed: { bg: "#e5ede8", text: "#45564c" },
  cancelled: { bg: theme.colors.errorBg, text: theme.colors.error },
};

export default function AdminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";

      if (!data?.session) {
        router.push("/login");
        return;
      }

      if (!ADMIN_EMAILS.includes(email)) {
        if (!cancelled) {
          setAuthorized(false);
          setChecking(false);
        }
        return;
      }

      if (!cancelled) {
        setAuthorized(true);
        setChecking(false);
      }
    };

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      setLoadingBookings(false);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setBookings(data || []);
    };

    fetchBookings();
  }, [authorized]);

  const handleStatusChange = async (id, newStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );

    await supabase.from("bookings").update({ status: newStatus }).eq("id", id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checking) {
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

  if (!authorized) {
    return (
      <main style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.colors.bg,
        fontFamily: theme.fontFamily,
        padding: 24,
      }}>
        <div style={{
          maxWidth: 380,
          textAlign: "center",
          padding: "32px 26px",
          borderRadius: theme.radius.xl,
          background: theme.colors.surface,
          boxShadow: theme.shadow.card,
        }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>Not authorized</h1>
          <p style={{ margin: "0 0 20px", color: theme.colors.textFaint, fontSize: 13 }}>
            This account doesn't have admin access.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: 12,
              background: theme.colors.primary,
              color: "#ffffff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 13.5,
            }}
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>

      <PageHeader
        maxWidth={theme.maxWidth.wide}
        showAccountLink={false}
        showWhatsapp={false}
      />

      <div style={{
        background: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <div style={{
          width: `min(${theme.maxWidth.wide}px, calc(100% - 32px))`,
          margin: "0 auto",
          minHeight: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: theme.colors.primary }}>
            Admin — Bookings
          </span>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${theme.colors.border}`,
              background: "#ffffff",
              color: "#45564c",
              fontFamily: theme.fontFamily,
              fontWeight: 700,
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            <IconLogout size={12} />
            Log out
          </button>
        </div>
      </div>

      <div style={{ width: `min(${theme.maxWidth.wide}px, calc(100% - 32px))`, margin: "0 auto", padding: "24px 0 60px" }}>

        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
          Bookings ({bookings.length})
        </h1>

        {error && (
          <div style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: theme.colors.errorBg,
            color: theme.colors.error,
            fontSize: 12.5,
            marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        {loadingBookings ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>No bookings yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bookings.map((b) => {
              const status = statusColors[b.status] || statusColors.pending;

              return (
                <div
                  key={b.id}
                  style={{
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: theme.colors.textFaint, fontWeight: 600 }}>
                      {new Date(b.created_at).toLocaleString()}
                    </span>

                    <select
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 20,
                        border: `1.5px solid ${theme.colors.border}`,
                        fontFamily: theme.fontFamily,
                        fontSize: 11,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.text,
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ fontSize: 13, fontWeight: 600, color: "#24352b", lineHeight: 1.5 }}>
                    📍 {b.pickup_name}<br />
                    🏁 {b.drop_name}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8, fontSize: 11.5, color: theme.colors.textMuted, fontWeight: 600 }}>
                    <span>{b.trip_type}</span>
                    <span>•</span>
                    <span>{b.one_way_distance_km ? `${b.one_way_distance_km} km` : ""}</span>
                    <span>•</span>
                    <span>{b.travel_date} {b.pickup_time}</span>
                    <span>•</span>
                    <span>{b.vehicle_type}</span>
                    <span>•</span>
                    <span>₹{b.fare}</span>
                    <span>•</span>
                    <span>{b.payment_method}</span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: "#45564c", fontWeight: 700 }}>
                    {b.passenger_name} • {b.phone}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </main>
  );
            }
