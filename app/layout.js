import "./globals.css";

import RoleNotificationBell from "./components/RoleNotificationBell";

export const metadata = {
  title: "Voynu",
  description: "Book your perfect trip with Voynu",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RoleNotificationBell />
        {children}
      </body>
    </html>
  );
}
