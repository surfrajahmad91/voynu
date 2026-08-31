import "../styles/globals.css";

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
  themeColor: "#0B2E1E",
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
