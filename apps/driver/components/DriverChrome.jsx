"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBell from "../../../shared/components/NotificationBell";
import { theme } from "../../../shared/lib/theme";

export default function DriverChrome({children,active="home",subtitle="Good evening"}) {
  const router=useRouter();
  const items=[
    ["⌂","Home","/driver","home"],
    ["▣","Trips","/driver/trips","trips"],
    ["₹","Earnings","/driver/earnings","earnings"],
    ["♙","Account","/driver/account","account"]
  ];
  const logout=async()=>{await (await import("../../../shared/lib/supabaseClient")).supabase.auth.signOut();router.push("/login");};
  return <main style={{minHeight:"100vh",background:"linear-gradient(180deg,#F7F9FC 0%,#F3F7FB 100%)",fontFamily:theme.fontFamily,color:theme.colors.text,paddingBottom:86}}>
    <header style={{background:"#fff",borderBottom:"1px solid "+theme.colors.border,position:"sticky",top:0,zIndex:40}}>
      <div style={{width:"min(760px,calc(100% - 28px))",margin:"auto",minHeight:72,display:"flex",alignItems:"center",gap:10}}>
        <Link href="/driver" aria-label="VOYNU Saarthi home" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none",minWidth:0,flex:1}}>
          <img src="/icon.svg" alt="VOYNU" width="50" height="50" style={{borderRadius:14,boxShadow:"0 7px 18px rgba(10,127,166,.15)",flexShrink:0}}/>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:900,color:theme.colors.primary,fontSize:19,lineHeight:1.1}}>VOYNU Saarthi</div>
            <div style={{fontSize:11,color:theme.colors.textFaint,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{subtitle}</div>
          </div>
        </Link>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <NotificationBell targetPath="/driver" audience="driver"/>
          <button onClick={logout} style={{height:42,padding:"0 15px",borderRadius:13,border:"1px solid "+theme.colors.border,background:"#fff",color:theme.colors.text,fontWeight:900,fontSize:11,cursor:"pointer"}}>Log out</button>
        </div>
      </div>
    </header>
    {children}
    <nav aria-label="Saarthi navigation" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:35,background:"rgba(255,255,255,.98)",backdropFilter:"blur(18px)",borderTop:"1px solid "+theme.colors.border,padding:"7px 12px calc(7px + env(safe-area-inset-bottom))",boxShadow:"0 -8px 28px rgba(13,27,42,.06)"}}>
      <div style={{width:"min(760px,100%)",margin:"auto",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
        {items.map(([icon,label,href,key])=><Link href={href} key={key} style={{textDecoration:"none",textAlign:"center",color:active===key?theme.colors.primary:theme.colors.textFaint,fontSize:9,fontWeight:900,padding:"6px 3px",borderRadius:13,background:active===key?theme.colors.primaryTint:"transparent"}}>
          <div style={{fontSize:19,lineHeight:1.05}}>{icon}</div>
          <div style={{marginTop:3}}>{label}</div>
        </Link>)}
      </div>
    </nav>
  </main>;
}