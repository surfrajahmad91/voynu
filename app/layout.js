import "./globals.css";
import "./fare-transparency.css";

import RoleNotificationBell from "./components/RoleNotificationBell";
import DateTimeBookingGuard from "./components/DateTimeBookingGuard";

export const metadata = {
  title: "Voynu",
  description: "Book your perfect trip with Voynu",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RoleNotificationBell />
        <DateTimeBookingGuard />
        {children}
      </body>
    </html>
  );
}
