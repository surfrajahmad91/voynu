import "../styles/globals.css";
import NotificationBell from "../../../app/components/NotificationBell";
import PushNotifications from "../../../app/components/PushNotifications";

export const metadata = {
  title: "VOYNU Saarthi",
  description: "VOYNU Saarthi driver app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: { capable: true, title: "VOYNU Saarthi", statusBarStyle: "default" },
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
        <div style={{ position: "fixed", top: 78, right: 14, zIndex: 100 }}>
          <NotificationBell targetPath="/driver" />
        </div>
        {children}
        <PushNotifications targetPath="/driver" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
