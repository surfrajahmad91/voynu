"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "../../../../../shared/lib/supabaseClient";
import { ADMIN_EMAILS } from "../../../lib/admin";
import { theme } from "../../../../../shared/lib/theme";

const EMPTY_FORM = {
  registration_number: "",
  make: "",
  model: "",
  vehicle_category_id: "",
  fuel_type: "petrol",
  seating_capacity: 4,
  luggage_capacity: 2,
  status: "active",
  active: true,
};

const FUEL_TYPES = ["petrol", "diesel", "cng", "ev", "hybrid", "other"];
const VEHICLE_STATUSES = ["active", "inactive", "maintenance", "retired"];

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "10px 11px",
  border: "1px solid #d9e0dc",
  borderRadius: 9,
  font: "inherit",
  fontSize: 13,
  boxSizing: "border-box",
  background: "#fff",
};

const primaryButton = {
  border: 0,
  borderRadius: 9,
  padding: "10px 14px",
  background: theme.colors.primary,
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #d9e0dc",
  borderRadius: 9,
  padding: "10px 14px",
  background: "#fff",
  color: "#45564c",
  fontWeight: 700,
  cursor: "pointer",
};

const smallButton = {
  border: "1px solid #d9e0dc",
  borderRadius: 8,
  padding: "7px 9px",
  background: "#fff",
  color: "#45564c",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 12,
};

function normaliseVehicle(vehicle) {
  return {
    ...vehicle,
    seating_capacity: vehicle.seating_capacity ?? 4,
    luggage_capacity: vehicle.luggage_capacity ?? 0,
    active: Boolean(vehicle.active),
    status: vehicle.status || "active",
  };
}

export default function AdminVehiclesPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email || "";

      if (!data?.session) {
        router.replace("/login");
        return;
      }

      if (!ADMIN_EMAILS.includes(email)) {
        if (!cancelled) {
          setAuthorized(false);
          setChecking(false);
        }
        return;
      }

      if (!cancelled) {
        setAuthorized(true);
        setChecking(false);
      }
    };

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchCategories = async () => {
    const { data, error: fetchError } = await supabase
      .from("vehicle_categories")
      .select("id,name,slug,passenger_capacity,luggage_capacity,active,bookable,sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setCategories(data || []);
  };

  const fetchVehicles = async () => {
    const { data, error: fetchError } = await supabase
      .from("vehicles")
      .select("*, vehicle_categories(id,name,slug,passenger_capacity,luggage_capacity), drivers(id,full_name,phone)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setVehicles((data || []).map(normaliseVehicle));
  };

  useEffect(() => {
    if (!authorized) return;
    fetchCategories();
    fetchVehicles();
  }, [authorized]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.vehicle_category_id) || null,
    [categories, form.vehicle_category_id]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    setForm((previous) => ({
      ...previous,
      vehicle_category_id: categoryId,
      seating_capacity: category?.passenger_capacity ?? previous.seating_capacity,
      luggage_capacity: category?.luggage_capacity ?? previous.luggage_capacity,
    }));
  };

  const startEdit = (vehicle) => {
    setEditingId(vehicle.id);
    setForm({
      registration_number: vehicle.registration_number || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      vehicle_category_id: vehicle.vehicle_category_id || "",
      fuel_type: vehicle.fuel_type || "petrol",
      seating_capacity: vehicle.seating_capacity ?? 4,
      luggage_capacity: vehicle.luggage_capacity ?? 0,
      status: vehicle.status || "active",
      active: Boolean(vehicle.active),
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const registration = form.registration_number.trim().toUpperCase();
    const seats = Math.max(1, Number(form.seating_capacity) || 1);
    const luggage = Math.max(0, Number(form.luggage_capacity) || 0);

    if (!registration) {
      setError("Registration number is required.");
      setLoading(false);
      return;
    }

    if (!form.vehicle_category_id) {
      setError("Vehicle category is required.");
      setLoading(false);
      return;
    }

    const payload = {
      registration_number: registration,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      vehicle_category_id: form.vehicle_category_id,
      fuel_type: form.fuel_type || null,
      seating_capacity: seats,
      luggage_capacity: luggage,
      status: form.status,
      active: Boolean(form.active),
    };

    // Keep the legacy category text temporarily for backwards compatibility.
    const category = categories.find((item) => item.id === form.vehicle_category_id);
    payload.category = category?.slug || null;

    const result = editingId
      ? await supabase.from("vehicles").update(payload).eq("id", editingId)
      : await supabase.from("vehicles").insert(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setNotice(editingId ? "Vehicle updated." : "Vehicle added.");
    resetForm();
    await fetchVehicles();
  };

  const setVehicleStatus = async (vehicle, status) => {
    setError("");
    setNotice("");

    const active = status === "active";
    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ status, active })
      .eq("id", vehicle.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchVehicles();
    setNotice(`Vehicle ${vehicle.registration_number} set to ${status}.`);
  };

  const toggleActive = async (vehicle) => {
    const nextActive = !vehicle.active;
    const nextStatus = nextActive
      ? vehicle.status === "retired" ? "inactive" : vehicle.status
      : "inactive";

    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ active: nextActive, status: nextStatus })
      .eq("id", vehicle.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchVehicles();
    setNotice(nextActive ? "Vehicle activated." : "Vehicle deactivated.");
  };

  if (checking) {
    return <main style={{ padding: 40, fontFamily: "system-ui" }}>Checking admin access…</main>;
  }

  if (!authorized) {
    return (
      <main style={{ padding: 40, fontFamily: "system-ui" }}>
        <h1>Access denied</h1>
        <p>This area is available only to the VOYNU administrator.</p>
        <Link href="/">Return to VOYNU</Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: theme.colors.bg, padding: "28px 16px 60px", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>VOYNU Admin</div>
            <h1 style={{ margin: "5px 0 0", fontSize: 26 }}>Actual Vehicles</h1>
            <p style={{ margin: "6px 0 0", color: "#6b7a72", fontSize: 13 }}>Manage the real vehicles in the fleet. Category and fuel type are separate.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admin/vehicle-categories" style={{ color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>Vehicle categories</Link>
            <Link href="/admin" style={{ color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>← Admin</Link>
          </div>
        </div>

        {(error || notice) && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: error ? "#fff1f1" : "#eef9f1", color: error ? "#a22" : "#28734b", fontWeight: 700, fontSize: 13 }}>
            {error || notice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e5ede8", borderRadius: 16, padding: 18, marginBottom: 22 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>{editingId ? "Edit vehicle" : "Add vehicle"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Registration number<input value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))} placeholder="UP78XX0000" required style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Make<input value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} placeholder="Hyundai" style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Model<input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="Kona" style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Vehicle category<select value={form.vehicle_category_id} onChange={(e) => handleCategoryChange(e.target.value)} required style={inputStyle}>
              <option value="">Select category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.active ? "" : " — inactive"}{category.bookable ? "" : " — not bookable"}
                </option>
              ))}
            </select></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Fuel type<select value={form.fuel_type} onChange={(e) => setForm((p) => ({ ...p, fuel_type: e.target.value }))} style={inputStyle}>
              {FUEL_TYPES.map((fuel) => <option key={fuel} value={fuel}>{fuel.toUpperCase()}</option>)}
            </select></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Seats<input type="number" min="1" value={form.seating_capacity} onChange={(e) => setForm((p) => ({ ...p, seating_capacity: e.target.value }))} style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Luggage capacity<input type="number" min="0" value={form.luggage_capacity} onChange={(e) => setForm((p) => ({ ...p, luggage_capacity: e.target.value }))} style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Status<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
              {VEHICLE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select></label>
          </div>

          {selectedCategory && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#f5f8f6", color: "#5c6c63", fontSize: 12 }}>
              Category defaults: {selectedCategory.passenger_capacity} passengers · {selectedCategory.luggage_capacity} luggage. The actual vehicle's seat/luggage values can be overridden when the physical vehicle differs.
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, fontSize: 12, fontWeight: 700 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Active fleet vehicle
          </label>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button disabled={loading} type="submit" style={primaryButton}>{loading ? "Saving…" : editingId ? "Save changes" : "Add vehicle"}</button>
            {editingId && <button type="button" onClick={resetForm} style={secondaryButton}>Cancel</button>}
          </div>
        </form>

        <div style={{ display: "grid", gap: 10 }}>
          {vehicles.map((vehicle) => {
            const assignedDriver = Array.isArray(vehicle.drivers) ? vehicle.drivers[0] : vehicle.drivers;
            return (
              <div key={vehicle.id} style={{ background: "#fff", border: "1px solid #e5ede8", borderRadius: 14, padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 420px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 16 }}>{vehicle.registration_number}</strong>
                      <span style={{ padding: "3px 7px", borderRadius: 999, background: "#f1f4f2", color: "#617069", fontSize: 10, fontWeight: 800 }}>{vehicle.vehicle_categories?.name || vehicle.category || "No category"}</span>
                      <span style={{ padding: "3px 7px", borderRadius: 999, background: vehicle.active ? "#eef9f1" : "#f6eeee", color: vehicle.active ? "#28734b" : "#8b5b5b", fontSize: 10, fontWeight: 800 }}>{vehicle.active ? "Active" : "Inactive"}</span>
                      <span style={{ padding: "3px 7px", borderRadius: 999, background: "#f1f4f2", color: "#617069", fontSize: 10, fontWeight: 800 }}>{vehicle.status}</span>
                    </div>
                    <div style={{ marginTop: 6, color: "#5c6c63", fontSize: 13 }}>
                      {vehicle.make || "—"} {vehicle.model || ""} · {vehicle.fuel_type || "—"} · {vehicle.seating_capacity} seats · {vehicle.luggage_capacity ?? 0} luggage
                    </div>
                    <div style={{ marginTop: 5, color: "#7a8981", fontSize: 12 }}>
                      {assignedDriver ? `Driver: ${assignedDriver.full_name}` : "No driver assigned"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => startEdit(vehicle)} style={smallButton}>Edit</button>
                    <button type="button" onClick={() => toggleActive(vehicle)} style={smallButton}>{vehicle.active ? "Deactivate" : "Activate"}</button>
                    {vehicle.status !== "maintenance" && vehicle.status !== "retired" && <button type="button" onClick={() => setVehicleStatus(vehicle, "maintenance")} style={smallButton}>Maintenance</button>}
                    {vehicle.status === "maintenance" && <button type="button" onClick={() => setVehicleStatus(vehicle, "active")} style={smallButton}>Back to active</button>}
                    {vehicle.status !== "retired" && <button type="button" onClick={() => setVehicleStatus(vehicle, "retired")} style={{ ...smallButton, color: "#8b5b5b" }}>Retire</button>}
                  </div>
                </div>
              </div>
            );
          })}

          {vehicles.length === 0 && <p style={{ color: "#7a8981", fontSize: 13 }}>No vehicles yet.</p>}
        </div>
      </div>
    </main>
  );
}
