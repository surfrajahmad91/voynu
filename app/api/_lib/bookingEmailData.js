export function bookingEmailDetails(booking) {
  return [
    ["Booking reference", booking.reference],
    ["Customer", booking.customerName],
    ["Phone", booking.customerPhone],
    ["Pickup", booking.pickupName],
    ["Destination", booking.dropName],
    ["Trip type", booking.tripType],
    ["Travel date", booking.travelDate],
    ["Pickup time", booking.pickupTime],
    ["Vehicle", booking.vehicleName],
    ["Passengers", booking.passengerCount],
    ["Luggage", booking.luggageCount],
    ["Fare", booking.fare ? `₹${booking.fare}` : "—"],
    ["Payment", booking.paymentLabel],
  ];
}
