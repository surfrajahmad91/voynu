import "../styles/globals.css";
import PushNotifications from "../../../shared/components/PushNotifications";
import DateTimeBookingGuard from "../components/DateTimeBookingGuard";

export const metadata = {
  title: "VOYNU",
  description: "Book your perfect trip with VOYNU",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "VOYNU", statusBarStyle: "black-translucent" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0A2337" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DateTimeBookingGuard />
        {children}
        <PushNotifications targetPath="/account" audience="customer" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
