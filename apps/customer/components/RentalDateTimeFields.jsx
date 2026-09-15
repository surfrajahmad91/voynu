"use client";

import { useRef } from "react";

const fmt = (value, empty) => {
  if (!value) return { value: empty, hint: "Tap to choose date & time" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { value: empty, hint: "Tap to choose date & time" };
  return {
    value: d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    hint: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
  };
};

function Field({ label, value, onChange, min, icon, empty }) {
  const ref = useRef(null);
  const display = fmt(value, empty);
  return (
    <div className="voynu-rental-datetime-field">
      <label>{label}</label>
      <button type="button" className="voynu-rental-datetime-button" onClick={() => ref.current?.showPicker?.() || ref.current?.click()}>
        <span className="voynu-rental-datetime-icon" aria-hidden="true">{icon}</span>
        <span className="voynu-rental-datetime-copy">
          <strong className={!value ? "placeholder" : ""}>{display.value}</strong>
          <small>{display.hint}</small>
        </span>
        <span className="voynu-rental-datetime-chevron" aria-hidden="true">⌄</span>
      </button>
      <input ref={ref} className="voynu-rental-datetime-native" type="datetime-local" value={value} min={min || undefined} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </div>
  );
}

export default function RentalDateTimeFields({ start, end, onStartChange, onEndChange }) {
  const now = new Date();
  now.setSeconds(0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  const min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const endMin = start || min;
  return (
    <div className="voynu-rental-datetime-grid">
      <Field label="Pickup date & time" value={start} onChange={onStartChange} min={min} empty="Choose pickup date" icon="▣" />
      <Field label="Return date & time" value={end} onChange={onEndChange} min={endMin} empty="Choose return date" icon="▣" />
    </div>
  );
}
