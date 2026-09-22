"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../../shared/lib/supabaseClient";
import { theme } from "../../../../../shared/lib/theme";

const c = theme.colors;
const card = { background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, padding: 16 };
const field = { width: "100%", boxSizing: "border-box", minHeight: 40, padding: "0 10px", border: `1px solid ${c.borderStrong}`, borderRadius: 10, background: c.surface, color: c.text, font: "inherit", fontSize: 13 };
const btn = { border: 0, borderRadius: 10, padding: "0 16px", minHeight: 40, background: c.primary, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", font: "inherit" };
const ghost = { ...btn, background: c.surface, color: c.text, border: `1px solid ${c.borderStrong}` };
const microLabel = { display: "block", fontSize: 10.5, fontWeight: 800, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4 };

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]), [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", vehicle_id: "" });
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null), [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "", vehicle_id: "", availability_status: "available", active: true }), [savingEdit, setSavingEdit] = useState(false);

  const load = async () => {
    setError("");
    const [{ data: ds, error: de }, { data: vs, error: ve }] = await Promise.all([
      supabase.from("drivers").select("*, vehicles(*)").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    ]);
    if (de || ve) setError((de || ve).message);
    setDrivers(ds || []); setVehicles(vs || []);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(t); }, [notice]);

  const usableVehicles = vehicles.filter((v) => v.active && v.status === "active");
  const stats = useMemo(() => ({ total: drivers.length, available: drivers.filter((d) => d.active !== false && d.availability_status === "available").length, assigned: drivers.filter((d) => d.vehicle_id).length, ready: drivers.filter((d) => d.active !== false && d.availability_status === "available" && d.vehicle_id && d.vehicles?.active && d.vehicles?.status === "active").length }), [drivers]);

  const addDriver = async (event) => {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    if (!form.full_name.trim() || !form.phone.trim()) { setError("Driver name and phone are required."); setLoading(false); return; }
    const { error: e } = await supabase.from("drivers").insert({ full_name: form.full_name.trim(), phone: form.phone.trim(), email: form.email.trim() || null, vehicle_id: form.vehicle_id || null, availability_status: "available" });
    setLoading(false);
    if (e) return setError(e.message);
    setForm({ full_name: "", phone: "", email: "", vehicle_id: "" });
    await load(); setNotice("Driver added.");
  };
  const updateAvailability = async (d, value) => {
    const { error: e } = await supabase.from("drivers").update({ availability_status: value }).eq("id", d.id);
    if (e) return setError(e.message);
    setDrivers((p) => p.map((x) => (x.id === d.id ? { ...x, availability_status: value } : x)));
    setNotice(`${d.full_name} is now ${value}.`);
  };
  const assignVehicle = async (d, vehicleId) => {
    setError(""); setNotice("");
    const { error: e } = await supabase.from("drivers").update({ vehicle_id: vehicleId || null }).eq("id", d.id);
    if (e) return setError(e.message);
    await load(); setNotice(vehicleId ? `Vehicle assigned to ${d.full_name}.` : `Vehicle removed from ${d.full_name}.`);
  };
  const openEdit = (d) => { setError(""); setNotice(""); setEditing(d); setEditForm({ full_name: d.full_name || "", phone: d.phone || "", email: d.email || "", vehicle_id: d.vehicle_id || "", availability_status: d.availability_status || "offline", active: d.active !== false }); };
  const saveEdit = async (event) => {
    event.preventDefault(); if (!editing) return; setSavingEdit(true); setError(""); setNotice("");
    if (!editForm.full_name.trim() || !editForm.phone.trim()) { setSavingEdit(false); return setError("Driver name and phone are required."); }
    const { error: e } = await supabase.from("drivers").update({ full_name: editForm.full_name.trim(), phone: editForm.phone.trim(), email: editForm.email.trim() || null, vehicle_id: editForm.vehicle_id || null, availability_status: editForm.availability_status, active: editForm.active }).eq("id", editing.id);
    setSavingEdit(false);
    if (e) return setError(e.message);
    setEditing(null); await load(); setNotice(`${editForm.full_name.trim()} updated successfully.`);
  };

  return <main style={{ background: c.bg, color: c.text, fontFamily: theme.fontFamily, padding: "4px 2px 32px" }}>
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, margin: "6px 0 16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: -0.4 }}>Drivers</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: c.textFaint, fontWeight: 600 }}>Availability and the vehicle each driver is authorised to operate.</p>
        </div>
        <button onClick={load} aria-label="Refresh" style={{ ...ghost, width: 44, padding: 0, fontSize: 18, flexShrink: 0 }}>↻</button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
        {[["Drivers", stats.total], ["Available", stats.available], ["With vehicle", stats.assigned], ["Booking-ready", stats.ready]].map(([l, v]) => <div key={l} style={card}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: c.textFaint, textTransform: "uppercase", letterSpacing: 0.3 }}>{l}</div>
          <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800 }}>{v}</div>
        </div>)}
      </div>

      <form onSubmit={addDriver} style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 800 }}>Add driver</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 }}>
          <input style={field} placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <input style={field} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input style={field} type="email" placeholder="Login email (optional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select style={field} value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}>
            <option value="">No vehicle yet</option>
            {usableVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} · {v.make || ""} {v.model || ""}</option>)}
          </select>
        </div>
        <button disabled={loading} type="submit" style={{ ...btn, marginTop: 12, opacity: loading ? 0.7 : 1 }}>{loading ? "Adding…" : "Add driver"}</button>
      </form>

      <div style={{ display: "grid", gap: 10 }}>
        {drivers.map((d) => {
          const v = Array.isArray(d.vehicles) ? d.vehicles[0] : d.vehicles;
          const ready = d.active !== false && d.availability_status === "available" && d.vehicle_id && v?.active && v?.status === "active";
          return <article key={d.id} style={{ ...card, borderLeft: `4px solid ${ready ? c.success : c.warning}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(180px,240px)", gap: 14, alignItems: "start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{d.full_name}</strong>
                  <span style={{ padding: "3px 9px", borderRadius: 999, background: ready ? c.successBg : c.warningBg, color: ready ? "#0B7A43" : "#8A5700", fontSize: 11, fontWeight: 800 }}>{ready ? "Booking ready" : "Not booking ready"}</span>
                </div>
                <div style={{ marginTop: 5, color: c.textFaint, fontSize: 12.5 }}>{d.phone || "—"}{d.email ? ` · ${d.email}` : ""}{!d.user_id ? " · no login linked" : ""}</div>
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: c.bg, fontSize: 12.5 }}>
                  {v ? <><strong>Vehicle:</strong> {v.registration_number} · {v.make || ""} {v.model || ""} · {v.category || "—"}<br /><span style={{ color: c.textFaint }}>Status: {v.status || "—"} · {v.active ? "active" : "inactive"}</span></>
                    : <><strong>No vehicle assigned.</strong><br /><span style={{ color: "#8A5700" }}>This driver cannot take a booking until an active vehicle is assigned.</span></>}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => openEdit(d)} style={{ ...ghost, width: "100%", marginBottom: 10 }}>Edit driver</button>
                <label style={{ display: "block", marginBottom: 9 }}><span style={microLabel}>Availability</span>
                  <select value={d.availability_status || "offline"} onChange={(e) => updateAvailability(d, e.target.value)} style={field}>
                    <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option><option value="suspended">Suspended</option>
                  </select>
                </label>
                <label style={{ display: "block" }}><span style={microLabel}>Assigned vehicle</span>
                  <select value={d.vehicle_id || ""} onChange={(e) => assignVehicle(d, e.target.value)} style={field}>
                    <option value="">No vehicle</option>
                    {usableVehicles.map((x) => <option key={x.id} value={x.id}>{x.registration_number} · {x.category || "—"}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </article>;
        })}
        {drivers.length === 0 && <div style={{ ...card, color: c.textFaint }}>No drivers have been added yet.</div>}
      </div>
    </div>

    {editing && <div onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(null); }} style={{ position: "fixed", inset: 0, zIndex: 140, background: "rgba(8,28,45,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={saveEdit} style={{ ...card, width: "min(520px,100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: theme.shadow.card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Edit driver</h2>
          <button type="button" onClick={() => setEditing(null)} style={{ ...ghost, minHeight: 36, padding: "0 14px" }}>Close</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={field} placeholder="Full name" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} required />
          <input style={field} placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
          <input style={field} type="email" placeholder="Login email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          <label><span style={microLabel}>Assigned vehicle</span><select style={field} value={editForm.vehicle_id} onChange={(e) => setEditForm({ ...editForm, vehicle_id: e.target.value })}><option value="">No vehicle assigned</option>{usableVehicles.map((v) => <option key={v.id} value={v.id}>{v.registration_number} · {v.make || ""} {v.model || ""} · {v.category || "—"}</option>)}</select></label>
          <label><span style={microLabel}>Availability</span><select style={field} value={editForm.availability_status} onChange={(e) => setEditForm({ ...editForm, availability_status: e.target.value })}><option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option><option value="suspended">Suspended</option></select></label>
          <label style={{ display: "flex", alignItems: "center", gap: 9, padding: 10, borderRadius: 10, background: c.bg, fontSize: 13, fontWeight: 700 }}><input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /> Driver account active</label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button type="button" onClick={() => setEditing(null)} style={{ ...ghost, flex: 1 }}>Cancel</button>
          <button type="submit" disabled={savingEdit} style={{ ...btn, flex: 1, opacity: savingEdit ? 0.7 : 1 }}>{savingEdit ? "Saving…" : "Save driver"}</button>
        </div>
      </form>
    </div>}

    {(error || notice) && <div role={error ? "alert" : "status"} style={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", margin: "0 auto", maxWidth: 520, zIndex: 130, padding: "12px 14px", borderRadius: 12, background: error ? "#B42318" : c.navy, color: "#fff", fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, boxShadow: theme.shadow.card }}>
      <span>{error || notice}</span>
      <button onClick={() => { setError(""); setNotice(""); }} aria-label="Dismiss" style={{ border: 0, background: "transparent", color: "inherit", fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 4 }}>×</button>
    </div>}
  </main>;
}
