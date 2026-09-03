import "../styles/globals.css";
import NotificationBell from "../../../shared/components/NotificationBell";
import PushNotifications from "../../../shared/components/PushNotifications";
import ThemeToggle from "../../../shared/components/ThemeToggle";

export const metadata = {
  title: "VOYNU Saarthi",
  description: "VOYNU Saarthi driver app",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "VOYNU Saarthi", statusBarStyle: "black-translucent" },
};

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#00B4A6" };

const themeInit = `(()=>{try{const s=localStorage.getItem('voynu-theme');const d=s==='dark'||s==='light'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.voynuTheme=d;document.documentElement.style.colorScheme=d}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <div style={{ position: "fixed", top: 78, right: 14, zIndex: 100 }}><ThemeToggle compact /><NotificationBell targetPath="/driver" audience="driver" /></div>
        {children}
        <PushNotifications targetPath="/driver" audience="driver" />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
