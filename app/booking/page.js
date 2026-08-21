"use client";

import { useState } from "react";
import LocationPicker from "../components/LocationPicker";

export default function BookingPage() {
  const [tripType, setTripType] = useState("one-way");

  const [from, setFrom] = useState({
    name: "",
    lat: null,
    lon: null,
  });

  const [to, setTo] = useState({
    name: "",
    lat: null,
    lon: null,
  });

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
  };

  const canContinue =
    from.name &&
    from.lat !== null &&
    to.name &&
    to.lat !== null &&
    date &&
    time;

  return (
    <main className="bookingPage">

      {/* HEADER */}
      <header className="bookingHeader">
        <button
          type="button"
          className="backButton"
          onClick={() => window.history.back()}
          aria-label="Go back"
        >
          ←
        </button>

        <div>
          <h1>Plan your trip</h1>
          <p>Tell us where you want to go</p>
        </div>
      </header>

      <div className="bookingContainer">

        {/* TRIP TYPE */}
        <section className="bookingCard">

          <div className="sectionTitle">
            <span className="stepNumber">1</span>

            <div>
              <h2>Trip type</h2>
              <p>Choose how you want to travel</p>
            </div>
          </div>

          <div className="tripTypes">

            <button
              type="button"
              className={
                tripType === "one-way"
                  ? "tripType active"
                  : "tripType"
              }
              onClick={() =>
                setTripType("one-way")
              }
            >
              <span className="tripIcon">
                →
              </span>

              <span>
                <strong>One way</strong>
                <small>Travel to your destination</small>
              </span>
            </button>

            <button
              type="button"
              className={
                tripType === "round-trip"
                  ? "tripType active"
                  : "tripType"
              }
              onClick={() =>
                setTripType("round-trip")
              }
            >
              <span className="tripIcon">
                ⇄
              </span>

              <span>
                <strong>Round trip</strong>
                <small>Return to your starting point</small>
              </span>
            </button>

          </div>
        </section>


        {/* LOCATIONS */}
        <section className="bookingCard">

          <div className="sectionTitle">
            <span className="stepNumber">2</span>

            <div>
              <h2>Where are you going?</h2>
              <p>Select your pickup and destination</p>
            </div>
          </div>

          <div className="locationSection">

            <LocationPicker
              label="Pickup location"
              value={from.name}
              allowCurrentLocation={true}
              placeholder="Search pickup location"
              onLocationSelect={setFrom}
            />

            <button
              type="button"
              className="swapButton"
              onClick={swapLocations}
              aria-label="Swap pickup and destination"
            >
              ⇅
            </button>

            <LocationPicker
              label="Destination"
              value={to.name}
              placeholder="Search destination"
              onLocationSelect={setTo}
            />

          </div>
        </section>


        {/* DATE & TIME */}
        <section className="bookingCard">

          <div className="sectionTitle">
            <span className="stepNumber">3</span>

            <div>
              <h2>When are you travelling?</h2>
              <p>Choose your travel date and time</p>
            </div>
          </div>

          <div className="formGrid">

            <div className="field">
              <label htmlFor="travelDate">
                Travel date
              </label>

              <input
                id="travelDate"
                type="date"
                value={date}
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                onChange={(e) =>
                  setDate(e.target.value)
                }
              />
            </div>

            <div className="field">
              <label htmlFor="travelTime">
                Pickup time
              </label>

              <input
                id="travelTime"
                type="time"
                value={time}
                onChange={(e) =>
                  setTime(e.target.value)
                }
              />
            </div>

          </div>

          {tripType === "round-trip" && (
            <div className="returnSection">

              <div className="returnHeading">
                <strong>Return journey</strong>
                <span>
                  When will you return?
                </span>
              </div>

              <div className="formGrid">

                <div className="field">
                  <label htmlFor="returnDate">
                    Return date
                  </label>

                  <input
                    id="returnDate"
                    type="date"
                    value={returnDate}
                    min={date}
                    onChange={(e) =>
                      setReturnDate(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="field">
                  <label htmlFor="returnTime">
                    Return time
                  </label>

                  <input
                    id="returnTime"
                    type="time"
                    value={returnTime}
                    onChange={(e) =>
                      setReturnTime(
                        e.target.value
                      )
                    }
                  />
                </div>

              </div>
            </div>
          )}

        </section>


        {/* TRAVELLERS */}
        <section className="bookingCard">

          <div className="sectionTitle">
            <span className="stepNumber">4</span>

            <div>
              <h2>Travellers</h2>
              <p>Tell us who is travelling</p>
            </div>
          </div>

          <div className="travellerRows">

            <TravellerRow
              title="Adults"
              description="Age 13+"
              value={adults}
              min={1}
              onChange={setAdults}
            />

            <TravellerRow
              title="Children"
              description="Age 2–12"
              value={children}
              min={0}
              onChange={setChildren}
            />

          </div>

        </section>


        {/* SUMMARY */}
        <section className="summaryCard">

          <div className="summaryHeader">
            <div>
              <h2>Your trip</h2>
              <p>
                Review your details before continuing
              </p>
            </div>

            <span className="summaryTripType">
              {tripType === "one-way"
                ? "One way"
                : "Round trip"}
            </span>
          </div>

          <div className="routeSummary">

            <div className="routePoint">
              <span className="routeDot pickup" />

              <div>
                <small>Pickup</small>
                <strong>
                  {from.name ||
                    "Select pickup location"}
                </strong>
              </div>
            </div>

            <div className="routeLine" />

            <div className="routePoint">
              <span className="routeDot destination" />

              <div>
                <small>Destination</small>
                <strong>
                  {to.name ||
                    "Select destination"}
                </strong>
              </div>
            </div>

          </div>

          <div className="summaryDetails">

            <div>
              <span>📅</span>
              <strong>
                {date || "Travel date"}
              </strong>
            </div>

            <div>
              <span>🕐</span>
              <strong>
                {time || "Pickup time"}
              </strong>
            </div>

            <div>
              <span>👤</span>
              <strong>
                {adults + children}{" "}
                {adults + children === 1
                  ? "traveller"
                  : "travellers"}
              </strong>
            </div>

          </div>

        </section>


        {/* CONTINUE */}
        <button
          type="button"
          className="continueButton"
          disabled={!canContinue}
          onClick={() => {
            if (!canContinue) return;

            console.log(
              "Booking details:",
              {
                tripType,
                from,
                to,
                date,
                time,
                returnDate,
                returnTime,
                adults,
                children,
              }
            );
          }}
        >
          <span>Continue</span>
          <span>→</span>
        </button>

        {!canContinue && (
          <p className="continueHint">
            Select your pickup, destination,
            date and time to continue.
          </p>
        )}

      </div>


      <style jsx>{`

        .bookingPage {
          min-height: 100vh;
          background: #f7f9f7;
          padding-bottom: 60px;
          color: #26372f;
        }

        .bookingHeader {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 25px 20px;
          background: #ffffff;
          border-bottom: 1px solid #e4e9e5;
        }

        .backButton {
          width: 42px;
          height: 42px;
          border: 1px solid #dce4df;
          border-radius: 12px;
          background: #ffffff;
          color: #26372f;
          font-size: 23px;
          cursor: pointer;
        }

        .bookingHeader h1 {
          margin: 0;
          font-size: 24px;
          line-height: 1.2;
        }

        .bookingHeader p {
          margin: 5px 0 0;
          color: #718078;
          font-size: 13px;
        }

        .bookingContainer {
          width: min(760px, calc(100% - 32px));
          margin: 25px auto;
        }

        .bookingCard,
        .summaryCard {
          margin-bottom: 18px;
          padding: 22px;
          border: 1px solid #e1e8e3;
          border-radius: 18px;
          background: #ffffff;
          box-shadow:
            0 4px 18px
            rgba(27, 54, 39, 0.04);
        }

        .sectionTitle {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 22px;
        }

        .stepNumber {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #e8f5ed;
          color: #08783f;
          font-size: 13px;
          font-weight: 900;
        }

        .sectionTitle h2 {
          margin: 2px 0 4px;
          font-size: 17px;
        }

        .sectionTitle p {
          margin: 0;
          color: #78847e;
          font-size: 12.5px;
        }

        .tripTypes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .tripType {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          text-align: left;
          border: 1px solid #dce5df;
          border-radius: 13px;
          background: #ffffff;
          color: #26372f;
          cursor: pointer;
        }

        .tripType.active {
          border-color: #08783f;
          background: #f0f8f3;
          box-shadow:
            0 0 0 2px
            rgba(8, 120, 63, 0.08);
        }

        .tripIcon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eef5f0;
          color: #08783f;
          font-size: 20px;
          font-weight: 800;
        }

        .tripType span:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tripType strong {
          font-size: 14px;
        }

        .tripType small {
          color: #7a867f;
          font-size: 11px;
        }

        .locationSection {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .swapButton {
          position: absolute;
          right: 15px;
          top: 49%;
          z-index: 20;
          width: 42px;
          height: 42px;
          border: 1px solid #cce3d3;
          border-radius: 50%;
          background: #ffffff;
          color: #08783f;
          font-size: 21px;
          font-weight: 800;
          cursor: pointer;
          box-shadow:
            0 3px 12px
            rgba(0, 0, 0, 0.1);
        }

        .formGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .field label {
          color: #52625a;
          font-size: 12px;
          font-weight: 800;
        }

        .field input {
          width: 100%;
          min-height: 50px;
          box-sizing: border-box;
          padding: 12px 13px;
          border: 1px solid #d9e1dc;
          border-radius: 11px;
          background: #ffffff;
          color: #26372f;
          font-size: 14px;
          outline: none;
        }

        .field input:focus {
          border-color: #08783f;
          box-shadow:
            0 0 0 3px
            rgba(8, 120, 63, 0.08);
        }

        .returnSection {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid #e6ebe7;
        }

        .returnHeading {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 14px;
        }

        .returnHeading strong {
          font-size: 14px;
        }

        .returnHeading span {
          color: #7a867f;
          font-size: 12px;
        }

        .travellerRows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .travellerRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 0;
        }

        .travellerInfo {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .travellerInfo strong {
          font-size: 14px;
        }

        .travellerInfo span {
          color: #7a867f;
          font-size: 11px;
        }

        .counter {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .counter button {
          width: 34px;
          height: 34px;
          border: 1px solid #d4dfd8;
          border-radius: 50%;
          background: #ffffff;
          color: #08783f;
          font-size: 19px;
          cursor: pointer;
        }

        .counter button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .counter strong {
          min-width: 20px;
          text-align: center;
          font-size: 14px;
        }

        .summaryCard {
          border-color: #cfe3d5;
          background: #f9fcfa;
        }

        .summaryHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 22px;
        }

        .summaryHeader h2 {
          margin: 0 0 4px;
          font-size: 17px;
        }

        .summaryHeader p {
          margin: 0;
          color: #7a867f;
          font-size: 12px;
        }

        .summaryTripType {
          padding: 6px 9px;
          border-radius: 20px;
          background: #e8f5ed;
          color: #08783f;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .routeSummary {
          display: flex;
          flex-direction: column;
        }

        .routePoint {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .routeDot {
          width: 12px;
          height: 12px;
          flex: 0 0 12px;
          margin-top: 4px;
          border: 3px solid #08783f;
          border-radius: 50%;
          box-sizing: border-box;
        }

        .routeDot.destination {
          border-radius: 3px;
        }

        .routePoint div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .routePoint small {
          color: #7a867f;
          font-size: 10px;
          font-weight: 700;
        }

        .routePoint strong {
          overflow: hidden;
          font-size: 13px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .routeLine {
          width: 2px;
          height: 24px;
          margin: 2px 0 2px 5px;
          background: #cce3d3;
        }

        .summaryDetails {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 8px;
          margin-top: 20px;
          padding-top: 17px;
          border-top: 1px solid #dfeae2;
        }

        .summaryDetails div {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .summaryDetails span {
          font-size: 14px;
        }

        .summaryDetails strong {
          overflow: hidden;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .continueButton {
          width: 100%;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border: 0;
          border-radius: 14px;
          background: #08783f;
          color: #ffffff;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          box-shadow:
            0 7px 20px
            rgba(8, 120, 63, 0.18);
        }

        .continueButton:disabled {
          background: #cbd7d0;
          color: #ffffff;
          box-shadow: none;
          cursor: not-allowed;
        }

        .continueHint {
          margin: 9px 0 0;
          color: #7a867f;
          text-align: center;
          font-size: 11px;
        }

        @media (max-width: 600px) {

          .bookingHeader {
            padding: 18px 16px;
          }

          .bookingHeader h1 {
            font-size: 21px;
          }

          .bookingContainer {
            width: calc(100% - 22px);
            margin-top: 16px;
          }

          .bookingCard,
          .summaryCard {
            padding: 17px;
            border-radius: 15px;
          }

          .tripTypes,
          .formGrid {
            grid-template-columns: 1fr;
          }

          .swapButton {
            top: 50%;
            right: 10px;
          }

          .summaryDetails {
            grid-template-columns: 1fr;
          }
        }

      `}</style>
    </main>
  );
}


/*
|--------------------------------------------------------------------------
| Traveller counter
|--------------------------------------------------------------------------
*/

function TravellerRow({
  title,
  description,
  value,
  min,
  onChange,
}) {
  return (
    <div className="travellerRow">

      <div className="travellerInfo">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <div className="counter">

        <button
          type="button"
          disabled={value <= min}
          onClick={() =>
            onChange(
              Math.max(min, value - 1)
            )
          }
          aria-label={`Decrease ${title}`}
        >
          −
        </button>

        <strong>{value}</strong>

        <button
          type="button"
          onClick={() =>
            onChange(value + 1)
          }
          aria-label={`Increase ${title}`}
        >
          +
        </button>

      </div>

    </div>
  );
          }
