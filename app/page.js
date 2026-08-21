"use client";

import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";

export default function HomePage() {
  const [tripType, setTripType] = useState("one-way");

  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);

  const [distanceKm, setDistanceKm] = useState(null);

  const [travelDate, setTravelDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [passengerName, setPassengerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  /*
   * ---------------------------------------------------------
   * ROUND TRIP RULE
   * ---------------------------------------------------------
   *
   * Maximum:
   *
   * 200 km outward
   * +
   * 200 km return
   * =
   * 400 km total
   *
   * Since distanceKm is the one-way road distance,
   * the maximum allowed one-way distance is 200 km.
   */

  const ROUND_TRIP_MAX_ONE_WAY_KM = 200;

  const isRoundTrip = tripType === "round-trip";

  const roundTripNotAllowed =
    isRoundTrip &&
    distanceKm !== null &&
    distanceKm > ROUND_TRIP_MAX_ONE_WAY_KM;

  const totalRoundTripDistance =
    isRoundTrip && distanceKm !== null
      ? distanceKm * 2
      : null;

  /*
   * ---------------------------------------------------------
   * BOOKING VALIDATION
   * ---------------------------------------------------------
   */

  const canContinue =
    pickup &&
    drop &&
    distanceKm !== null &&
    !roundTripNotAllowed &&
    travelDate &&
    pickupTime &&
    passengerName.trim() &&
    phoneNumber.trim();

  /*
   * ---------------------------------------------------------
   * SUBMIT
   * ---------------------------------------------------------
   */

  function handleContinue(event) {
    event.preventDefault();

    if (!canContinue) {
      return;
    }

    const bookingData = {
      tripType,

      pickup: {
        address: pickup.address,
        lat: pickup.lat,
        lng: pickup.lng,
      },

      drop: {
        address: drop.address,
        lat: drop.lat,
        lng: drop.lng,
      },

      distanceKm,

      totalDistanceKm: isRoundTrip
        ? totalRoundTripDistance
        : distanceKm,

      travelDate,
      pickupTime,

      passenger: {
        name: passengerName.trim(),
        phone: phoneNumber.trim(),
        whatsapp:
          whatsappNumber.trim() || phoneNumber.trim(),
      },
    };

    console.log(
      "BOOKING DATA:",
      bookingData
    );

    /*
     * Replace this with your next booking step,
     * price calculation or API call.
     */

    alert("Booking details are ready.");
  }

  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">

        {/* ------------------------------------------------ */}
        {/* HEADER                                           */}
        {/* ------------------------------------------------ */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#245d43]">
            Book Your Ride
          </h1>

          <p className="mt-2 text-gray-600">
            Enter your journey details to continue.
          </p>
        </div>

        <form
          onSubmit={handleContinue}
          className="space-y-6"
        >

          {/* ------------------------------------------------ */}
          {/* TRIP TYPE                                        */}
          {/* ------------------------------------------------ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="mb-4 text-lg font-bold text-gray-800">
              Trip type
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setTripType("one-way")
                }
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  tripType === "one-way"
                    ? "border-[#238653] bg-[#eef9f2]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="font-semibold text-gray-800">
                  One Way
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  Pickup to destination
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setTripType("round-trip")
                }
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  tripType === "round-trip"
                    ? "border-[#238653] bg-[#eef9f2]"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="font-semibold text-gray-800">
                  Round Trip
                </div>

                <div className="mt-1 text-sm text-gray-500">
                  Maximum 200 km each way
                </div>
              </button>

            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* LOCATIONS                                        */}
          {/* ------------------------------------------------ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-bold text-gray-800">
              Journey details
            </h2>

            <LocationPicker
              pickup={pickup}
              drop={drop}
              onPickupChange={setPickup}
              onDropChange={setDrop}
              onDistanceChange={setDistanceKm}
            />

          </section>

          {/* ------------------------------------------------ */}
          {/* ROUND TRIP LIMIT                                 */}
          {/* ------------------------------------------------ */}

          {isRoundTrip &&
            distanceKm !== null &&
            !roundTripNotAllowed && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

                <div className="font-semibold text-green-800">
                  Round trip available
                </div>

                <div className="mt-1 text-sm text-green-700">
                  {distanceKm} km each way ·{" "}
                  {totalRoundTripDistance} km total
                </div>

              </div>
            )}

          {roundTripNotAllowed && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

              <div className="font-semibold text-red-700">
                Round trip is not available
              </div>

              <p className="mt-1 text-sm text-red-600">
                Round trips are limited to 200 km
                each way, with a maximum total
                distance of 400 km.
              </p>

              <p className="mt-2 text-sm font-medium text-red-700">
                Current one-way distance:{" "}
                {distanceKm} km
              </p>

            </div>
          )}

          {/* ------------------------------------------------ */}
          {/* DATE & TIME                                      */}
          {/* ------------------------------------------------ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="mb-5 text-lg font-bold text-gray-800">
              Travel schedule
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="travelDate"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Travel date
                </label>

                <input
                  id="travelDate"
                  type="date"
                  value={travelDate}
                  onChange={(event) =>
                    setTravelDate(event.target.value)
                  }
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#238653]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="pickupTime"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Pickup time
                </label>

                <input
                  id="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={(event) =>
                    setPickupTime(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#238653]"
                  required
                />
              </div>

            </div>

          </section>

          {/* ------------------------------------------------ */}
          {/* PASSENGER DETAILS                                */}
          {/* ------------------------------------------------ */}

          <section className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e4f5ea] font-bold text-[#238653]">
                2
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Passenger details
                </h2>

                <p className="text-sm text-gray-500">
                  Who are we booking this ride for?
                </p>
              </div>

            </div>

            <div className="space-y-5">

              {/* NAME */}

              <div>
                <label
                  htmlFor="passengerName"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Passenger name
                </label>

                <input
                  id="passengerName"
                  type="text"
                  value={passengerName}
                  onChange={(event) =>
                    setPassengerName(event.target.value)
                  }
                  placeholder="Enter passenger name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#238653]"
                  required
                />
              </div>

              {/* PHONE */}

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Phone number
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(event) =>
                    setPhoneNumber(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="10-digit mobile number"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#238653]"
                  required
                />
              </div>

              {/* WHATSAPP */}

              <div>
                <label
                  htmlFor="whatsappNumber"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  WhatsApp number
                </label>

                <input
                  id="whatsappNumber"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={whatsappNumber}
                  onChange={(event) =>
                    setWhatsappNumber(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="WhatsApp number"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#238653]"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Leave blank if WhatsApp and phone
                  number are the same.
                </p>
              </div>

            </div>

          </section>

          {/* ------------------------------------------------ */}
          {/* CONTINUE                                         */}
          {/* ------------------------------------------------ */}

          <button
            type="submit"
            disabled={!canContinue}
            className={`w-full rounded-2xl px-5 py-4 text-lg font-bold transition ${
              canContinue
                ? "bg-[#238653] text-white hover:bg-[#1d7347]"
                : "cursor-not-allowed bg-gray-200 text-gray-400"
            }`}
          >
            Continue
          </button>

        </form>

      </div>
    </main>
  );
}
