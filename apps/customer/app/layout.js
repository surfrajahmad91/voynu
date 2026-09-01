import "../styles/globals.css";
import PushNotifications from "../../../app/components/PushNotifications";
import DateTimeBookingGuard from "../../../app/components/DateTimeBookingGuard";

export const metadata = {
  title: "VOYNU",
  description: "Book your perfect trip with VOYNU",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: { capable: true, title: "VOYNU", statusBarStyle: "default" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b7a3e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DateTimeBookingGuard />
        {children}
        <PushNotifications targetPath="/account" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
