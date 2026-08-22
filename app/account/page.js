"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../lib/supabaseClient";
import { buildWhatsAppLink } from "../lib/contact";

function IconLogout({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

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

  const upcoming = bookings.filter(
    (b) => b.travel_date >= today
  );

  const past = bookings.filter(
    (b) => b.travel_date < today
  );

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

  const renderBookingCard = (b) => (
    <div key={b.id} className="bookingCard">

      <div className="bookingRoute">
        <div>📍 {b.pickup_name}</div>
        <div>🏁 {b.drop_name}</div>
      </div>

      <div className="bookingMeta">
        <span>{b.trip_type === "roundtrip" ? "Round Trip" : "One Way"}</span>
        <span>•</span>
        <span>{b.travel_date} {b.pickup_time}</span>
        <span>•</span>
        <span>{b.vehicle_type}</span>
        <span>•</span>
        <span>₹{b.fare}</span>
      </div>

      <div className={`statusBadge status-${b.status}`}>
        {b.status}
      </div>

    </div>
  );

  return (
    <main className="page">

      <header className="header">
        <div className="headerInner">
          <Link href="/" className="brand">
            <div className="brandMark">V</div>
            <div className="brandName">VOYNU</div>
          </Link>
          <button className="logoutButton" onClick={handleLogout}>
            <IconLogout size={13} />
            Log out
          </button>
        </div>
      </header>

      <div className="content">

        <div className="profileCard">
          <div className="profileAvatar">
            {(user?.user_metadata?.full_name || user?.email || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <div className="profileName">
              {user?.user_metadata?.full_name || "VOYNU Customer"}
            </div>
            <div className="profileEmail">{user?.email}</div>
          </div>
        </div>

        <h2 className="sectionHeading">Upcoming journeys</h2>

        {loadingBookings ? (
          <div className="emptyText">Loading...</div>
        ) : upcoming.length === 0 ? (
          <div className="emptyText">No upcoming bookings.</div>
        ) : (
          <div className="bookingList">
            {upcoming.map(renderBookingCard)}
          </div>
        )}

        <h2 className="sectionHeading">Past journeys</h2>

        {loadingBookings ? (
          <div className="emptyText">Loading...</div>
        ) : past.length === 0 ? (
          <div className="emptyText">No past bookings yet.</div>
        ) : (
          <div className="bookingList">
            {past.map(renderBookingCard)}
          </div>
        )}

        <a
          href={buildWhatsAppLink(
            "Hi VOYNU, I need help with my account/booking."
          )}
          className="helpLink"
          target="_blank"
          rel="noopener noreferrer"
        >
          Need help? Chat with us on WhatsApp
        </a>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .page {
          min-height: 100vh;
          background: #f5faf6;
          color: #16241d;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .header {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e8eee9;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .headerInner {
          width: min(720px, calc(100% - 32px));
          margin: 0 auto;
          min-height: 66px;
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
          font-size: 16px;
        }

        .logoutButton {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          border: 1.5px solid #e5ede8;
          background: #fff;
          color: #45564c;
          font-family: inherit;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
        }

        .content {
          width: min(680px, calc(100% - 32px));
          margin: 0 auto;
          padding: 24px 0 60px;
        }

        .profileCard {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid #e5ede8;
          box-shadow: 0 12px 30px rgba(10,40,25,0.06);
        }

        .profileAvatar {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, #0a7d42, #075c31);
          color: #fff;
          font-weight: 800;
          font-size: 18px;
        }

        .profileName {
          font-size: 15px;
          font-weight: 800;
        }

        .profileEmail {
          margin-top: 2px;
          font-size: 12px;
          color: #7a8981;
        }

        .sectionHeading {
          margin: 24px 0 12px;
          font-size: 15px;
          font-weight: 800;
        }

        .emptyText {
          color: #8a9790;
          font-size: 13px;
        }

        .bookingList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bookingCard {
          padding: 15px 16px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid #e5ede8;
          position: relative;
        }

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

        .statusBadge {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status-pending { background: #fdf3dc; color: #7a5a10; }
        .status-confirmed { background: #eaf6ee; color: #0a7d42; }
        .status-completed { background: #e5ede8; color: #45564c; }
        .status-cancelled { background: #fbe4e0; color: #c64a3f; }

        .helpLink {
          display: block;
          margin-top: 26px;
          text-align: center;
          color: #0a7d42;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
        }

      `}</style>

    </main>
  );
}
