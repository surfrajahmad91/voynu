"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  calculateAllFares,
} from "../lib/fareRules";

import {
  WHATSAPP_NUMBER,
  buildWhatsAppLink,
} from "../lib/contact";

import { supabase } from "../lib/supabaseClient";
import AccountLink from "../components/AccountLink";

/*
 * Replace with your real UPI VPA.
 */
const VOYNU_UPI_VPA = "voynu@upi";

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconWhatsApp({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2a8.1 8.1 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1s-.7.8-.9 1c-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4a.5.5 0 0 0 0-.5c-.1-.1-.6-1.5-.9-2-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3c0 1.3 1 2.6 1.1 2.8.1.2 2 3.1 4.9 4.3a16 16 0 0 0 1.6.6 3.9 3.9 0 0 0 1.8.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
    </svg>
  );
}

function IconUsers({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 8.5a3 3 0 1 1 3.6 2.9" />
      <path d="M17.5 14.6c2.6.3 4 2 4 5.4" />
    </svg>
  );
}

function IconCash({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconUpi({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export default function CabSelectionPage() {
  const router = useRouter();

  const [booking, setBooking] =
    useState(null);

  const [loaded, setLoaded] =
    useState(false);

  const [selectedVehicleId, setSelectedVehicleId] =
    useState(null);

  const [paymentMethod, setPaymentMethod] =
    useState("cash");

  const [upiPayClicked, setUpiPayClicked] =
    useState(false);

  const [upiPaymentConfirmed, setUpiPaymentConfirmed] =
    useState(false);

  const [isConfirming, setIsConfirming] =
    useState(false);

  /*
   * ------------------------------------------------------------
   * LOAD BOOKING FROM SESSION STORAGE
   * ------------------------------------------------------------
   */

  useEffect(() => {
    try {
      const raw =
        sessionStorage.getItem(
          "voynu_booking"
        );

      if (raw) {
        setBooking(
          JSON.parse(raw)
        );
      }
    } catch (error) {
      console.error(
        "VOYNU: unable to read booking data:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  /*
   * ------------------------------------------------------------
   * NO BOOKING FOUND — REDIRECT HOME
   *
   * IMPORTANT:
   *
   * If someone lands on this page directly (no booking in
   * session storage), silently send them back to the start
   * of the flow instead of showing a dead-end card.
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (loaded && !booking) {
      router.replace("/");
    }
  }, [loaded, booking, router]);

  /*
   * ------------------------------------------------------------
   * FARES
   * ------------------------------------------------------------
   */

  const fares = useMemo(() => {
    if (
      !booking ||
      !Number.isFinite(
        Number(
          booking?.journey
            ?.oneWayDistanceKm
        )
      )
    ) {
      return [];
    }

    return calculateAllFares({
      oneWayDistanceKm:
        booking.journey
          .oneWayDistanceKm,
      tripType: booking.tripType,
    });
  }, [booking]);

  useEffect(() => {
    if (
      fares.length &&
      !selectedVehicleId
    ) {
      setSelectedVehicleId(
        fares[0].vehicleTypeId
      );
    }
  }, [fares, selectedVehicleId]);

  const selectedFare =
    fares.find(
      (f) =>
        f.vehicleTypeId ===
        selectedVehicleId
    ) || null;

  /*
   * ------------------------------------------------------------
   * RESET UPI CONFIRMATION
   * ------------------------------------------------------------
   */

  useEffect(() => {
    setUpiPayClicked(false);
    setUpiPaymentConfirmed(false);
  }, [selectedVehicleId, paymentMethod]);

  /*
   * ------------------------------------------------------------
   * WHATSAPP MESSAGE
   * ------------------------------------------------------------
   */

  const buildConfirmationMessage = () => {
    if (!booking || !selectedFare) {
      return "";
    }

    const isRoundTrip =
      booking.tripType === "roundtrip";

    const paymentLine =
      paymentMethod === "upi"
        ? `UPI — customer confirmed payment sent (please verify before dispatch)`
        : "Pay on Pickup (Cash)";

    const lines = [
      "New VOYNU booking request:",
      "",
      `Trip type: ${
        isRoundTrip
          ? "Round Trip"
          : "One Way"
      }`,
      `Pickup: ${booking.pickup?.name || ""}`,
      `Drop: ${booking.drop?.name || ""}`,
      `Distance: ${
        booking.journey
          ?.oneWayDistanceText || ""
      }${
        isRoundTrip
          ? ` (round trip: ${
              booking.journey
                ?.totalDistanceText ||
              ""
            })`
          : ""
      }`,
      `Travel date: ${booking.travelDate || ""}`,
      `Pickup time: ${booking.pickupTime || ""}`,
    ];

    if (isRoundTrip) {
      lines.push(
        `Return date: ${booking.returnDate || ""}`,
        `Return time: ${booking.returnTime || ""}`
      );
    }

    lines.push(
      "",
      `Cab type: ${selectedFare.vehicleName}`,
      `Estimated fare: ₹${selectedFare.totalFare}`,
      `Payment: ${paymentLine}`,
      "",
      `Passenger: ${booking.passengerName || ""}`,
      `Phone: ${booking.phone || ""}`,
      `WhatsApp: ${booking.whatsapp || ""}`
    );

    return lines.join("\n");
  };

  const upiHref = selectedFare
    ? `upi://pay?pa=${encodeURIComponent(
        VOYNU_UPI_VPA
      )}&pn=${encodeURIComponent(
        "VOYNU"
      )}&am=${
        selectedFare.totalFare
      }&cu=INR&tn=${encodeURIComponent(
        "VOYNU Cab Booking"
      )}`
    : "";

  const canConfirm =
    paymentMethod === "cash" ||
    (paymentMethod === "upi" &&
      upiPaymentConfirmed);

  const handleUpiPayClick = () => {
    setUpiPayClicked(true);
  };

  /*
   * ------------------------------------------------------------
   * CONFIRM
   * ------------------------------------------------------------
   */

  const handleConfirm = async () => {
    if (
      !selectedFare ||
      !canConfirm ||
      isConfirming
    ) {
      return;
    }

    setIsConfirming(true);

    /*
     * --------------------------------------------------------
     * SAVE TO SUPABASE
     * --------------------------------------------------------
     */

    try {
      const { data: userData } =
        await supabase.auth.getUser();

            const { error: insertError } =
        await supabase.from("bookings").insert({
          user_id: userData?.user?.id || null,

          trip_type: booking.tripType,

          pickup_name: booking.pickup?.name,
          pickup_lat: booking.pickup?.lat,
          pickup_lon: booking.pickup?.lon,

          drop_name: booking.drop?.name,
          drop_lat: booking.drop?.lat,
          drop_lon: booking.drop?.lon,

          one_way_distance_km:
            booking.journey?.oneWayDistanceKm,
          total_distance_km:
            booking.journey?.totalDistanceKm,

          travel_date: booking.travelDate,
          pickup_time: booking.pickupTime,
          return_date: booking.returnDate,
          return_time: booking.returnTime,

          passenger_name: booking.passengerName,
          phone: booking.phone,
          whatsapp: booking.whatsapp,

          vehicle_type: selectedFare.vehicleName,
          fare: selectedFare.totalFare,
          payment_method: paymentMethod,

          status: "pending",
          confirmed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error(
          "VOYNU: unable to save booking to database:",
          insertError
        );
      }
    } catch (dbError) {
      console.error(
        "VOYNU: unable to save booking to database:",
        dbError
      );
      /*
       * Non-fatal — the WhatsApp confirmation still proceeds
       * even if the database write fails.
       */
    }
    /*
     * --------------------------------------------------------
     * SAVE FOR THE CONFIRMATION PAGE
     * --------------------------------------------------------
     */

    const confirmedBooking = {
      ...booking,
      selectedFare,
      paymentMethod,
      confirmedAt:
        new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(
        "voynu_confirmed_booking",
        JSON.stringify(
          confirmedBooking
        )
      );
    } catch (error) {
      console.error(
        "VOYNU: unable to save confirmed booking:",
        error
      );
    }

    /*
     * --------------------------------------------------------
     * CLEAR THE ORIGINAL BOOKING
     *
     * IMPORTANT:
     *
     * Once confirmed, this booking must not still be "live" and
     * re-submittable. Clearing it here means that if someone
     * somehow lands back on this page (bookmark, forward button,
     * etc.), the "no booking found" check below correctly
     * redirects them home instead of showing a stale,
     * re-confirmable screen.
     * --------------------------------------------------------
     */

    try {
      sessionStorage.removeItem("voynu_booking");
    } catch (error) {
      console.error(
        "VOYNU: unable to clear booking data:",
        error
      );
    }

    /*
     * --------------------------------------------------------
     * WHATSAPP + NAVIGATE
     *
     * router.replace (not push) swaps this page out of the
     * browser history entirely, so pressing "back" from the
     * confirmation page goes straight to the home page —
     * this cab-selection screen is never reachable again.
     * --------------------------------------------------------
     */

    window.open(
      buildWhatsAppLink(
        buildConfirmationMessage()
      ),
      "_blank"
    );

    router.replace("/booking-confirmed");
  };
  /*
   * ------------------------------------------------------------
   * NO BOOKING — REDIRECTING (nothing to render)
   * ------------------------------------------------------------
   */

  if (loaded && !booking) {
    return null;
  }

  /*
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   */

  if (!loaded || !booking) {
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

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

        `}</style>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * MAIN UI
   * ------------------------------------------------------------
   */

  return (
    <main className="page">

      <header className="header">

        <div className="headerInner">

          <Link href="/" className="brand">
            <div className="brandMark">V</div>
            <div>
              <div className="brandName">VOYNU</div>
              <div className="brandTagline">Travel safe. Travel smart.</div>
            </div>
          </Link>

          <div className="headerActions">

            <AccountLink />

            <a
              href={buildWhatsAppLink(
                "Hi VOYNU, I have a question about my booking."
              )}
              className="headerWhatsapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with us on WhatsApp"
            >
              <IconWhatsApp size={15} />
              <span>Chat with us</span>
            </a>

          </div>

        </div>

      </header>

      <div className="content">

        <div className="summaryCard">

          <div className="summaryRoute">

            <div className="routeDot routeDotPickup" />
            <div className="routeText">{booking.pickup?.name}</div>

          </div>

          <div className="routeLine" />

          <div className="summaryRoute">

            <div className="routeDot routeDotDrop" />
            <div className="routeText">{booking.drop?.name}</div>

          </div>

          <div className="summaryMeta">

            <span>
              {booking.tripType === "roundtrip" ? "Round Trip" : "One Way"}
            </span>

            <span>•</span>

            <span>
              {booking.journey?.oneWayDistanceText}
            </span>

            <span>•</span>

            <span>
              {booking.travelDate} at {booking.pickupTime}
            </span>

          </div>

        </div>

        <h2 className="sectionHeading">Choose your ride</h2>

        <div className="cabList">

          {fares.map((fare) => (

            <button
              key={fare.vehicleTypeId}
              type="button"
              className={
                selectedVehicleId === fare.vehicleTypeId
                  ? "cabCard active"
                  : "cabCard"
              }
              onClick={() =>
                setSelectedVehicleId(fare.vehicleTypeId)
              }
            >

              <div className="cabCardLeft">

                <div className="cabName">{fare.vehicleName}</div>

                <div className="cabMeta">
                  <IconUsers size={12} />
                  <span>{fare.capacity} seats</span>
                  <span className="cabDot">•</span>
                  <span>{fare.description}</span>
                </div>

              </div>

              <div className="cabCardRight">

                <div className="cabPrice">₹{fare.totalFare}</div>

                <div className={
                  selectedVehicleId === fare.vehicleTypeId
                    ? "cabRadio cabRadioActive"
                    : "cabRadio"
                }>
                  {selectedVehicleId === fare.vehicleTypeId && (
                    <IconCheck size={11} />
                  )}
                </div>

              </div>

            </button>

          ))}

        </div>

        <h2 className="sectionHeading">Payment</h2>

        <div className="paymentGrid">

          <button
            type="button"
            className={
              paymentMethod === "cash"
                ? "paymentCard active"
                : "paymentCard"
            }
            onClick={() => setPaymentMethod("cash")}
          >
            <IconCash size={16} />
            <span>Pay on Pickup</span>
          </button>

          <button
            type="button"
            className={
              paymentMethod === "upi"
                ? "paymentCard active"
                : "paymentCard"
            }
            onClick={() => setPaymentMethod("upi")}
          >
            <IconUpi size={16} />
            <span>UPI</span>
          </button>

        </div>

        {paymentMethod === "upi" && selectedFare && (

          <div className="upiFlow">

            {!upiPaymentConfirmed && (

              <a
                href={upiHref}
                className="upiPayButton"
                onClick={handleUpiPayClick}
              >
                <IconUpi size={17} />
                <span>Pay ₹{selectedFare.totalFare} via UPI app</span>
              </a>

            )}

            {upiPayClicked && !upiPaymentConfirmed && (

              <div className="upiConfirmRow">

                <p>
                  Completed the payment in your
                  UPI app?
                </p>

                <div className="upiConfirmActions">

                  <button
                    type="button"
                    className="upiConfirmYes"
                    onClick={() =>
                      setUpiPaymentConfirmed(true)
                    }
                  >
                    <IconCheck size={12} />
                    Yes, I've paid
                  </button>

                  <button
                    type="button"
                    className="upiConfirmRetry"
                    onClick={() =>
                      setUpiPayClicked(false)
                    }
                  >
                    Didn't pay yet
                  </button>

                </div>

              </div>

            )}

            {upiPaymentConfirmed && (

              <div className="upiConfirmedChip">
                <IconCheck size={13} />
                <span>Payment marked as completed</span>
              </div>

            )}

          </div>

        )}

        {selectedFare && (

          <div className="fareBreakdown">

            <div className="fareRow">
              <span>Base fare</span>
              <span>₹{selectedFare.baseFare}</span>
            </div>

            <div className="fareRow">
              <span>Distance ({selectedFare.billedDistanceKm.toFixed(1)} km)</span>
              <span>₹{selectedFare.distanceFare}</span>
            </div>

            {selectedFare.driverAllowance > 0 && (
              <div className="fareRow">
                <span>Driver allowance</span>
                <span>₹{selectedFare.driverAllowance}</span>
              </div>
            )}

            <div className="fareRow fareRowTotal">
              <span>Total</span>
              <span>₹{selectedFare.totalFare}</span>
            </div>

          </div>

        )}

        {canConfirm && (

          <button
            type="button"
            className="confirmButton"
            onClick={handleConfirm}
            disabled={!selectedFare || isConfirming}
          >
            <IconWhatsApp size={18} />
            <span>
              {isConfirming
                ? "Confirming..."
                : "Confirm on WhatsApp"}
            </span>
          </button>

        )}

        {!canConfirm &&
          paymentMethod === "upi" && (

            <p className="upiHint">
              Complete your UPI payment above to
              continue to WhatsApp confirmation.
            </p>

          )}

        <p className="disclaimer">
          Fares shown are estimates. Final fare is
          confirmed by our team on WhatsApp before
          your ride is dispatched.
        </p>

      </div>

      <style jsx>{`

        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;

          background: #f5faf6;
          color: #16241d;

          font-family:
            'Plus Jakarta Sans',
            -apple-system,
            sans-serif;
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

          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          display: flex;
          align-items: center;

          gap: 10px;

          text-decoration: none;
        }

        .brandMark {
          width: 36px;
          height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          font-weight: 800;
          font-size: 17px;

          box-shadow: 0 6px 14px rgba(8,120,63,0.24);
        }

        .brandName {
          color: #0a7d42;

          font-weight: 800;
          font-size: 17px;

          line-height: 1;
        }

        .brandTagline {
          margin-top: 3px;

          color: #7a8981;

          font-size: 8.5px;
        }

        .headerActions {
          display: flex;
          align-items: center;

          gap: 8px;
        }

        .headerWhatsapp {
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 9px 15px;

          border-radius: 30px;

          background: #1fa855;
          color: #ffffff;

          text-decoration: none;

          font-size: 12.5px;
          font-weight: 700;

          box-shadow: 0 6px 16px rgba(31,168,85,0.25);
        }

        .content {
          width: min(720px, calc(100% - 32px));

          margin: 0 auto;

          padding: 24px 0 60px;
        }

        .summaryCard {
          padding: 20px;

          border-radius: 18px;

          background: #ffffff;

          border: 1px solid #e5ede8;

          box-shadow: 0 12px 30px rgba(10,40,25,0.06);
        }

        .summaryRoute {
          display: flex;
          align-items: flex-start;

          gap: 11px;
        }

        .routeDot {
          width: 10px;
          height: 10px;

          margin-top: 4px;

          border-radius: 50%;

          flex-shrink: 0;
        }

        .routeDotPickup {
          background: #0a7d42;
        }

        .routeDotDrop {
          background: #c8622a;
        }

        .routeLine {
          width: 1.5px;
          height: 16px;

          margin-left: 4.25px;

          background: #dbe6df;
        }

        .routeText {
          font-size: 13.5px;
          font-weight: 600;

          color: #24352b;

          line-height: 1.4;
        }

        .summaryMeta {
          display: flex;
          flex-wrap: wrap;

          gap: 6px;

          margin-top: 14px;

          padding-top: 14px;

          border-top: 1px dashed #e5ede8;

          color: #6b7a72;

          font-size: 12px;
          font-weight: 600;
        }

        .sectionHeading {
          margin: 26px 0 12px;

          font-size: 15px;
          font-weight: 800;

          color: #16241d;
        }

        .cabList {
          display: flex;
          flex-direction: column;

          gap: 10px;
        }

        .cabCard {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 15px 16px;

          border-radius: 16px;

          border: 1.5px solid #e5ede8;

          background: #ffffff;

          cursor: pointer;

          text-align: left;

          font-family: inherit;

          transition: border-color .15s ease, background .15s ease;
        }

        .cabCard.active {
          border-color: #0a7d42;

          background: #f4fbf6;
        }

        .cabName {
          font-size: 14.5px;
          font-weight: 800;

          color: #16241d;
        }

        .cabMeta {
          display: flex;
          align-items: center;

          gap: 5px;

          margin-top: 4px;

          color: #7a8981;

          font-size: 11.5px;
          font-weight: 600;
        }

        .cabDot {
          opacity: .5;
        }

        .cabCardRight {
          display: flex;
          align-items: center;

          gap: 12px;
        }

        .cabPrice {
          font-size: 16px;
          font-weight: 800;

          color: #0a7d42;
        }

        .cabRadio {
          width: 22px;
          height: 22px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          border: 1.5px solid #cbd9d0;

          color: #ffffff;
        }

        .cabRadioActive {
          background: #0a7d42;
          border-color: #0a7d42;
        }

        .paymentGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;

          gap: 10px;
        }

        .paymentCard {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 8px;

          min-height: 50px;

          border-radius: 13px;

          border: 1.5px solid #e5ede8;

          background: #ffffff;

          color: #45564c;

          cursor: pointer;

          font-family: inherit;

          font-weight: 700;
          font-size: 13px;
        }

        .paymentCard.active {
          border-color: #0a7d42;

          background: #f4fbf6;

          color: #0a7d42;
        }

        .upiFlow {
          margin-top: 12px;
        }

        .upiPayButton {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          width: 100%;
          min-height: 52px;

          border-radius: 13px;

          background: linear-gradient(135deg, #0a7d42, #075c31);

          color: #ffffff;

          text-decoration: none;

          font-weight: 800;
          font-size: 14px;

          box-shadow: 0 10px 22px rgba(8,120,63,.24);
        }

        .upiConfirmRow {
          margin-top: 12px;

          padding: 14px 15px;

          border-radius: 13px;

          background: #fdf3dc;

          border: 1px solid #f0dfa8;
        }

        .upiConfirmRow p {
          margin: 0 0 10px;

          color: #7a5a10;

          font-size: 12.5px;
          font-weight: 700;
        }

        .upiConfirmActions {
          display: flex;

          gap: 8px;
        }

        .upiConfirmYes {
          display: flex;
          align-items: center;
          justify-content: center;

          gap: 6px;

          flex: 1;

          min-height: 42px;

          border: 0;
          border-radius: 10px;

          background: #0a7d42;

          color: #ffffff;

          font-family: inherit;

          font-weight: 700;
          font-size: 12.5px;

          cursor: pointer;
        }

        .upiConfirmRetry {
          flex: 1;

          min-height: 42px;

          border: 1.5px solid #e3d1a0;
          border-radius: 10px;

          background: transparent;

          color: #7a5a10;

          font-family: inherit;

          font-weight: 700;
          font-size: 12.5px;

          cursor: pointer;
        }

        .upiConfirmedChip {
          display: flex;
          align-items: center;

          gap: 8px;

          margin-top: 12px;

          padding: 12px 14px;

          border-radius: 12px;

          background: #eef9f1;

          border: 1px solid #cce5d4;

          color: #28734b;

          font-weight: 700;
          font-size: 12.5px;
        }

        .upiHint {
          margin-top: 16px;

          padding: 12px 14px;

          border-radius: 12px;

          background: #f4f6f4;

          color: #6b7a72;

          font-size: 12px;
          font-weight: 600;

          text-align: center;
        }

        .fareBreakdown {
          margin-top: 22px;

          padding: 16px 18px;

          border-radius: 16px;

          background: #ffffff;

          border: 1px solid #e5ede8;
        }

        .fareRow {
          display: flex;
          justify-content: space-between;

          padding: 6px 0;

          color: #5c6d64;

          font-size: 13px;
          font-weight: 600;
        }

        .fareRowTotal {
          margin-top: 4px;

          padding-top: 10px;

          border-top: 1px dashed #e5ede8;

          color: #16241d;

          font-size: 15px;
          font-weight: 800;
        }

        .confirmButton {
          width: 100%;
          min-height: 56px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          margin-top: 20px;

          border: 0;
          border-radius: 14px;

          background: #1fa855;

          color: #ffffff;

          font-family: inherit;

          font-weight: 800;
          font-size: 14.5px;

          cursor: pointer;

          box-shadow: 0 10px 24px rgba(31,168,85,.28);
        }

        .confirmButton:disabled {
          opacity: .6;
          cursor: wait;
        }

        .disclaimer {
          margin-top: 18px;

          color: #8a9790;

          font-size: 11px;
          line-height: 1.5;

          text-align: center;
        }

      `}</style>

    </main>
  );
    }
