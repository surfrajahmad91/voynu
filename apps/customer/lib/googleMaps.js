"use client";

const GOOGLE_SCRIPT_ID = "voynu-google-maps-script";

let googleMapsPromise = null;

export function loadGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Browser environment required.")
    );
  }

  if (
    window.google?.maps?.places &&
    window.google?.maps?.DirectionsService &&
    window.google?.maps?.Geocoder
  ) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error(
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured."
      )
    );
  }

  googleMapsPromise = new Promise(
    (resolve, reject) => {
      const existingScript =
        document.getElementById(
          GOOGLE_SCRIPT_ID
        );

      if (existingScript) {
        const checkReady = () => {
          if (
            window.google?.maps?.places &&
            window.google?.maps?.DirectionsService &&
            window.google?.maps?.Geocoder
          ) {
            resolve(window.google.maps);
          } else {
            reject(
              new Error(
                "Google Maps services are unavailable."
              )
            );
          }
        };

        if (window.google?.maps) {
          checkReady();
          return;
        }

        existingScript.addEventListener(
          "load",
          checkReady,
          { once: true }
        );

        existingScript.addEventListener(
          "error",
          () => {
            reject(
              new Error(
                "Google Maps failed to load."
              )
            );
          },
          { once: true }
        );

        return;
      }

      const script =
        document.createElement("script");

      script.id = GOOGLE_SCRIPT_ID;

      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
          apiKey
        )}&libraries=places&v=weekly`;

      script.async = true;
      script.defer = true;

      script.onload = () => {
        if (
          window.google?.maps?.places &&
          window.google?.maps?.DirectionsService &&
          window.google?.maps?.Geocoder
        ) {
          resolve(window.google.maps);
        } else {
          reject(
            new Error(
              "Google Maps services are unavailable."
            )
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            "Unable to load Google Maps."
          )
        );
      };

      document.head.appendChild(script);
    }
  );

  googleMapsPromise.catch(() => {
    googleMapsPromise = null;
  });

  return googleMapsPromise;
}

export function extractCityName(
  addressComponents
) {
  if (
    !Array.isArray(
      addressComponents
    )
  ) {
    return null;
  }

  const locality =
    addressComponents.find(
      (component) =>
        component.types?.includes(
          "locality"
        )
    );

  if (locality?.long_name) {
    return locality.long_name;
  }

  const district =
    addressComponents.find(
      (component) =>
        component.types?.includes(
          "administrative_area_level_2"
        )
    );

  return (
    district?.long_name || null
  );
}
