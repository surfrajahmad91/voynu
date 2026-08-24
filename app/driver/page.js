"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";

const NEXT_STATUS = {
  driver_assigned: { next: "on_the_way", label: "Mark: On the way" },
  on_the_way: { next: "arrived", label: "Mark: Arrived" },
  arrived: { next: "trip_started", label: "Start Trip" },
  trip_started: { next: "trip_completed", label: "Complete Trip" },
};

const statusColors = {
  driver_assigned: { bg: "#e0edf7", text: "#2563a8" },
  on_the_way: { bg: theme.colors.warningBg, text: theme.colors.warning },
  arrived: { bg: theme.colors.warningBg, text: theme.colors.warning },
  trip_started: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  trip_completed: { bg: "#e5ede8", text: "#45564c" },
};

function IconLogout({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export default function DriverPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [driver, setDriver] = useState(null);
  const [notADriver, setNotADriver] = useState(false);

  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData?.session) {
        router.push("/login");
        return;
      }

      const email = sessionData.session.user.email;

      const { data: driverRow, error: driverError } = await supabase
        .from("drivers")
        .select("*, vehicles(*)")
        .eq("email", email)
        .maybeSingle();

      if (cancelled) return;

      if (driverError || !driverRow) {
        setNotADriver(true);
        setChecking(false);
        return;
      }

      setDriver(driverRow);
      setChecking(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!driver) return;

    const fetchBookings = async () => {
      setLoadingBookings(true);

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("driver_id", driver.id)
        .order("travel_date", { ascending: true });

      setLoadingBookings(false);

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      setBookings(data || []);
    };

    fetchBookings();
  }, [driver]);

  const handleAdvanceStatus = async (booking) => {
    const step = NEXT_STATUS[booking.booking_status];
    if (!step) return;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id ? { ...b, booking_status: step.next } : b
      )
    );

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ booking_status: step.next })
      .eq("id", booking.id);

    if (updateError) {
      setError(updateError.message);
    }
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

  if (notADriver) {
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
          <h1 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800 }}>
            No driver profile found
          </h1>
          <p style={{ margin: "0 0 20px", color: theme.colors.textFaint, fontSize: 13 }}>
            This account isn't linked to a driver record. Ask your admin
            to add your login email to your driver profile.
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

  const activeTrips = bookings.filter(
    (b) => b.booking_status !== "trip_completed"
  );

  const pastTrips = bookings.filter(
    (b) => b.booking_status === "trip_completed"
  );

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, fontFamily: theme.fontFamily, color: theme.colors.text }}>

      <header style={{
        background: "rgba(255,255,255,0.92)",
        borderBottom: `1px solid ${theme.colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}>
        <div style={{
          width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`,
          margin: "0 auto",
          minHeight: 66,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: theme.gradients.primary,
              color: "#ffffff",
              fontWeight: 800,
            }}>
              V
            </div>
            <div>
              <div style={{ color: theme.colors.primary, fontWeight: 800, fontSize: 16 }}>
                VOYNU Driver
              </div>
              <div style={{ fontSize: 11, color: theme.colors.textFaint }}>
                {driver.full_name}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 20,
              border: `1.5px solid ${theme.colors.border}`,
              background: "#ffffff",
              color: "#45564c",
              fontFamily: theme.fontFamily,
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

      <div style={{ width: `min(${theme.maxWidth.content}px, calc(100% - 32px))`, margin: "0 auto", padding: "24px 0 60px" }}>

        <div style={{
          padding: 16,
          borderRadius: theme.radius.lg,
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800 }}>
            {driver.vehicles?.registration_number || "No vehicle assigned"}
          </div>
          <div style={{ fontSize: 12, color: theme.colors.textFaint, marginTop: 2 }}>
            {driver.vehicles ? `${driver.vehicles.make} ${driver.vehicles.model} · ${driver.vehicles.category}` : "—"}
          </div>
        </div>

        {error && (
          <div style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: theme.colors.errorBg,
            color: theme.colors.error,
            fontSize: 12.5,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 12px" }}>
          Your trips
        </h2>

        {loadingBookings ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>Loading...</p>
        ) : activeTrips.length === 0 ? (
          <p style={{ color: theme.colors.textFaint, fontSize: 13 }}>
            No trips assigned right now.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeTrips.map((b) => {
              const step = NEXT_STATUS[b.booking_status];
              const status =
                statusColors[b.booking_status] ||
                statusColors.driver_assigned;

              return (
                <div
                  key={b.id}
                  style={{
                    padding: "16px 18px",
                    borderRadius: theme.radius.lg,
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: theme.shadow.card,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {b.travel_date} · {b.pickup_time}
                    </span>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: 20,
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      background: status.bg,
                      color: status.text,
                    }}>
                      {(b.booking_status || "").replace(/_/g, " ")}
                    </span>
                  </div>

                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.6, marginBottom: 10 }}>
                    📍 {b.pickup_name}<br />
                    🏁 {b.drop_name}
                  </div>

                  <div style={{ fontSize: 12, color: theme.colors.textMuted, marginBottom: 12 }}>
                    Passenger: <strong>{b.passenger_name}</strong> · {b.phone}
                    <br />
                    {b.trip_type === "roundtrip" ? "Round Trip" : "One Way"} · {b.vehicle_type} · ₹{b.fare} · {b.payment_method}
                  </div>

                  {step && (
                    <button
                      onClick={() => handleAdvanceStatus(b)}
                      style={{
                        width: "100%",
                        minHeight: 46,
                        border: 0,
                        borderRadius: 12,
                        background: theme.gradients.primary,
                        color: "#ffffff",
                        fontFamily: theme.fontFamily,
                        fontWeight: 800,
                        fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      {step.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pastTrips.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: "24px 0 12px" }}>
              Completed
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pastTrips.map((b) => (
                <div
                  key={b.id}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "#ffffff",
                    border: `1px solid ${theme.colors.border}`,
                    fontSize: 12.5,
                    color: theme.colors.textMuted,
                  }}
                >
                  {b.travel_date} · {b.pickup_name} → {b.drop_name} · ₹{b.fare}
                </div>
              ))}
            </div>
          </>
        )}

      </div>

    </main>
  );
}
