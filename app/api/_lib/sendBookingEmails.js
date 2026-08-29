import { sendBookingEmail } from "./sendBookingEmail";
import { bookingEmailDetails } from "./bookingEmailData";

export async function sendBookingCreatedEmails({ booking, customerEmail, adminEmail }) {
  const details = bookingEmailDetails(booking);
  const results = await Promise.allSettled([
    customerEmail
      ? sendBookingEmail({
          to: customerEmail,
          subject: `VOYNU booking ${booking.reference} received`,
          title: "Booking Received",
          intro: "Your VOYNU booking has been saved successfully. Our team will contact you before your journey to confirm the pickup details.",
          details,
        })
      : Promise.resolve({ sent: false, reason: "customer_email_missing" }),
    adminEmail
      ? sendBookingEmail({
          to: adminEmail,
          subject: `New VOYNU booking ${booking.reference}`,
          title: "New Booking Received",
          intro: "A new VOYNU booking has been created and is ready for review in the Admin Panel.",
          details,
        })
      : Promise.resolve({ sent: false, reason: "admin_email_missing" }),
  ]);

  return results.map((result) => (result.status === "fulfilled" ? result.value : { sent: false, reason: "email_send_failed", error: result.reason?.message }));
}
