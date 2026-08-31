import "../styles/globals.css";

export const metadata = {
  title: "VOYNU Saarthi",
  description: "VOYNU Saarthi driver app",
  manifest: "/manifest.webmanifest",
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
        {children}
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
