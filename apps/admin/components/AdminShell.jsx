"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import AdminNotificationBell from "./AdminNotificationBell";

const groups=[
 {label:"WORKSPACE",items:[
  ["/admin","Dashboard","⌂"],
 ]},
 {label:"BOOKINGS",items:[
  ["/admin/bookings?type=ride","Ride bookings","🚕"],
  ["/admin/rentals","Rentals","🚗"],
  ["/admin/subscriptions","Commute subscriptions","📅"],
 ]},
 {label:"OPERATIONS",items:[
  ["/admin/trip-monitor","Live trips","◉"],
  ["/admin/dispatch","Dispatch","⇄"],
  ["/admin/drivers","Drivers","♙"],
  ["/admin/vehicles","Fleet & vehicles","▣"],
  ["/admin/vehicle-categories","Vehicle types","▦"],
 ]},
 {label:"MANAGE",items:[
  ["/admin/pricing","Pricing","₹"],
  ["/admin/configuration","Configuration","⚙"],
 ]},
];

function hrefPath(href){return href.split("?")[0]}
function isActive(pathname,href){
 const p=hrefPath(href);
 if(p==="/admin")return pathname==="/admin";
 return pathname?.startsWith(p);
}

export default function AdminShell({children}){
 const pathname=usePathname();
 const[open,setOpen]=useState(false);
 const isLogin=pathname==="/login"||pathname==="/forgot-password"||pathname==="/reset-password";
 if(isLogin)return children;
 return <div className="adminApp">
  <aside className={open?"adminSidebar open":"adminSidebar"}>
   <div className="adminSidebarBrand">
    <Link href="/admin" onClick={()=>setOpen(false)} className="adminBrand">
     <img src="/icon.svg" alt="VOYNU" width="42" height="42"/>
     <span><strong>VOYNU</strong><small>Mobility for a Better Tomorrow</small></span>
    </Link>
    <button className="adminSidebarClose" onClick={()=>setOpen(false)} aria-label="Close menu">×</button>
   </div>
   <div className="adminNavScroll">
    {groups.map(group=><div className="adminNavGroup" key={group.label}>
     <div className="adminNavLabel">{group.label}</div>
     {group.items.map(([href,label,icon])=><Link key={href} href={href} onClick={()=>setOpen(false)} className={isActive(pathname,href)?"adminNavItem active":"adminNavItem"}>
       <span className="adminNavIcon">{icon}</span><span>{label}</span>
      </Link>)}
    </div>)}
   </div>
   <div className="adminSidebarFooter"><div className="adminUserAvatar">SA</div><div><strong>Surfraj Ahmad</strong><small>Administrator</small></div><span>•••</span></div>
  </aside>
  {open&&<button className="adminOverlay" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
  <section className="adminMain">
   <header className="adminTopbar">
    <button className="adminMenuButton" onClick={()=>setOpen(true)} aria-label="Open navigation">☰</button>
    <Link href="/admin" className="adminMobileBrand"><img src="/icon.svg" alt="VOYNU" width="35" height="35"/><strong>VOYNU</strong></Link>
    <div className="adminSearch"><span>⌕</span><input aria-label="Search" placeholder="Search bookings, drivers, customers…"/></div>
    <div className="adminTopActions"><span className="adminSystem"><i/> System Online</span><AdminNotificationBell/><Link href="/admin/configuration" className="adminGear">⚙</Link></div>
   </header>
   <main className="adminPage">{children}</main>
  </section>
  <nav className="adminBottomNav">
   {[["/admin","⌂","Home"],["/admin/bookings?type=ride","🚕","Rides"],["/admin/trip-monitor","◉","Live"],["/admin/dispatch","⇄","Dispatch"],["/admin/configuration","⚙","More"]].map(([href,icon,label])=><Link key={label} href={href} className={isActive(pathname,href)?"active":""}><span>{icon}</span><small>{label}</small></Link>)}
  </nav>
 </div>
}
