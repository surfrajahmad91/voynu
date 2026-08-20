"use client";

import { useState } from "react";
import LocationPicker from "@/components/LocationPicker";

export default function HomePage() {
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);

  return (
    <main className="page">
      <div className="container">

        <div className="header">
          <div className="logo">
            V
          </div>

          <div>
            <h1>VOYNU</h1>
            <p>Google Maps Location Test</p>
          </div>
        </div>

        <div className="card">

          <h2>Test Location Search</h2>

          <p className="description">
            Search for a known building, hotel,
            landmark, address or locality.
          </p>

          <div className="section">

            <LocationPicker
              label="Pickup location"
              placeholder="Search for a building, address or place"
              allowCurrentLocation={true}
              onLocationSelect={(location) => {
                console.log(
                  "PICKUP LOCATION:",
                  location
                );

                setPickup(location);
              }}
            />

          </div>

          <div className="section">

            <LocationPicker
              label="Drop location"
              placeholder="Search for a building, address or place"
              onLocationSelect={(location) => {
                console.log(
                  "DROP LOCATION:",
                  location
                );

                setDrop(location);
              }}
            />

          </div>

          {pickup && (
            <div className="result">

              <h3>Pickup Selected</h3>

              <p>
                <strong>Name:</strong>{" "}
                {pickup.name}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {pickup.address}
              </p>

              <p>
                <strong>Latitude:</strong>{" "}
                {pickup.lat}
              </p>

              <p>
                <strong>Longitude:</strong>{" "}
                {pickup.lon}
              </p>

              {pickup.placeId && (
                <p>
                  <strong>Place ID:</strong>{" "}
                  {pickup.placeId}
                </p>
              )}

            </div>
          )}

          {drop && (
            <div className="result">

              <h3>Drop Selected</h3>

              <p>
                <strong>Name:</strong>{" "}
                {drop.name}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {drop.address}
              </p>

              <p>
                <strong>Latitude:</strong>{" "}
                {drop.lat}
              </p>

              <p>
                <strong>Longitude:</strong>{" "}
                {drop.lon}
              </p>

              {drop.placeId && (
                <p>
                  <strong>Place ID:</strong>{" "}
                  {drop.placeId}
                </p>
              )}

            </div>
          )}

        </div>

      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f4f8f5;
          padding: 40px 20px;
        }

        .container {
          max-width: 900px;
          margin: 0 auto;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .logo {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #08783f;
          color: white;
          font-weight: 800;
          font-size: 22px;
        }

        .header h1 {
          margin: 0;
          font-size: 22px;
          color: #183329;
        }

        .header p {
          margin: 2px 0 0;
          font-size: 13px;
          color: #65736b;
        }

        .card {
          background: white;
          border: 1px solid #dce6df;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.05);
        }

        .card h2 {
          margin: 0;
          color: #183329;
          font-size: 22px;
        }

        .description {
          margin: 8px 0 24px;
          color: #65736b;
          font-size: 14px;
        }

        .section {
          margin-top: 24px;
        }

        .result {
          margin-top: 24px;
          padding: 16px;
          border-radius: 12px;
          background: #f1f8f3;
          border: 1px solid #cce3d3;
          word-break: break-word;
        }

        .result h3 {
          margin: 0 0 12px;
          color: #08783f;
          font-size: 15px;
        }

        .result p {
          margin: 6px 0;
          color: #405149;
          font-size: 13px;
          line-height: 1.5;
        }

        @media (max-width: 600px) {
          .page {
            padding: 20px 12px;
          }

          .card {
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}
