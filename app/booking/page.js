"use client";

import { useState } from "react";
import LocationPicker from "../components/LocationPicker";

const bookingTypes = [
  {
    id: "hotel",
    title: "Hotels",
    icon: "🏨",
    description: "Find the perfect stay",
  },
  {
    id: "cab",
    title: "Cabs",
    icon: "🚕",
    description: "Travel comfortably",
  },
  {
    id: "flight",
    title: "Flights",
    icon: "✈️",
    description: "Fly to your destination",
  },
  {
    id: "package",
    title: "Packages",
    icon: "🧳",
    description: "Complete holiday packages",
  },
];

export default function BookingPage() {
  const [type, setType] = useState("hotel");
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const handleSearch = (e) => {
    e.preventDefault();

    console.log({
      type,
      location,
      checkIn,
      checkOut,
      guests,
    });

    // Search functionality will be connected later.
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a
            href="/"
            className="text-2xl font-bold tracking-tight text-neutral-900"
          >
            voynu
          </a>

          <div className="flex items-center gap-3">
            <button className="rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
              Help
            </button>

            <button className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50">
              Sign in
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-neutral-950 px-5 pb-20 pt-12 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-medium text-neutral-400">
            TRAVEL YOUR WAY
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Where are you going?
          </h1>

          <p className="mt-4 max-w-xl text-base text-neutral-400">
            Search hotels, cabs, flights and complete travel packages in one
            place.
          </p>

          {/* Search Card */}
          <div className="mt-10 rounded-3xl bg-white p-4 text-neutral-900 shadow-2xl sm:p-6">
            {/* Booking type */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {bookingTypes.map((item) => {
                const active = type === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setType(item.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="text-2xl">{item.icon}</div>

                    <div className="mt-2 text-sm font-semibold">
                      {item.title}
                    </div>

                    <div
                      className={`mt-1 text-xs ${
                        active ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search form */}
            <form
              onSubmit={handleSearch}
              className="mt-6 grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_0.7fr_auto]"
            >
              {/* Location */}
              <div className="rounded-2xl border border-neutral-300 p-3">
                <label className="block text-xs font-medium text-neutral-500">
                  Where
                </label>

                <div className="mt-1">
                  <LocationPicker
                    value={location}
                    onChange={setLocation}
                  />
                </div>
              </div>

              {/* Check in */}
              <div className="rounded-2xl border border-neutral-300 p-3">
                <label
                  htmlFor="checkIn"
                  className="block text-xs font-medium text-neutral-500"
                >
                  Check-in
                </label>

                <input
                  id="checkIn"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                />
              </div>

              {/* Check out */}
              <div className="rounded-2xl border border-neutral-300 p-3">
                <label
                  htmlFor="checkOut"
                  className="block text-xs font-medium text-neutral-500"
                >
                  Check-out
                </label>

                <input
                  id="checkOut"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                />
              </div>

              {/* Guests */}
              <div className="rounded-2xl border border-neutral-300 p-3">
                <label
                  htmlFor="guests"
                  className="block text-xs font-medium text-neutral-500"
                >
                  Guests
                </label>

                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="mt-1 w-full bg-transparent text-sm outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((number) => (
                    <option key={number} value={number}>
                      {number} {number === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <button
                type="submit"
                className="rounded-2xl bg-neutral-900 px-7 py-4 text-sm font-semibold text-white transition hover:bg-neutral-700"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Popular destinations */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mb-8">
          <p className="text-sm font-medium text-neutral-500">
            EXPLORE
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">
            Popular destinations
          </h2>

          <p className="mt-2 text-neutral-500">
            Start planning your next trip.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              city: "Agra",
              description: "History & heritage",
              image:
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800&q=80",
            },
            {
              city: "Goa",
              description: "Beaches & relaxation",
              image:
                "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
            },
            {
              city: "Delhi",
              description: "Culture & experiences",
              image:
                "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
            },
            {
              city: "Jaipur",
              description: "Royal Rajasthan",
              image:
                "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
            },
          ].map((destination) => (
            <button
              key={destination.city}
              type="button"
              onClick={() => setLocation(destination.city)}
              className="group overflow-hidden rounded-3xl border border-neutral-200 bg-white text-left"
            >
              <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                <img
                  src={destination.image}
                  alt={destination.city}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-5">
                <h3 className="font-semibold">{destination.city}</h3>

                <p className="mt-1 text-sm text-neutral-500">
                  {destination.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Why Voynu */}
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-2xl">🔎</div>
              <h3 className="mt-4 font-semibold">
                Everything in one place
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Search and plan different parts of your journey without
                jumping between platforms.
              </p>
            </div>

            <div>
              <div className="text-2xl">💰</div>
              <h3 className="mt-4 font-semibold">
                Transparent pricing
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                See what you are paying for before you confirm your booking.
              </p>
            </div>

            <div>
              <div className="text-2xl">🧳</div>
              <h3 className="mt-4 font-semibold">
                Built around your trip
              </h3>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                From a hotel room to a complete holiday, build your journey
                your way.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} voynu</div>

          <div className="flex gap-5">
            <a href="#" className="hover:text-neutral-900">
              Privacy
            </a>

            <a href="#" className="hover:text-neutral-900">
              Terms
            </a>

            <a href="#" className="hover:text-neutral-900">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
        }
