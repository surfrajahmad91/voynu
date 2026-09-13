import "../styles/globals.css";
import AdminShell from "../components/AdminShell";
import PushNotifications from "../../../shared/components/PushNotifications";

export const metadata = {
  title: "VOYNU Admin",
  description: "VOYNU administration app",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "VOYNU Admin", statusBarStyle: "black-translucent" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#4C1D95" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AdminShell>{children}</AdminShell>
        <PushNotifications targetPath="/admin" audience="admin" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
