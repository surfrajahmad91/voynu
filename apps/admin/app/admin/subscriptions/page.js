"use client";
import Link from "next/link";
export default function SubscriptionAdminPage(){return <main style={{padding:24,fontFamily:'sans-serif'}}><Link href="/admin/control-centre">← Control Centre</Link><h1>Commute Subscriptions</h1><p>Subscription administration is being wired into the live admin data model.</p><p>Plans, discounts and holidays are stored in Supabase and can be managed here in the next deployment step.</p></main>}
