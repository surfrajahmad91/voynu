import "../styles/globals.css";
import NotificationBell from "../../../app/components/NotificationBell";

export const metadata = {
  title: "VOYNU Admin",
  description: "VOYNU administration app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: { capable: true, title: "VOYNU Admin", statusBarStyle: "default" },
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
        <div
          style={{
            position: "fixed",
            top: 7,
            right: 105,
            zIndex: 100,
          }}
        >
          <NotificationBell targetPath="/admin" />
        </div>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`,
          }}
        />
      </body>
    </html>
  );
}
