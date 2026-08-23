"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../lib/theme";

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

const STATUS_FILTERS = ["all", ...STATUS_OPTIONS];

function IconLogout({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function shortLocationName(fullAddress) {
  if (!fullAddress) return "—";
  const firstSegment = fullAddress.split(",")[0].trim();
  return firstSegment || fullAddress;
}

function shortBookingId(id) {
  if (!id) return "";
  return id.slice(0, 8).toUpperCase();
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

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (statusFilter !== "all") {
      list = list.filter((b) => b.status === statusFilter);
    }

    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((b) => {
        return (
          (b.passenger_name || "").toLowerCase().includes(q) ||
          (b.phone || "").includes(q) ||
          (b.pickup_name || "").toLowerCase().includes(q) ||
          (b.drop_name || "").toLowerCase().includes(q) ||
          shortBookingId(b.id).toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [bookings, statusFilter, search]);

  const stats = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const completed = bookings.filter((b) => b.status === "completed").length;

    const revenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + (Number(b.fare) || 0), 0);

    return { total: bookings.length, pending, confirmed, completed, revenue };
  }, [bookings]);

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
    <main style={{
      minHeight: "100vh",
      background: "#f4f6f5",
      fontFamily: "ui-monospace, 'SF Mono', 'Roboto Mono', monospace",
      color: theme.colors.text,
    }}>

      <div style={{
        background: "#16241d",
        color: "#ffffff",
      }}>
        <div style={{
          width: `min(${theme.maxWidth.wide}px, calc(100% - 28px))`,
          margin: "0 auto",
          minHeight: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 7,
              background: theme.gradients.primary,
              fontWeight: 800,
              fontSize: 13,
              fontFamily: theme.fontFamily,
            }}>
              V
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.5, fontFamily: theme.fontFamily }}>
              VOYNU ADMIN
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "transparent",
              color: "#ffffff",
              fontFamily: "ui-monospace, monospace",
              fontWeight: 600,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            <IconLogout size={12} />
            LOGOUT
          </button>
        </div>
      </div>

      <div style={{ width: `min(${theme.maxWidth.wide}px, calc(100% - 28px))`, margin: "0 auto", padding: "18px 0 60px" }}>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 8,
          marginBottom: 18,
        }}>
          <StatBox label="TOTAL" value={stats.total} />
          <StatBox label="PENDING" value={stats.pending} accent={theme.colors.warning} />
          <StatBox label="CONFIRMED" value={stats.confirmed} accent={theme.colors.primary} />
          <StatBox label="COMPLETED" value={stats.completed} accent="#45564c" />
          <StatBox label="REVENUE" value={`₹${stats.revenue}`} accent={theme.colors.primary} />
        </div>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
          alignItems: "center",
        }}>

          <input
            type="text"
            placeholder="search: id / name / phone / location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: "1 1 220px",
              minWidth: 0,
              height: 34,
              padding: "0 10px",
              border: "1px solid #d9e0dc",
              borderRadius: 6,
              background: "#ffffff",
              fontFamily: "ui-monospace, monospace",
              fontSize: 11.5,
              outline: "none",
            }}
          />

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: `1px solid ${statusFilter === s ? theme.colors.primary : "#d9e0dc"}`,
                  background: statusFilter === s ? theme.colors.primary : "#ffffff",
                  color: statusFilter === s ? "#ffffff" : "#45564c",
                  fontFamily: "ui-monospace, monospace",
                  fontWeight: 700,
                  fontSize: 10.5,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>

        </div>

        {error && (
          <div style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: theme.colors.errorBg,
            color: theme.colors.error,
            fontSize: 11.5,
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {loadingBookings ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>loading...</p>
        ) : filteredBookings.length === 0 ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>no matching bookings.</p>
        ) : (

          <div style={{
            border: "1px solid #d9e0dc",
            borderRadius: 8,
            overflow: "hidden",
            background: "#ffffff",
          }}>

            {/* header row - desktop only */}
            <div className="adminTableHeader" style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr 1fr 90px 110px 130px 70px 90px 120px",
              gap: 8,
              padding: "8px 12px",
              background: "#eef1ef",
              fontSize: 10,
              fontWeight: 700,
              color: "#6b7a72",
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}>
              <span>ID</span>
              <span>Pickup</span>
              <span>Drop</span>
              <span>Type</span>
              <span>Date/Time</span>
              <span>Customer</span>
              <span>Fare</span>
              <span>Pay</span>
              <span>Status</span>
            </div>

            {filteredBookings.map((b, i) => {
              const status = statusColors[b.status] || statusColors.pending;

              return (
                <div
                  key={b.id}
                  className="adminRow"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 1fr 90px 110px 130px 70px 90px 120px",
                    gap: 8,
                    padding: "10px 12px",
                    borderTop: i === 0 ? "none" : "1px solid #eef1ef",
                    fontSize: 11.5,
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "#8a9790", fontWeight: 700 }}>
                    {shortBookingId(b.id)}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.pickup_name}>
                    {shortLocationName(b.pickup_name)}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={b.drop_name}>
                    {shortLocationName(b.drop_name)}
                  </span>
                  <span>
                    {b.trip_type === "roundtrip" ? "RT" : "OW"} · {b.vehicle_type?.slice(0, 3).toUpperCase()}
                  </span>
                  <span>{b.travel_date} {b.pickup_time}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.passenger_name}<br />
                    <span style={{ color: "#8a9790" }}>{b.phone}</span>
                  </span>
                  <span style={{ fontWeight: 700, color: theme.colors.primary }}>
                    ₹{b.fare}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#6b7a72" }}>
                    {b.payment_method}
                  </span>
                  <select
                    value={b.status}
                    onChange={(e) => handleStatusChange(b.id, e.target.value)}
                    style={{
                      padding: "4px 6px",
                      borderRadius: 5,
                      border: "1px solid #d9e0dc",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 10.5,
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
              );
            })}

          </div>

        )}

      </div>

      <style jsx>{`

        @media (max-width: 900px) {

          .adminTableHeader {
            display: none !important;
          }

          .adminRow {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 4px !important;
            padding: 12px !important;
          }

          .adminRow > span:nth-child(1)::before { content: "ID: "; color: #8a9790; }
          .adminRow > span:nth-child(2)::before { content: "From: "; color: #8a9790; }
          .adminRow > span:nth-child(3)::before { content: "To: "; color: #8a9790; }
          .adminRow > span:nth-child(4)::before { content: "Type: "; color: #8a9790; }
          .adminRow > span:nth-child(5)::before { content: "When: "; color: #8a9790; }
          .adminRow > span:nth-child(7)::before { content: "Fare: "; color: #8a9790; }
          .adminRow > span:nth-child(8)::before { content: "Pay: "; color: #8a9790; }

          .adminRow > span {
            white-space: normal !important;
            overflow: visible !important;
          }

        }

      `}</style>

    </main>
  );
}

function StatBox({ label, value, accent = theme.colors.text }) {
  return (
    <div style={{
      padding: "10px 12px",
      borderRadius: 8,
      background: "#ffffff",
      border: "1px solid #d9e0dc",
    }}>
      <div style={{ fontSize: 9.5, color: "#8a9790", fontWeight: 700, letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
                }
