import "../styles/globals.css";
export const metadata = { title: "VOYNU", description: "Book your perfect trip with VOYNU" };
export default function RootLayout({ children }) { return <html lang="en"><body>{children}<script dangerouslySetInnerHTML={{__html:`if(typeof window!=="undefined"&&"serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}} /></body></html>; }
