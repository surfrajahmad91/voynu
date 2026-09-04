import "../styles/globals.css";
import NotificationBell from "../../../shared/components/NotificationBell";
import PushNotifications from "../../../shared/components/PushNotifications";
import ThemeToggle from "../../../shared/components/ThemeToggle";
export const metadata={title:"VOYNU Admin",description:"VOYNU administration app",manifest:"/manifest.webmanifest",icons:{icon:"/voynu-lockup.svg",apple:"/voynu-lockup.svg"},appleWebApp:{capable:true,title:"VOYNU Admin",statusBarStyle:"black-translucent"}};
export const viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#7C3AED"};
const themeInit=`(()=>{try{const s=localStorage.getItem('voynu-theme');const d=s==='dark'||s==='light'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.voynuTheme=d;document.documentElement.style.colorScheme=d}catch(e){}})()`;
export default function RootLayout({children}){return <html lang="en"><body><script dangerouslySetInnerHTML={{__html:themeInit}}/><div style={{position:"fixed",top:7,right:105,zIndex:100,display:"flex",alignItems:"center",gap:8}}><ThemeToggle compact/><NotificationBell targetPath="/admin" audience="admin"/></div>{children}<PushNotifications targetPath="/admin" audience="admin"/><script dangerouslySetInnerHTML={{__html:`if("serviceWorker"in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));}`}}/></body></html>}
