"use client";

import { useMemo, useState } from "react";
import LocationPicker from "../components/LocationPicker";

export default function BookingPage() {
  const [pickup, setPickup] = useState({
    name: "",
    lat: null,
    lon: null,
  });

  const [dropoff, setDropoff] = useState({
    name: "",
    lat: null,
    lon: null,
  });

  const [tripType, setTripType] = useState("one-way");

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [passengers, setPassengers] = useState(1);

  const [instructions, setInstructions] =
    useState("");

  const [submitted, setSubmitted] =
    useState(false);

  const canContinue =
    pickup.lat !== null &&
    pickup.lon !== null &&
    dropoff.lat !== null &&
    dropoff.lon !== null &&
    date &&
    time;

  const estimatedFare = useMemo(() => {
    if (!canContinue) {
      return null;
    }

    /*
     * Temporary estimate.
     *
     * Later this will come from the
     * backend based on actual route,
     * vehicle category and supplier.
     */
    return tripType === "round-trip"
      ? 1199
      : 699;
  }, [canContinue, tripType]);

  const swapLocations = () => {
    setPickup(dropoff);
    setDropoff(pickup);
  };

  const handleContinue = (event) => {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    setSubmitted(true);

    /*
     * Later:
     *
     * 1. Calculate route
     * 2. Fetch available vehicles
     * 3. Create booking draft
     * 4. Navigate to checkout
     *
     * Example:
     *
     * router.push("/checkout");
     */
  };

  return (
    <main className="bookingPage">
      <div className="pageContainer">

        {/* ------------------------------------------------
            Header
        ------------------------------------------------ */}

        <header className="bookingHeader">
          <div>
            <span className="eyebrow">
              PLAN YOUR JOURNEY
            </span>

            <h1>
              Book your ride
            </h1>

            <p>
              Enter your journey details and
              we'll find the best available
              option for you.
            </p>
          </div>

          <div className="secureBadge">
            <span className="secureIcon">
              ✓
            </span>

            <span>
              Secure booking
            </span>
          </div>
        </header>

        {/* ------------------------------------------------
            Main grid
        ------------------------------------------------ */}

        <form
          className="bookingGrid"
          onSubmit={handleContinue}
        >

          {/* ================================================
              LEFT COLUMN
          ================================================ */}

          <section className="bookingCard">

            <div className="cardHeader">
              <div className="stepNumber">
                1
              </div>

              <div>
                <h2>
                  Journey details
                </h2>

                <p>
                  Tell us where you're going.
                </p>
              </div>
            </div>

            {/* Trip type */}

            <div className="fieldGroup">

              <label className="fieldLabel">
                Trip type
              </label>

              <div className="tripType">

                <button
                  type="button"
                  className={
                    tripType === "one-way"
                      ? "tripOption active"
                      : "tripOption"
                  }
                  onClick={() =>
                    setTripType("one-way")
                  }
                >
                  <span className="tripIcon">
                    →
                  </span>

                  <span>
                    <strong>
                      One way
                    </strong>

                    <small>
                      Travel to your destination
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    tripType === "round-trip"
                      ? "tripOption active"
                      : "tripOption"
                  }
                  onClick={() =>
                    setTripType("round-trip")
                  }
                >
                  <span className="tripIcon">
                    ⇄
                  </span>

                  <span>
                    <strong>
                      Round trip
                    </strong>

                    <small>
                      Return journey included
                    </small>
                  </span>
                </button>

              </div>
            </div>

            {/* Locations */}

            <div className="locationSection">

              <div className="locationStep">
                <div className="locationDot pickupDot" />

                <div className="locationLine" />

                <div className="locationDot dropoffDot" />
              </div>

              <div className="locationFields">

                <LocationPicker
                  label="Pickup location"
                  value={pickup.name}
                  placeholder="Search pickup location"
                  allowCurrentLocation={true}
                  onLocationSelect={
                    setPickup
                  }
                />

                <div className="swapRow">
                  <button
                    type="button"
                    className="swapButton"
                    onClick={
                      swapLocations
                    }
                    aria-label="Swap pickup and dropoff"
                  >
                    ⇅
                  </button>
                </div>

                <LocationPicker
                  label="Drop-off location"
                  value={dropoff.name}
                  placeholder="Search destination"
                  allowCurrentLocation={false}
                  onLocationSelect={
                    setDropoff
                  }
                />

              </div>
            </div>

            {/* Date + time */}

            <div className="formRow">

              <div className="fieldGroup">

                <label
                  className="fieldLabel"
                  htmlFor="booking-date"
                >
                  Travel date
                </label>

                <input
                  id="booking-date"
                  className="formInput"
                  type="date"
                  value={date}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(event) =>
                    setDate(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

              <div className="fieldGroup">

                <label
                  className="fieldLabel"
                  htmlFor="booking-time"
                >
                  Pickup time
                </label>

                <input
                  id="booking-time"
                  className="formInput"
                  type="time"
                  value={time}
                  onChange={(event) =>
                    setTime(
                      event.target.value
                    )
                  }
                  required
                />

              </div>

            </div>

            {/* Passengers */}

            <div className="fieldGroup">

              <label
                className="fieldLabel"
                htmlFor="passengers"
              >
                Passengers
              </label>

              <div className="passengerControl">

                <button
                  type="button"
                  onClick={() =>
                    setPassengers(
                      Math.max(
                        1,
                        passengers - 1
                      )
                    )
                  }
                  disabled={
                    passengers <= 1
                  }
                >
                  −
                </button>

                <div>
                  <strong>
                    {passengers}
                  </strong>

                  <span>
                    {passengers === 1
                      ? " passenger"
                      : " passengers"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPassengers(
                      Math.min(
                        12,
                        passengers + 1
                      )
                    )
                  }
                  disabled={
                    passengers >= 12
                  }
                >
                  +
                </button>

              </div>

            </div>

            {/* Instructions */}

            <div className="fieldGroup">

              <label
                className="fieldLabel"
                htmlFor="instructions"
              >
                Special instructions
                <span className="optional">
                  Optional
                </span>
              </label>

              <textarea
                id="instructions"
                className="textarea"
                rows={4}
                value={instructions}
                onChange={(event) =>
                  setInstructions(
                    event.target.value
                  )
                }
                placeholder="Anything your driver should know?"
              />

            </div>

          </section>

          {/* ================================================
              RIGHT COLUMN
          ================================================ */}

          <aside className="summaryColumn">

            <section className="summaryCard">

              <div className="summaryHeader">
                <div>
                  <span className="eyebrow">
                    BOOKING SUMMARY
                  </span>

                  <h2>
                    Your journey
                  </h2>
                </div>
              </div>

              <div className="summaryRoute">

                <div className="summaryPoint">
                  <span className="summaryDot pickupDot" />

                  <div>
                    <small>
                      PICKUP
                    </small>

                    <strong>
                      {pickup.name ||
                        "Pickup location"}
                    </strong>
                  </div>
                </div>

                <div className="routeConnector" />

                <div className="summaryPoint">
                  <span className="summaryDot dropoffDot" />

                  <div>
                    <small>
                      DROP-OFF
                    </small>

                    <strong>
                      {dropoff.name ||
                        "Destination"}
                    </strong>
                  </div>
                </div>

              </div>

              <div className="summaryDivider" />

              <div className="summaryDetails">

                <div>
                  <span>
                    Trip
                  </span>

                  <strong>
                    {tripType ===
                    "one-way"
                      ? "One way"
                      : "Round trip"}
                  </strong>
                </div>

                <div>
                  <span>
                    Date
                  </span>

                  <strong>
                    {date
                      ? formatDate(date)
                      : "Not selected"}
                  </strong>
                </div>

                <div>
                  <span>
                    Time
                  </span>

                  <strong>
                    {time ||
                      "Not selected"}
                  </strong>
                </div>

                <div>
                  <span>
                    Passengers
                  </span>

                  <strong>
                    {passengers}
                  </strong>
                </div>

              </div>

              <div className="summaryDivider" />

              <div className="fareBox">

                <div>
                  <span>
                    Estimated fare
                  </span>

                  <small>
                    Final price may vary
                    based on vehicle and
                    route.
                  </small>
                </div>

                <strong>
                  {estimatedFare
                    ? `₹${estimatedFare.toLocaleString(
                        "en-IN"
                      )}`
                    : "—"}
                </strong>

              </div>

              <button
                type="submit"
                className="continueButton"
                disabled={!canContinue}
              >
                <span>
                  Continue to vehicle selection
                </span>

                <span>
                  →
                </span>
              </button>

              {!canContinue && (
                <p className="validationText">
                  Select pickup, destination,
                  date and time to continue.
                </p>
              )}

            </section>

            {/* Benefits */}

            <section className="benefitsCard">

              <h3>
                Why book with VOYNU?
              </h3>

              <div className="benefit">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Trusted drivers
                  </strong>

                  <p>
                    Verified transportation
                    partners.
                  </p>
                </div>
              </div>

              <div className="benefit">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Transparent pricing
                  </strong>

                  <p>
                    Know your fare before
                    confirming.
                  </p>
                </div>
              </div>

              <div className="benefit">
                <span>
                  ✓
                </span>

                <div>
                  <strong>
                    Easy cancellation
                  </strong>

                  <p>
                    Flexible cancellation on
                    eligible bookings.
                  </p>
                </div>
              </div>

            </section>

          </aside>

        </form>

        {submitted && (
          <div className="successMessage">
            Booking details captured successfully.
            Vehicle selection will be connected next.
          </div>
        )}

      </div>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .bookingPage {
          min-height: 100vh;
          background: #f5f8f6;
          padding: 42px 20px 70px;
          color: #26372f;
        }

        .pageContainer {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
        }

        .bookingHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 30px;
        }

        .eyebrow {
          display: block;
          margin-bottom: 7px;
          color: #08783f;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .bookingHeader h1 {
          margin: 0;
          color: #193126;
          font-size: 36px;
          line-height: 1.15;
          letter-spacing: -0.7px;
        }

        .bookingHeader p {
          max-width: 620px;
          margin: 9px 0 0;
          color: #68776f;
          font-size: 14px;
          line-height: 1.6;
        }

        .secureBadge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid #cfe5d7;
          border-radius: 30px;
          background: #f0f8f3;
          color: #08783f;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .secureIcon {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #08783f;
          color: white;
          font-size: 11px;
        }

        .bookingGrid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.65fr)
            minmax(320px, 0.9fr);
          align-items: start;
          gap: 22px;
        }

        .bookingCard,
        .summaryCard,
        .benefitsCard {
          border: 1px solid #dce5df;
          border-radius: 18px;
          background: white;
          box-shadow:
            0 4px 18px
            rgba(27, 55, 42, 0.04);
        }

        .bookingCard {
          padding: 27px;
        }

        .cardHeader {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 27px;
        }

        .stepNumber {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #08783f;
          color: white;
          font-size: 14px;
          font-weight: 900;
        }

        .cardHeader h2,
        .summaryHeader h2 {
          margin: 0;
          color: #193126;
          font-size: 20px;
        }

        .cardHeader p {
          margin: 3px 0 0;
          color: #7a8781;
          font-size: 12px;
        }

        .fieldGroup {
          margin-bottom: 22px;
        }

        .fieldLabel {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          color: #394b42;
          font-size: 13px;
          font-weight: 800;
        }

        .optional {
          color: #89958f;
          font-size: 11px;
          font-weight: 600;
        }

        .tripType {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .tripOption {
          min-height: 70px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 12px;
          border: 1px solid #dce5df;
          border-radius: 12px;
          background: white;
          color: #405149;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .tripOption:hover {
          border-color: #9cc9ad;
        }

        .tripOption.active {
          border-color: #08783f;
          background: #f0f8f3;
        }

        .tripIcon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 9px;
          background: #edf5ef;
          color: #08783f;
          font-size: 19px;
          font-weight: 900;
        }

        .tripOption strong,
        .tripOption small {
          display: block;
        }

        .tripOption strong {
          margin-bottom: 3px;
          font-size: 13px;
        }

        .tripOption small {
          color: #7c8983;
          font-size: 10px;
        }

        .locationSection {
          position: relative;
          display: grid;
          grid-template-columns: 25px 1fr;
          gap: 11px;
        }

        .locationStep {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 35px;
        }

        .locationDot {
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow:
            0 0 0 2px #08783f;
          background: #08783f;
          z-index: 2;
        }

        .pickupDot {
          box-shadow:
            0 0 0 2px #08783f;
          background: #08783f;
        }

        .dropoffDot {
          box-shadow:
            0 0 0 2px #d48720;
          background: #d48720;
        }

        .locationLine {
          width: 1px;
          height: 82px;
          margin: 5px 0;
          border-left: 1px dashed #b9c9bf;
        }

        .locationFields {
          min-width: 0;
        }

        .locationFields :global(.picker) {
          margin-bottom: 0;
        }

        .swapRow {
          position: relative;
          height: 1px;
        }

        .swapButton {
          position: absolute;
          right: 14px;
          top: -26px;
          z-index: 20;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d4e1d9;
          border-radius: 50%;
          background: white;
          color: #08783f;
          box-shadow:
            0 3px 10px
            rgba(25, 49, 38, 0.1);
          font-size: 19px;
          font-weight: 900;
          cursor: pointer;
        }

        .swapButton:hover {
          background: #f0f8f3;
        }

        .formRow {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 23px;
        }

        .formInput,
        .textarea {
          width: 100%;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          background: white;
          color: #26372f;
          font: inherit;
          outline: none;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .formInput {
          min-height: 50px;
          padding: 12px 13px;
          font-size: 14px;
        }

        .textarea {
          display: block;
          padding: 13px;
          resize: vertical;
          font-size: 13px;
          line-height: 1.5;
        }

        .formInput:focus,
        .textarea:focus {
          border-color: #08783f;
          box-shadow:
            0 0 0 3px
            rgba(8, 120, 63, 0.09);
        }

        .passengerControl {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 220px;
          padding: 6px;
          border: 1px solid #d9e1dc;
          border-radius: 12px;
        }

        .passengerControl button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 9px;
          background: #f0f4f1;
          color: #08783f;
          font-size: 22px;
          cursor: pointer;
        }

        .passengerControl button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .passengerControl div {
          text-align: center;
        }

        .passengerControl strong {
          font-size: 15px;
        }

        .passengerControl span {
          margin-left: 4px;
          color: #7a8781;
          font-size: 12px;
        }

        .summaryColumn {
          position: sticky;
          top: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .summaryCard {
          padding: 23px;
        }

        .summaryHeader {
          margin-bottom: 23px;
        }

        .summaryHeader .eyebrow {
          margin-bottom: 5px;
        }

        .summaryRoute {
          padding: 4px 0;
        }

        .summaryPoint {
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .summaryDot {
          width: 11px;
          height: 11px;
          flex: 0 0 11px;
          margin-top: 4px;
          border-radius: 50%;
        }

        .summaryPoint small {
          display: block;
          margin-bottom: 4px;
          color: #87938d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.8px;
        }

        .summaryPoint strong {
          display: block;
          color: #33463d;
          font-size: 12px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .routeConnector {
          width: 1px;
          height: 27px;
          margin: 2px 0 2px 5px;
          border-left: 1px dashed #bac8c0;
        }

        .summaryDivider {
          height: 1px;
          margin: 19px 0;
          background: #e7ece9;
        }

        .summaryDetails {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 17px 12px;
        }

        .summaryDetails span {
          display: block;
          margin-bottom: 4px;
          color: #89958f;
          font-size: 10px;
        }

        .summaryDetails strong {
          color: #35483f;
          font-size: 12px;
        }

        .fareBox {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 13px;
          border-radius: 11px;
          background: #f4f8f5;
        }

        .fareBox span,
        .fareBox small {
          display: block;
        }

        .fareBox span {
          color: #42544b;
          font-size: 12px;
          font-weight: 800;
        }

        .fareBox small {
          max-width: 170px;
          margin-top: 4px;
          color: #89958f;
          font-size: 9px;
          line-height: 1.4;
        }

        .fareBox > strong {
          color: #08783f;
          font-size: 21px;
          white-space: nowrap;
        }

        .continueButton {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 16px;
          padding: 12px 15px 12px 17px;
          border: 0;
          border-radius: 11px;
          background: #08783f;
          color: white;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background 0.18s ease,
            transform 0.18s ease;
        }

        .continueButton:hover:not(:disabled) {
          background: #066b38;
          transform: translateY(-1px);
        }

        .continueButton:disabled {
          background: #b8c8bf;
          cursor: not-allowed;
        }

        .validationText {
          margin: 10px 0 0;
          color: #8a9690;
          font-size: 10px;
          line-height: 1.45;
          text-align: center;
        }

        .benefitsCard {
          padding: 20px;
        }

        .benefitsCard h3 {
          margin: 0 0 17px;
          color: #30443a;
          font-size: 14px;
        }

        .benefit {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 13px;
        }

        .benefit > span {
          width: 22px;
          height: 22px;
          flex: 0 0 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e8f5ec;
          color: #08783f;
          font-size: 11px;
          font-weight: 900;
        }

        .benefit strong {
          display: block;
          color: #42544b;
          font-size: 11px;
        }

        .benefit p {
          margin: 3px 0 0;
          color: #8a9690;
          font-size: 10px;
          line-height: 1.4;
        }

        .successMessage {
          margin-top: 20px;
          padding: 14px 16px;
          border: 1px solid #bfe1ca;
          border-radius: 12px;
          background: #edf8f1;
          color: #08783f;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
        }

        @media (max-width: 850px) {

          .bookingGrid {
            grid-template-columns: 1fr;
          }

          .summaryColumn {
            position: static;
          }

          .summaryCard {
            order: 1;
          }

          .benefitsCard {
            order: 2;
          }

        }

        @media (max-width: 600px) {

          .bookingPage {
            padding: 22px 12px 45px;
          }

          .bookingHeader {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 20px;
          }

          .bookingHeader h1 {
            font-size: 28px;
          }

          .bookingHeader p {
            font-size: 13px;
          }

          .bookingCard {
            padding: 18px 15px;
            border-radius: 15px;
          }

          .tripType {
            grid-template-columns: 1fr;
          }

          .formRow {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .locationSection {
            grid-template-columns: 19px 1fr;
            gap: 8px;
          }

          .locationStep {
            padding-top: 34px;
          }

          .locationLine {
            height: 84px;
          }

          .summaryCard {
            padding: 18px 15px;
            border-radius: 15px;
          }

        }

      `}</style>
    </main>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not selected";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
              }
