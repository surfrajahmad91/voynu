import "../styles/globals.css";
import PushNotifications from "../../../shared/components/PushNotifications";

export const metadata = {
  title: "VOYNU Saarthi",
  description: "VOYNU Saarthi driver app",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "VOYNU Saarthi", statusBarStyle: "black-translucent" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0A7FA6" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PushNotifications targetPath="/driver" audience="driver" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
