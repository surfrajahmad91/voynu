"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { supabase } from "../../lib/supabaseClient";
import { ADMIN_EMAILS } from "../../lib/admin";
import { theme } from "../../lib/theme";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  passenger_capacity: 4,
  luggage_capacity: 2,
  image_url: "",
  active: true,
  bookable: true,
  sort_order: 10,
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function VehicleCategoriesAdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
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
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setCategories(data || []);
  };

  useEffect(() => {
    if (authorized) fetchCategories();
  }, [authorized]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      slug: category.slug || "",
      description: category.description || "",
      passenger_capacity: category.passenger_capacity ?? 4,
      luggage_capacity: category.luggage_capacity ?? 0,
      image_url: category.image_url || "",
      active: Boolean(category.active),
      bookable: Boolean(category.bookable),
      sort_order: category.sort_order ?? 0,
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    const payload = {
      name: form.name.trim(),
      slug: (form.slug.trim() || slugify(form.name)).toLowerCase(),
      description: form.description.trim() || null,
      passenger_capacity: Math.max(1, Number(form.passenger_capacity) || 1),
      luggage_capacity: Math.max(0, Number(form.luggage_capacity) || 0),
      image_url: form.image_url.trim() || null,
      active: Boolean(form.active),
      bookable: Boolean(form.bookable),
      sort_order: Number(form.sort_order) || 0,
    };

    if (!payload.name || !payload.slug) {
      setError("Name and slug are required.");
      setLoading(false);
      return;
    }

    const query = editingId
      ? supabase.from("vehicle_categories").update(payload).eq("id", editingId)
      : supabase.from("vehicle_categories").insert(payload);

    const { error: saveError } = await query;
    setLoading(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setNotice(editingId ? "Vehicle category updated." : "Vehicle category created.");
    resetForm();
    await fetchCategories();
  };

  const toggleCategory = async (category, field) => {
    setError("");
    setNotice("");

    const { error: updateError } = await supabase
      .from("vehicle_categories")
      .update({ [field]: !category[field] })
      .eq("id", category.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await fetchCategories();
    setNotice(`${field === "active" ? "Active status" : "Bookable status"} updated.`);
  };

  const moveCategory = async (category, direction) => {
    const index = categories.findIndex((item) => item.id === category.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

    const target = categories[targetIndex];
    const currentOrder = Number(category.sort_order) || 0;
    const targetOrder = Number(target.sort_order) || 0;

    setError("");

    const first = await supabase
      .from("vehicle_categories")
      .update({ sort_order: targetOrder })
      .eq("id", category.id);

    if (first.error) {
      setError(first.error.message);
      return;
    }

    const second = await supabase
      .from("vehicle_categories")
      .update({ sort_order: currentOrder })
      .eq("id", target.id);

    if (second.error) {
      setError(second.error.message);
      await fetchCategories();
      return;
    }

    await fetchCategories();
    setNotice("Display order updated.");
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
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 1 }}>VOYNU Admin</div>
            <h1 style={{ margin: "5px 0 0", fontSize: 26 }}>Vehicle Categories</h1>
            <p style={{ margin: "6px 0 0", color: "#6b7a72", fontSize: 13 }}>Customer-facing vehicle categories are controlled here.</p>
          </div>
          <Link href="/admin" style={{ color: theme.colors.primary, fontWeight: 700, fontSize: 13 }}>← Admin</Link>
        </div>

        {(error || notice) && (
          <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: error ? "#fff1f1" : "#eef9f1", color: error ? "#a22" : "#28734b", fontWeight: 700, fontSize: 13 }}>
            {error || notice}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e5ede8", borderRadius: 16, padding: 18, marginBottom: 22 }}>
          <h2 style={{ margin: "0 0 14px", fontSize: 17 }}>{editingId ? "Edit category" : "Add category"}</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Sedan" required style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Slug<input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="sedan" style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Passenger capacity<input type="number" min="1" value={form.passenger_capacity} onChange={(e) => setForm((p) => ({ ...p, passenger_capacity: e.target.value }))} style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Luggage capacity<input type="number" min="0" value={form.luggage_capacity} onChange={(e) => setForm((p) => ({ ...p, luggage_capacity: e.target.value }))} style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Sort order<input type="number" value={form.sort_order} onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))} style={inputStyle} /></label>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Image URL<input value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://…" style={inputStyle} /></label>
          </div>

          <label style={{ display: "block", marginTop: 12, fontSize: 12, fontWeight: 700 }}>Description<textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} placeholder="Comfortable ride" style={{ ...inputStyle, resize: "vertical" }} /></label>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginTop: 12 }}>
            <label style={checkStyle}><input type="checkbox" checked={form.active} onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))} /> Active</label>
            <label style={checkStyle}><input type="checkbox" checked={form.bookable} onChange={(e) => setForm((p) => ({ ...p, bookable: e.target.checked }))} /> Bookable</label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button disabled={loading} type="submit" style={primaryButton}>{loading ? "Saving…" : editingId ? "Save changes" : "Create category"}</button>
            {editingId && <button type="button" onClick={resetForm} style={secondaryButton}>Cancel</button>}
          </div>
        </form>

        <div style={{ display: "grid", gap: 10 }}>
          {categories.map((category, index) => (
            <div key={category.id} style={{ background: "#fff", border: "1px solid #e5ede8", borderRadius: 14, padding: 15, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 300px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 15 }}>{category.name}</strong>
                  <span style={pillStyle}>{category.slug}</span>
                  <span style={category.active ? activePill : inactivePill}>{category.active ? "Active" : "Inactive"}</span>
                  <span style={category.bookable ? activePill : inactivePill}>{category.bookable ? "Bookable" : "Not bookable"}</span>
                </div>
                <div style={{ marginTop: 5, color: "#6b7a72", fontSize: 12 }}>
                  {category.passenger_capacity} passengers · {category.luggage_capacity} luggage · order {category.sort_order}
                </div>
                {category.description && <div style={{ marginTop: 4, color: "#7a8981", fontSize: 12 }}>{category.description}</div>}
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button type="button" onClick={() => moveCategory(category, -1)} disabled={index === 0} style={smallButton}>↑</button>
                <button type="button" onClick={() => moveCategory(category, 1)} disabled={index === categories.length - 1} style={smallButton}>↓</button>
                <button type="button" onClick={() => startEdit(category)} style={smallButton}>Edit</button>
                <button type="button" onClick={() => toggleCategory(category, "active")} style={smallButton}>{category.active ? "Deactivate" : "Activate"}</button>
                <button type="button" onClick={() => toggleCategory(category, "bookable")} style={smallButton}>{category.bookable ? "Unbookable" : "Bookable"}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

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

const checkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12,
  fontWeight: 700,
};

const pillStyle = {
  padding: "3px 7px",
  borderRadius: 999,
  background: "#f1f4f2",
  color: "#617069",
  fontSize: 10,
  fontWeight: 800,
};

const activePill = {
  padding: "3px 7px",
  borderRadius: 999,
  background: "#eef9f1",
  color: "#28734b",
  fontSize: 10,
  fontWeight: 800,
};

const inactivePill = {
  padding: "3px 7px",
  borderRadius: 999,
  background: "#f6eeee",
  color: "#8b5b5b",
  fontSize: 10,
  fontWeight: 800,
};
