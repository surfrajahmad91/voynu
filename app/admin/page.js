"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";
import { theme } from "../lib/theme";

/*
 * BUSINESS RULE: these are the only valid booking_status values,
 * enforced both here (UI) and by a database CHECK constraint +
 * transition trigger (Phase 2 migration) — the database is the
 * authoritative enforcement layer, this list just drives filters.
 */
const BOOKING_STATUS_FILTERS = [
  "all",
  "pending_payment",
  "confirmed",
  "driver_assigned",
  "on_the_way",
  "arrived",
  "trip_started",
  "trip_completed",
  "cancelled",
];

const TERMINAL_STATUSES = ["trip_completed", "cancelled"];

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

function normalizeWhatsAppNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function bookingWhatsAppMessage(booking, assignedDriver) {
  const reference = `VOY-${shortBookingId(booking.id)}`;
  const tripType = booking.trip_type === "roundtrip" ? "Round Trip" : "One Way";
  const lines = [
    `Hello ${booking.passenger_name || ""},`,
    "",
    `Your VOYNU booking ${reference} is confirmed.`,
    `Trip: ${tripType}`,
    `Pickup: ${booking.pickup_name || "—"}`,
    `Destination: ${booking.drop_name || "—"}`,
    `Travel: ${booking.travel_date || "—"} ${booking.pickup_time || ""}`.trim(),
    `Vehicle: ${booking.vehicle_type || "—"}`,
    `Passengers: ${booking.passenger_count || "—"}`,
    `Fare: ₹${Number(booking.fare || 0).toLocaleString("en-IN")}`,
    `Payment: ${booking.payment_method === "upi" ? "UPI" : "Pay on Pickup"}`,
  ];

  if (assignedDriver) {
    lines.push(`Driver: ${assignedDriver.full_name}${assignedDriver.phone ? ` (${assignedDriver.phone})` : ""}`);
  }

  lines.push("", "Thank you for choosing VOYNU.");
  return lines.join("\n");
}

const bookingStatusColors = {
  pending_payment: { bg: theme.colors.warningBg, text: theme.colors.warning },
  confirmed: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  driver_assigned: { bg: "#e0edf7", text: "#2563a8" },
  on_the_way: { bg: "#e0edf7", text: "#2563a8" },
  arrived: { bg: "#e0edf7", text: "#2563a8" },
  trip_started: { bg: theme.colors.primaryTint, text: theme.colors.primary },
  trip_completed: { bg: "#e5ede8", text: "#45564c" },
  cancelled: { bg: theme.colors.errorBg, text: theme.colors.error },
};

const tabStyle = (active) => ({
  padding: "8px 14px",
  borderRadius: 6,
  border: `1px solid ${active ? theme.colors.primary : "#d9e0dc"}`,
  background: active ? theme.colors.primary : "#ffffff",
  color: active ? "#ffffff" : "#45564c",
  fontFamily: "ui-monospace, monospace",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  cursor: "pointer",
});

export default function AdminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [tab, setTab] = useState("bookings");

  const [bookings, setBookings] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [assigningBookingId, setAssigningBookingId] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const [newVehicle, setNewVehicle] = useState({
    registration_number: "",
    make: "",
    model: "",
    category: "hatchback",
    seating_capacity: 4,
    fuel_type: "petrol",
  });

  const [newDriver, setNewDriver] = useState({
    full_name: "",
    phone: "",
    email: "",
    vehicle_id: "",
  });

  /*
   * ------------------------------------------------------------
   * AUTH
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * DATA FETCHING
   * ------------------------------------------------------------
   */

  const fetchBookings = async () => {
    setLoading(true);

    const { data, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setBookings(data || []);
  };

  const fetchDrivers = async () => {
    const { data, error: fetchError } = await supabase
      .from("drivers")
      .select("*, vehicles(*)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setDrivers(data || []);
  };

  const fetchVehicles = async () => {
    const { data, error: fetchError } = await supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setVehicles(data || []);
  };

  useEffect(() => {
    if (!authorized) return;

    fetchBookings();
    fetchDrivers();
    fetchVehicles();
  }, [authorized]);

  /*
   * ------------------------------------------------------------
   * CONFIRM UPI PAYMENT
   *
   * BUSINESS RULE: a UPI booking's payment_status only moves
   * from "pending" to "paid" once admin has manually verified
   * the money actually arrived. The customer's "I've paid" tap
   * is never treated as verification on its own.
   * ------------------------------------------------------------
   */

  const handleConfirmPayment = async (booking) => {
    setNotice("");
    setError("");

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        booking_status: "confirmed",
      })
      .eq("id", booking.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? { ...b, payment_status: "paid", booking_status: "confirmed" }
          : b
      )
    );

    setNotice(
      `Payment confirmed for booking #${shortBookingId(booking.id)}.`
    );
  };

  /*
   * ------------------------------------------------------------
   * DRIVER ASSIGNMENT
   * ------------------------------------------------------------
   */

  const openAssign = (bookingId) => {
    setAssigningBookingId(bookingId);
    setSelectedDriverId("");
    setNotice("");
    setError("");
  };

  const handleAssignDriver = async (booking) => {
    if (!selectedDriverId) {
      setError("Select a driver first.");
      return;
    }

    const driver = drivers.find((d) => d.id === selectedDriverId);

    if (!driver) {
      setError("Driver not found.");
      return;
    }

    setError("");

    const { error: assignError } = await supabase
      .from("driver_assignments")
      .insert({
        booking_id: booking.id,
        driver_id: driver.id,
        vehicle_id: driver.vehicle_id,
        status: "assigned",
      });

    if (assignError) {
      setError(assignError.message);
      return;
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        driver_id: driver.id,
        vehicle_id: driver.vehicle_id,
        booking_status: "driver_assigned",
      })
      .eq("id", booking.id);

    if (bookingError) {
      setError(bookingError.message);
      return;
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              driver_id: driver.id,
              vehicle_id: driver.vehicle_id,
              booking_status: "driver_assigned",
            }
          : b
      )
    );

    setAssigningBookingId(null);
    setNotice(
      `${driver.full_name} assigned to booking #${shortBookingId(booking.id)}.`
    );
  };

  /*
   * ------------------------------------------------------------
   * CANCEL BOOKING
   *
   * BUSINESS RULE: cancelling automatically releases the driver
   * assignment (booking.driver_id/vehicle_id cleared, the
   * corresponding driver_assignments row marked cancelled) so a
   * driver never remains tied to a cancelled trip. Assignment
   * history is preserved, not deleted.
   *
   * Only non-terminal bookings can be cancelled — the database's
   * state-machine trigger enforces this too, as a second layer.
   * ------------------------------------------------------------
   */

  const handleCancelBooking = async (booking) => {
    setNotice("");
    setError("");

    if (TERMINAL_STATUSES.includes(booking.booking_status)) {
      return;
    }

    const previousDriverId = booking.driver_id;

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        booking_status: "cancelled",
        driver_id: null,
        vehicle_id: null,
      })
      .eq("id", booking.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (previousDriverId) {
      await supabase
        .from("driver_assignments")
        .update({ status: "cancelled" })
        .eq("booking_id", booking.id)
        .eq("driver_id", previousDriverId);
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? {
              ...b,
              booking_status: "cancelled",
              driver_id: null,
              vehicle_id: null,
            }
          : b
      )
    );

    setNotice(`Booking #${shortBookingId(booking.id)} cancelled.`);
  };

  const handleWhatsAppConfirmation = (booking) => {
    setNotice("");
    setError("");

    const phone = normalizeWhatsAppNumber(booking.phone);
    if (!phone) {
      setError("This booking does not have a valid WhatsApp phone number.");
      return;
    }

    const assignedDriver = drivers.find((d) => d.id === booking.driver_id);
    const message = bookingWhatsAppMessage(booking, assignedDriver);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
    setNotice(`WhatsApp confirmation prepared for booking #${shortBookingId(booking.id)}. Review it and tap Send in WhatsApp.`);
  };

  /*
   * ------------------------------------------------------------
   * ADD VEHICLE / DRIVER
   * ------------------------------------------------------------
   */

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setError("");

    if (!newVehicle.registration_number.trim()) {
      setError("Registration number is required.");
      return;
    }

    const { error: insertError } = await supabase
      .from("vehicles")
      .insert({
        registration_number: newVehicle.registration_number.trim(),
        make: newVehicle.make.trim(),
        model: newVehicle.model.trim(),
        category: newVehicle.category,
        seating_capacity: Number(newVehicle.seating_capacity) || 4,
        fuel_type: newVehicle.fuel_type,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewVehicle({
      registration_number: "",
      make: "",
      model: "",
      category: "hatchback",
      seating_capacity: 4,
      fuel_type: "petrol",
    });

    fetchVehicles();
    setNotice("Vehicle added.");
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setError("");

    if (!newDriver.full_name.trim() || !newDriver.phone.trim()) {
      setError("Driver name and phone are required.");
      return;
    }

    const { error: insertError } = await supabase
      .from("drivers")
      .insert({
        full_name: newDriver.full_name.trim(),
        phone: newDriver.phone.trim(),
        email: newDriver.email.trim() || null,
        vehicle_id: newDriver.vehicle_id || null,
        availability_status: "available",
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setNewDriver({ full_name: "", phone: "", email: "", vehicle_id: "" });
    fetchDrivers();
    setNotice("Driver added.");
  };

  const handleDriverAvailability = async (driverId, status) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId ? { ...d, availability_status: status } : d
      )
    );

    await supabase
      .from("drivers")
      .update({ availability_status: status })
      .eq("id", driverId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  /*
   * ------------------------------------------------------------
   * FILTERED BOOKINGS + STATS
   * ------------------------------------------------------------
   */

  const filteredBookings = useMemo(() => {
    let list = bookings;

    if (statusFilter !== "all") {
      list = list.filter((b) => b.booking_status === statusFilter);
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
    const pendingPayment = bookings.filter(
      (b) => b.booking_status === "pending_payment"
    ).length;

    const confirmed = bookings.filter(
      (b) => b.booking_status === "confirmed"
    ).length;

    const completed = bookings.filter(
      (b) => b.booking_status === "trip_completed"
    ).length;

    const revenue = bookings
      .filter((b) => b.booking_status === "trip_completed")
      .reduce((sum, b) => sum + (Number(b.fare) || 0), 0);

    const awaitingPayment = bookings.filter(
      (b) => b.payment_status === "pending"
    ).length;

    const awaitingAssignment = bookings.filter(
      (b) => b.booking_status === "confirmed" && !b.driver_id
    ).length;

    return {
      total: bookings.length,
      pendingPayment,
      confirmed,
      completed,
      revenue,
      awaitingPayment,
      awaitingAssignment,
    };
  }, [bookings]);

  const assignableDrivers = drivers.filter((d) => d.active);

  /*
   * ------------------------------------------------------------
   * RENDER GATES
   * ------------------------------------------------------------
   */

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

  /*
   * ------------------------------------------------------------
   * MAIN
   * ------------------------------------------------------------
   */

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f6f5",
      fontFamily: "ui-monospace, 'SF Mono', 'Roboto Mono', monospace",
      color: theme.colors.text,
    }}>

      <div style={{ background: "#16241d", color: "#ffffff" }}>
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
          marginBottom: 16,
        }}>
          <StatBox label="TOTAL" value={stats.total} />
          <StatBox label="AWAITING PAYMENT" value={stats.awaitingPayment} accent={theme.colors.warning} />
          <StatBox label="AWAITING ASSIGNMENT" value={stats.awaitingAssignment} accent="#2563a8" />
          <StatBox label="COMPLETED" value={stats.completed} accent="#45564c" />
          <StatBox label="REVENUE" value={`₹${stats.revenue}`} accent={theme.colors.primary} />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          <button style={tabStyle(tab === "bookings")} onClick={() => setTab("bookings")}>
            Bookings
          </button>
          <button style={tabStyle(tab === "drivers")} onClick={() => setTab("drivers")}>
            Drivers
          </button>
          <button style={tabStyle(tab === "vehicles")} onClick={() => setTab("vehicles")}>
            Vehicles
          </button>
        </div>

        {notice && (
          <div style={{
            padding: "10px 12px",
            borderRadius: 6,
            background: theme.colors.primaryTint,
            color: theme.colors.primary,
            fontSize: 11.5,
            marginBottom: 12,
          }}>
            {notice}
          </div>
        )}

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

        {tab === "bookings" && (
          <>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "center" }}>

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
                {BOOKING_STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={tabStyle(statusFilter === s)}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

            </div>

            {loading ? (
              <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>loading...</p>
            ) : filteredBookings.length === 0 ? (
              <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>no matching bookings.</p>
            ) : (

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredBookings.map((b) => {
                  const bStatus =
                    bookingStatusColors[b.booking_status] ||
                    bookingStatusColors.confirmed;

                  const assignedDriver = drivers.find(
                    (d) => d.id === b.driver_id
                  );

                  const needsPaymentConfirmation =
                    b.payment_method === "upi" &&
                    b.payment_status === "pending";

                  const needsAssignment =
                    b.booking_status === "confirmed" && !b.driver_id;

                  const canCancel =
                    !TERMINAL_STATUSES.includes(b.booking_status);

                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 8,
                        background: "#ffffff",
                        border: "1px solid #d9e0dc",
                        fontSize: 11.5,
                      }}
                    >

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                        <span style={{ color: "#8a9790", fontWeight: 700 }}>
                          #{shortBookingId(b.id)} · {new Date(b.created_at).toLocaleString()}
                        </span>

                        <span style={{
                          padding: "3px 8px",
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "capitalize",
                          background: bStatus.bg,
                          color: bStatus.text,
                        }}>
                          {(b.booking_status || "").replace(/_/g, " ")}
                        </span>
                      </div>

                      <div style={{ marginBottom: 6 }}>
                        {shortLocationName(b.pickup_name)} → {shortLocationName(b.drop_name)}
                        {" · "}{b.trip_type === "roundtrip" ? "RT" : "OW"}
                        {" · "}{b.travel_date} {b.pickup_time}
                        {" · "}{b.vehicle_type}
                        {" · "}₹{b.fare}
                      </div>

                      <div style={{ marginBottom: 8, color: "#6b7a72" }}>
                        {b.passenger_name} · {b.phone}
                        {" · "}{b.payment_method}
                        {" · payment: "}
                        <strong style={{ color: b.payment_status === "paid" ? theme.colors.primary : theme.colors.warning }}>
                          {b.payment_status || "—"}
                        </strong>
                        {assignedDriver && (
                          <> · driver: <strong>{assignedDriver.full_name}</strong></>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>

                        {needsPaymentConfirmation && (
                          <button
                            onClick={() => handleConfirmPayment(b)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: 0,
                              background: theme.colors.primary,
                              color: "#ffffff",
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: 10.5,
                              cursor: "pointer",
                            }}
                          >
                            Confirm payment received
                          </button>
                        )}

                        {needsAssignment && assigningBookingId !== b.id && (
                          <button
                            onClick={() => openAssign(b.id)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #2563a8",
                              background: "#e0edf7",
                              color: "#2563a8",
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: 10.5,
                              cursor: "pointer",
                            }}
                          >
                            Assign driver
                          </button>
                        )}

                        {b.phone && b.booking_status !== "cancelled" && (
                          <button
                            onClick={() => handleWhatsAppConfirmation(b)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #25D366",
                              background: "#eafaf0",
                              color: "#128C4A",
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: 10.5,
                              cursor: "pointer",
                            }}
                          >
                            Send WhatsApp confirmation
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancelBooking(b)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: `1px solid ${theme.colors.error}`,
                              background: theme.colors.errorBg,
                              color: theme.colors.error,
                              fontFamily: "ui-monospace, monospace",
                              fontWeight: 700,
                              fontSize: 10.5,
                              cursor: "pointer",
                            }}
                          >
                            Cancel booking
                          </button>
                        )}

                      </div>

                      {assigningBookingId === b.id && (
                        <div style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 6,
                          background: "#f4f6f5",
                          border: "1px solid #d9e0dc",
                        }}>
                          {assignableDrivers.length === 0 ? (
                            <p style={{ margin: 0, color: theme.colors.textFaint }}>
                              No drivers available. Add one in the Drivers tab.
                            </p>
                          ) : (
                            <>
                              <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: 5,
                                  border: "1px solid #d9e0dc",
                                  fontFamily: "ui-monospace, monospace",
                                  fontSize: 11,
                                  marginBottom: 8,
                                }}
                              >
                                <option value="">Select a driver...</option>
                                {assignableDrivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.full_name} — {d.vehicles?.registration_number || "no vehicle"} ({d.vehicles?.category || "—"}) · {d.availability_status}
                                  </option>
                                ))}
                              </select>

                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => handleAssignDriver(b)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: 0,
                                    background: theme.colors.primary,
                                    color: "#ffffff",
                                    fontFamily: "ui-monospace, monospace",
                                    fontWeight: 700,
                                    fontSize: 10.5,
                                    cursor: "pointer",
                                  }}
                                >
                                  Confirm assignment
                                </button>
                                <button
                                  onClick={() => setAssigningBookingId(null)}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: 6,
                                    border: "1px solid #d9e0dc",
                                    background: "#ffffff",
                                    color: "#45564c",
                                    fontFamily: "ui-monospace, monospace",
                                    fontWeight: 700,
                                    fontSize: 10.5,
                                    cursor: "pointer",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            )}

          </>
        )}

        {tab === "drivers" && (
          <>
            <form
              onSubmit={handleAddDriver}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #d9e0dc",
              }}
            >
              <input
                placeholder="Full name"
                value={newDriver.full_name}
                onChange={(e) => setNewDriver({ ...newDriver, full_name: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Phone"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                style={inputStyle}
              />
              <input
                type="email"
                placeholder="Login email (for driver app)"
                value={newDriver.email}
                onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                style={inputStyle}
              />
              <select
                value={newDriver.vehicle_id}
                onChange={(e) => setNewDriver({ ...newDriver, vehicle_id: e.target.value })}
                style={inputStyle}
              >
                <option value="">No vehicle yet</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} ({v.category})
                  </option>
                ))}
              </select>
              <button type="submit" style={submitButtonStyle}>
                Add driver
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drivers.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #d9e0dc",
                    fontSize: 11.5,
                  }}
                >
                  <div>
                    <strong>{d.full_name}</strong> · {d.phone}
                    {d.email && <> · {d.email}</>}
                    {d.vehicles && (
                      <> · {d.vehicles.registration_number} ({d.vehicles.category})</>
                    )}
                    {!d.user_id && (
                      <span style={{ color: theme.colors.warning }}> · no login linked yet</span>
                    )}
                  </div>

                  <select
                    value={d.availability_status}
                    onChange={(e) => handleDriverAvailability(d.id, e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 5,
                      border: "1px solid #d9e0dc",
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    <option value="available">available</option>
                    <option value="busy">busy</option>
                    <option value="offline">offline</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>
              ))}

              {drivers.length === 0 && (
                <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>No drivers yet.</p>
              )}
            </div>
          </>
        )}

        {tab === "vehicles" && (
          <>
            <form
              onSubmit={handleAddVehicle}
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                padding: 12,
                borderRadius: 8,
                background: "#ffffff",
                border: "1px solid #d9e0dc",
              }}
            >
              <input
                placeholder="Registration number"
                value={newVehicle.registration_number}
                onChange={(e) => setNewVehicle({ ...newVehicle, registration_number: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Make"
                value={newVehicle.make}
                onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                style={{ ...inputStyle, width: 110 }}
              />
              <input
                placeholder="Model"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                style={{ ...inputStyle, width: 110 }}
              />
              <select
                value={newVehicle.category}
                onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })}
                style={inputStyle}
              >
                <option value="hatchback">Hatchback</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="ev">EV</option>
              </select>
              <input
                type="number"
                placeholder="Seats"
                value={newVehicle.seating_capacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, seating_capacity: e.target.value })}
                style={{ ...inputStyle, width: 70 }}
              />
              <button type="submit" style={submitButtonStyle}>
                Add vehicle
              </button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "#ffffff",
                    border: "1px solid #d9e0dc",
                    fontSize: 11.5,
                  }}
                >
                  <strong>{v.registration_number}</strong>
                  {" · "}{v.make} {v.model}
                  {" · "}{v.category}
                  {" · "}{v.seating_capacity} seats
                </div>
              ))}

              {vehicles.length === 0 && (
                <p style={{ color: theme.colors.textFaint, fontSize: 12 }}>No vehicles yet.</p>
              )}
            </div>
          </>
        )}

      </div>

    </main>
  );
}

const inputStyle = {
  flex: "1 1 140px",
  minWidth: 0,
  height: 34,
  padding: "0 10px",
  border: "1px solid #d9e0dc",
  borderRadius: 6,
  background: "#ffffff",
  fontFamily: "ui-monospace, monospace",
  fontSize: 11.5,
  outline: "none",
};

const submitButtonStyle = {
  padding: "0 16px",
  height: 34,
  borderRadius: 6,
  border: 0,
  background: theme.colors.primary,
  color: "#ffffff",
  fontFamily: "ui-monospace, monospace",
  fontWeight: 700,
  fontSize: 11,
  cursor: "pointer",
};

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
