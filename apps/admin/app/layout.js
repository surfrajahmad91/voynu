import "../styles/globals.css";
import LiveRefresh from "../components/LiveRefresh";

export const metadata = {
  title: "VOYNU Admin",
  description: "VOYNU administration app",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0b7a3e",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LiveRefresh />
        <script
          dangerouslySetInnerHTML={{
            __html: `if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`,
          }}
        />
      </body>
    </html>
  );
}
