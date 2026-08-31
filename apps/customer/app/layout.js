import "../styles/globals.css";
import LiveRefresh from "../components/LiveRefresh";

export const metadata = { title: "VOYNU", description: "Book your perfect trip with VOYNU" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <LiveRefresh />
        <script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} />
      </body>
    </html>
  );
}
