export function createBookingDraft(data) {
  return {
    tripType: data?.tripType,
    pickup: {
      name: String(data?.pickup?.name || "").trim(),
      lat: data?.pickup?.lat ?? null,
      lon: data?.pickup?.lon ?? null,
      placeId: data?.pickup?.placeId ?? null,
      city: data?.pickup?.city ?? null,
    },
    drop: {
      name: String(data?.drop?.name || "").trim(),
      lat: data?.drop?.lat ?? null,
      lon: data?.drop?.lon ?? null,
      placeId: data?.drop?.placeId ?? null,
      city: data?.drop?.city ?? null,
    },
    journey: {
      oneWayDistanceKm: data?.journey?.oneWayDistanceKm ?? null,
      oneWayDistanceText: data?.journey?.oneWayDistanceText || "",
      totalDistanceKm: data?.journey?.totalDistanceKm ?? null,
      totalDistanceText: data?.journey?.totalDistanceText || "",
      durationText: data?.journey?.durationText || "",
      maximumDistancePerLegKm: data?.journey?.maximumDistancePerLegKm ?? null,
      serviceAreaId: data?.journey?.serviceAreaId ?? null,
      chargingRequired: Boolean(data?.journey?.chargingRequired),
      chargingBreakMinutes: Number(data?.journey?.chargingBreakMinutes || 0),
    },
    travelDate: data?.travelDate || "",
    pickupTime: data?.pickupTime || "",
    returnDate: data?.returnDate ?? null,
    returnTime: data?.returnTime ?? null,
    passengerName: String(data?.passengerName || "").trim(),
    phone: data?.phone ?? null,
    whatsapp: data?.whatsapp ?? null,
    createdAt: data?.createdAt || new Date().toISOString(),
  };
}

export function validateBookingDraft(draft) {
  if (!draft || typeof draft !== "object") return "Booking draft is missing.";
  if (!draft.tripType) return "Booking draft has no trip type.";
  if (!draft.pickup?.name || !Number.isFinite(Number(draft.pickup?.lat)) || !Number.isFinite(Number(draft.pickup?.lon))) {
    return "Booking draft has an invalid pickup location.";
  }
  if (!draft.drop?.name || !Number.isFinite(Number(draft.drop?.lat)) || !Number.isFinite(Number(draft.drop?.lon))) {
    return "Booking draft has an invalid destination.";
  }
  if (!Number.isFinite(Number(draft.journey?.oneWayDistanceKm)) || Number(draft.journey.oneWayDistanceKm) < 0) {
    return "Booking draft has an invalid journey distance.";
  }
  return null;
}

export function serializeBookingDraft(data) {
  return JSON.stringify(createBookingDraft(data));
}

export function deserializeBookingDraft(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const draft = createBookingDraft(parsed);
    const error = validateBookingDraft(draft);
    return error ? { draft: null, error } : { draft, error: null };
  } catch (error) {
    return { draft: null, error: error?.message || "Invalid booking draft." };
  }
}
