"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { ADMIN_EMAILS } from "../lib/admin";

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

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
      prev.map((b) =>
        b.id === id ? { ...b, status: newStatus } : b
      )
    );

    await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (checking) {
    return (
      <main className="page loadingState">
        <div className="spinnerBox" />
        <style jsx>{`
          .loadingState {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5faf6;
          }
          .spinnerBox {
            width: 34px;
            height: 34px;
            border: 3px solid rgba(8,120,63,0.18);
            border-top-color: #0a7d42;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="page emptyState">
        <div className="emptyCard">
          <h1>Not authorized</h1>
          <p>This account doesn't have admin access.</p>
          <Link href="/" className="emptyButton">Back to home</Link>
        </div>
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .emptyState {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5faf6;
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 24px;
          }
          .emptyCard {
            max-width: 380px;
            text-align: center;
            padding: 32px 26px;
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 20px 60px rgba(10,40,25,0.10);
          }
          .emptyCard h1 { margin: 0 0 8px; font-size: 19px; font-weight: 800; }
          .emptyCard p { margin: 0 0 20px; color: #6b7a72; font-size: 13px; }
          .emptyButton {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 12px;
            background: #0a7d42;
            color: #fff;
            text-decoration: none;
            font-weight: 700;
            font-size: 13.5px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="page">

      <header className="header">
        <div className="headerInner">
          <Link href="/" className="brand">
            <div className="brandMark">V</div>
            <div className="brandName">VOYNU Admin</div>
          </Link>
          <button className="logoutButton" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className="content">

        <h1 className="pageTitle">Bookings ({bookings.length})</h1>

        {error && <div className="errorBox">{error}</div>}

        {loadingBookings ? (
          <div className="loadingText">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="loadingText">No bookings yet.</div>
        ) : (

          <div className="bookingList">

            {bookings.map((b) => (

              <div key={b.id} className="bookingCard">

                <div className="bookingHeader">
                  <span className="bookingDate">
                    {new Date(b.created_at).toLocaleString()}
                  </span>
                  <select
                    value={b.status}
                    onChange={(e) =>
                      handleStatusChange(b.id, e.target.value)
                    }
                    className={`statusSelect status-${b.status}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="bookingRoute">
                  <div>📍 {b.pickup_name}</div>
                  <div>🏁 {b.drop_name}</div>
                </div>

                <div className="bookingMeta">
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

                <div className="bookingPassenger">
                  {b.passenger_name} • {b.phone}
                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .page {
          min-height: 100vh;
          background: #f5faf6;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: #16241d;
        }

        .header {
          background: #fff;
          border-bottom: 1px solid #e8eee9;
        }

        .headerInner {
          width: min(900px, calc(100% - 32px));
          margin: 0 auto;
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
        }

        .brandMark {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #fff;
          font-weight: 800;
        }

        .brandName {
          color: #0a7d42;
          font-weight: 800;
          font-size: 15px;
        }

        .logoutButton {
          padding: 8px 16px;
          border-radius: 10px;
          border: 1.5px solid #e5ede8;
          background: #fff;
          color: #45564c;
          font-family: inherit;
          font-weight: 700;
          font-size: 12.5px;
          cursor: pointer;
        }

        .content {
          width: min(900px, calc(100% - 32px));
          margin: 0 auto;
          padding: 24px 0 60px;
        }

        .pageTitle {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 16px;
        }

        .errorBox {
          padding: 12px 14px;
          border-radius: 10px;
          background: #fff5f3;
          color: #b33d34;
          font-size: 12.5px;
          margin-bottom: 14px;
        }

        .loadingText {
          color: #6b7a72;
          font-size: 13px;
        }

        .bookingList {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bookingCard {
          padding: 16px 18px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e5ede8;
        }

        .bookingHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .bookingDate {
          font-size: 11px;
          color: #8a9790;
          font-weight: 600;
        }

        .statusSelect {
          padding: 5px 10px;
          border-radius: 20px;
          border: 1.5px solid #e5ede8;
          font-family: inherit;
          font-size: 11px;
          font-weight: 700;
          background: #f4f6f4;
          color: #45564c;
        }

        .status-pending { background: #fdf3dc; color: #7a5a10; }
        .status-confirmed { background: #eaf6ee; color: #0a7d42; }
        .status-completed { background: #e5ede8; color: #45564c; }
        .status-cancelled { background: #fbe4e0; color: #c64a3f; }

        .bookingRoute {
          font-size: 13px;
          font-weight: 600;
          color: #24352b;
          line-height: 1.5;
        }

        .bookingMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
          margin-top: 8px;
          font-size: 11.5px;
          color: #6b7a72;
          font-weight: 600;
        }

        .bookingPassenger {
          margin-top: 6px;
          font-size: 12px;
          color: #45564c;
          font-weight: 700;
        }

      `}</style>

    </main>
  );
                    }
