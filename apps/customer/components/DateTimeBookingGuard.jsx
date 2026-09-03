"use client";

import { useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");
const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseLocal = (date, time) => {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const dateLabel = (value, long = false) => {
  if (!value) return "";
  const d = new Date(`${value}T12:00:00`);
  return d.toLocaleDateString("en-IN", long
    ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    : { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};
const timeLabel = (dOrValue) => {
  const d = dOrValue instanceof Date ? dOrValue : parseLocal("2000-01-01", dOrValue);
  return d ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";
};
const toMinutes = (value) => {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const fromMinutes = (minutes) => `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;

export default function DateTimeBookingGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/") return undefined;

    let durationSeconds = null;
    let destroyed = false;
    let observer = null;
    let raf = 0;
    let activeInput = null;
    let calendarMonth = new Date();
    const originalFetch = window.fetch.bind(window);
    const ids = ["travelDate", "pickupTime", "returnDate", "returnTime"];
    const get = (id) => document.getElementById(id);

    const ensureStyles = () => {
      if (document.getElementById("voynu-datetime-polish-v5")) return;
      const style = document.createElement("style");
      style.id = "voynu-datetime-polish-v5";
      style.textContent = `
        .voynu-datetime-wrap{position:relative!important}
        .voynu-datetime-native{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}
        .voynu-datetime-button{width:100%;min-height:64px;display:flex;align-items:center;gap:13px;padding:10px 14px;border:1.5px solid #dbe8e0;border-radius:17px;background:linear-gradient(180deg,#fbfdfc,#f6faf7);color:#183128;font:inherit;text-align:left;cursor:pointer;transition:.18s ease;box-shadow:0 3px 12px rgba(18,70,43,.045)}
        .voynu-datetime-button:hover{border-color:#9bc7ad;background:#fff;box-shadow:0 5px 16px rgba(18,70,43,.08)}
        .voynu-datetime-button:focus-visible{outline:none;border-color:#08783f;box-shadow:0 0 0 4px rgba(8,120,63,.11)}
        .voynu-datetime-button.is-invalid{border-color:#d34f43;background:#fff8f7;box-shadow:0 0 0 4px rgba(211,79,67,.08)}
        .voynu-datetime-button-icon{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:#e7f5eb;color:#08783f}
        .voynu-datetime-button-copy{min-width:0;flex:1}
        .voynu-datetime-button-value{display:block;font-size:17px;line-height:1.15;font-weight:800;letter-spacing:-.2px;color:#183128}
        .voynu-datetime-button-value.placeholder{color:#9aa8a1;font-weight:650}
        .voynu-datetime-button-hint{display:block;margin-top:4px;color:#708078;font-size:10.5px;font-weight:600}
        .voynu-datetime-chevron{width:18px;height:18px;flex:0 0 18px;color:#607169}
        .voynu-datetime-inline-error{display:flex;align-items:flex-start;gap:8px;margin:7px 2px 0;padding:9px 11px;border:1px solid #efc7c2;border-radius:11px;background:#fff1ef;color:#9f3027;font-size:11.5px;line-height:1.4;font-weight:700}
        .voynu-datetime-inline-error .err-dot{width:19px;height:19px;flex:0 0 19px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#d34f43;color:#fff;font-size:11px;font-weight:900}
        .voynu-datetime-meta{display:flex;flex-wrap:wrap;gap:6px;margin:7px 2px 0}
        .voynu-datetime-meta span{padding:5px 8px;border-radius:999px;background:#eef8f2;color:#2e7650;font-size:10px;font-weight:750}
        .voynu-datetime-backdrop{position:fixed;inset:0;z-index:99990;background:rgba(13,28,21,.38);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .18s ease}
        .voynu-datetime-backdrop.open{opacity:1;pointer-events:auto}
        .voynu-datetime-sheet{position:fixed;left:50%;bottom:0;z-index:99991;width:min(560px,100%);max-height:min(88vh,760px);overflow:auto;transform:translate(-50%,105%);border-radius:26px 26px 0 0;background:#fff;box-shadow:0 -18px 60px rgba(0,0,0,.22);transition:transform .24s cubic-bezier(.2,.8,.2,1);padding:10px 18px calc(22px + env(safe-area-inset-bottom))}
        .voynu-datetime-sheet.open{transform:translate(-50%,0)}
        .voynu-datetime-grab{width:42px;height:4px;border-radius:99px;background:#d5ded9;margin:3px auto 15px}
        .voynu-datetime-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
        .voynu-datetime-head h3{margin:0;color:#183128;font-size:19px;font-weight:850;letter-spacing:-.3px}
        .voynu-datetime-head p{margin:3px 0 0;color:#7b8982;font-size:10.5px;font-weight:600}
        .voynu-datetime-close{width:36px;height:36px;border:0;border-radius:50%;background:#f0f4f1;color:#53645b;font-size:21px;line-height:1;cursor:pointer}
        .voynu-datetime-quick{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}
        .voynu-datetime-quick button{min-height:54px;padding:8px 11px;border:1px solid #dcebe1;border-radius:14px;background:#f7fbf8;color:#2d4739;font:inherit;text-align:left;cursor:pointer}
        .voynu-datetime-quick button strong{display:block;font-size:12px;font-weight:850}.voynu-datetime-quick button span{display:block;margin-top:3px;font-size:10px;color:#78877f;font-weight:600}
        .voynu-datetime-quick button.active{border-color:#0a7d42;background:#edf8f1;box-shadow:0 0 0 2px rgba(8,120,63,.08)}
        .voynu-datetime-month{display:flex;align-items:center;justify-content:space-between;margin:2px 0 10px}
        .voynu-datetime-month strong{font-size:15px;color:#243a2f}.voynu-datetime-month button{width:36px;height:36px;border:1px solid #dfe8e3;border-radius:50%;background:#fff;color:#355146;font-size:18px;cursor:pointer}
        .voynu-datetime-week,.voynu-datetime-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
        .voynu-datetime-week span{text-align:center;color:#9aa69f;font-size:9px;font-weight:800;padding-bottom:3px}
        .voynu-datetime-day{aspect-ratio:1;border:0;border-radius:12px;background:#f7faf8;color:#33483d;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
        .voynu-datetime-day.empty{visibility:hidden}.voynu-datetime-day.disabled{color:#c6cfca;background:#fafbfa;cursor:not-allowed}.voynu-datetime-day.today{box-shadow:inset 0 0 0 1px #a9d2b8}.voynu-datetime-day.selected{background:#0a7d42;color:#fff;box-shadow:0 5px 12px rgba(8,120,63,.22)}
        .voynu-datetime-time-groups{display:flex;flex-direction:column;gap:15px}.voynu-datetime-time-group h4{margin:0 0 8px;color:#65756d;font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:850}
        .voynu-datetime-times{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.voynu-datetime-time{min-height:48px;border:1px solid #dce7e1;border-radius:13px;background:#f8fbf9;color:#263e32;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.voynu-datetime-time:hover{border-color:#7fbb98;background:#f0f9f3}.voynu-datetime-time.selected{background:#0a7d42;border-color:#0a7d42;color:#fff;box-shadow:0 5px 12px rgba(8,120,63,.2)}.voynu-datetime-time.disabled{color:#c3ccc7;background:#fafbfa;border-color:#edf1ee;cursor:not-allowed}
        .voynu-datetime-info{display:flex;gap:9px;align-items:flex-start;margin:14px 0 0;padding:11px 12px;border-radius:13px;background:#f1f8f3;color:#527063;font-size:10.5px;line-height:1.45;font-weight:650}.voynu-datetime-info strong{color:#276c48}
        .voynu-datetime-confirm{width:100%;min-height:52px;margin-top:15px;border:0;border-radius:14px;background:linear-gradient(135deg,#0a7d42,#075c31);color:#fff;font:inherit;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 9px 20px rgba(8,120,63,.2)}
        @media(max-width:380px){.voynu-datetime-times{grid-template-columns:repeat(2,1fr)}.voynu-datetime-sheet{padding-left:14px;padding-right:14px}.voynu-datetime-button-value{font-size:16px}}
      `;
      document.head.appendChild(style);
    };

    const field = (input) => input?.closest(".field") || input?.parentElement || null;
    const clearLocal = (input) => {
      if (!input) return;
      const f = field(input);
      f?.querySelectorAll(".voynu-datetime-inline-error,.voynu-datetime-meta").forEach((n) => n.remove());
      f?.querySelector(".voynu-datetime-button")?.classList.remove("is-invalid");
    };
    const addLocal = (input, text) => {
      if (!input || !text) return;
      const f = field(input);
      if (!f) return;
      f.querySelectorAll(".voynu-datetime-inline-error").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.className = "voynu-datetime-inline-error";
      node.innerHTML = `<span class="err-dot">!</span><span>${text}</span>`;
      f.querySelector(".voynu-datetime-button")?.classList.add("is-invalid");
      input.insertAdjacentElement("afterend", node);
    };
    const addMeta = (input, chips) => {
      if (!input || !chips?.length) return;
      const f = field(input);
      if (!f) return;
      f.querySelectorAll(".voynu-datetime-meta").forEach((n) => n.remove());
      const node = document.createElement("div"); node.className = "voynu-datetime-meta";
      chips.forEach((chip) => { const el = document.createElement("span"); el.textContent = chip; node.appendChild(el); });
      input.insertAdjacentElement("afterend", node);
    };

    const setNativeValue = (input, value) => {
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const iconSvg = (kind) => kind === "date"
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 3.2"/></svg>`;

    const getBounds = (input) => {
      const id = input?.id;
      const today = localDate();
      if (id === "travelDate") return { min: today, max: null };
      if (id === "returnDate") {
        const travel = get("travelDate")?.value || today;
        return { min: travel > today ? travel : today, max: travel || today };
      }
      return { min: null, max: null };
    };

    const makeDateDays = (input) => {
      const bounds = getBounds(input);
      const year = calendarMonth.getFullYear();
      const month = calendarMonth.getMonth();
      const first = new Date(year, month, 1);
      const days = new Date(year, month + 1, 0).getDate();
      const offset = first.getDay();
      const current = input.value;
      const today = localDate();
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < offset; i++) { const empty = document.createElement("button"); empty.className = "voynu-datetime-day empty"; empty.tabIndex = -1; fragment.appendChild(empty); }
      for (let day = 1; day <= days; day++) {
        const value = `${year}-${pad(month + 1)}-${pad(day)}`;
        const button = document.createElement("button"); button.type = "button"; button.className = "voynu-datetime-day"; button.textContent = String(day);
        const disabled = (bounds.min && value < bounds.min) || (bounds.max && value > bounds.max);
        if (disabled) button.classList.add("disabled");
        if (value === today) button.classList.add("today");
        if (value === current) button.classList.add("selected");
        if (!disabled) button.addEventListener("click", () => { setNativeValue(input, value); closeSheet(); refresh(); if (input.id === "travelDate") { const rt = get("returnDate"); if (rt && !rt.value) setNativeValue(rt, value); } });
        fragment.appendChild(button);
      }
      return fragment;
    };

    const renderDateSheet = (input, body) => {
      const value = input.value;
      const today = localDate();
      const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = localDate(tomorrowDate);
      body.innerHTML = `
        <div class="voynu-datetime-head"><div><h3>When are you travelling?</h3><p>Choose a date that works for you.</p></div><button class="voynu-datetime-close" type="button" aria-label="Close">×</button></div>
        <div class="voynu-datetime-quick">
          <button type="button" data-date="${today}"><strong>Today</strong><span>${dateLabel(today)}</span></button>
          <button type="button" data-date="${tomorrow}"><strong>Tomorrow</strong><span>${dateLabel(tomorrow)}</span></button>
        </div>
        <div class="voynu-datetime-month"><button type="button" data-prev aria-label="Previous month">‹</button><strong></strong><button type="button" data-next aria-label="Next month">›</button></div>
        <div class="voynu-datetime-week"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
        <div class="voynu-datetime-calendar"></div>
        <button type="button" class="voynu-datetime-confirm">Done</button>`;
      body.querySelector(".voynu-datetime-close").addEventListener("click", closeSheet);
      body.querySelectorAll("[data-date]").forEach((button) => button.addEventListener("click", () => { setNativeValue(input, button.dataset.date); closeSheet(); refresh(); if (input.id === "travelDate") { const rt = get("returnDate"); if (rt && !rt.value) setNativeValue(rt, button.dataset.date); } }));
      const title = body.querySelector(".voynu-datetime-month strong");
      const redraw = () => { title.textContent = calendarMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" }); const cal = body.querySelector(".voynu-datetime-calendar"); cal.innerHTML = ""; cal.appendChild(makeDateDays(input)); const bounds = getBounds(input); const currentMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1); const minMonth = bounds.min ? new Date(`${bounds.min}T12:00:00`) : null; const maxMonth = bounds.max ? new Date(`${bounds.max}T12:00:00`) : null; body.querySelector("[data-prev]").disabled = Boolean(minMonth && currentMonth <= new Date(minMonth.getFullYear(), minMonth.getMonth(), 1)); body.querySelector("[data-next]").disabled = Boolean(maxMonth && currentMonth >= new Date(maxMonth.getFullYear(), maxMonth.getMonth(), 1)); };
      body.querySelector("[data-prev]").addEventListener("click", () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1); redraw(); });
      body.querySelector("[data-next]").addEventListener("click", () => { calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1); redraw(); });
      body.querySelector(".voynu-datetime-confirm").addEventListener("click", closeSheet);
      redraw();
    };

    const buildTimeSlots = (input) => {
      const id = input.id;
      const travel = get("travelDate")?.value;
      const pickup = get("pickupTime")?.value;
      const selectedDate = id === "returnTime" ? (get("returnDate")?.value || travel) : travel;
      const now = new Date();
      let min = 0; let max = 1439;
      if (selectedDate === localDate(now) && id !== "returnTime") {
        min = Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 30) * 30;
      }
      if (id === "returnTime" && selectedDate === localDate(now)) {
        min = Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 30) * 30;
      }
      if (id === "returnTime" && selectedDate === travel && pickup && durationSeconds != null) {
        const start = parseLocal(travel, pickup);
        if (start) {
          const arrival = new Date(start.getTime() + Number(durationSeconds) * 1000);
          const latest = new Date(arrival.getTime() + 180 * 60000);
          min = Math.max(min, arrival.getHours() * 60 + arrival.getMinutes());
          max = Math.min(max, latest.getHours() * 60 + latest.getMinutes());
        }
      }
      const slots = [];
      for (let m = 0; m <= 1410; m += 30) slots.push({ value: fromMinutes(m), minutes: m, disabled: m < min || m > max });
      return { slots, min, max, selectedDate };
    };

    const renderTimeSheet = (input, body) => {
      const { slots, min, max, selectedDate } = buildTimeSlots(input);
      const groups = [["Morning", slots.filter((s) => s.minutes < 12 * 60)], ["Afternoon", slots.filter((s) => s.minutes >= 12 * 60 && s.minutes < 17 * 60)], ["Evening", slots.filter((s) => s.minutes >= 17 * 60)]];
      body.innerHTML = `<div class="voynu-datetime-head"><div><h3>${input.id === "returnTime" ? "When will you return?" : "When should we pick you up?"}</h3><p>${selectedDate ? dateLabel(selectedDate, true) : "Select a travel date first."}</p></div><button class="voynu-datetime-close" type="button" aria-label="Close">×</button></div><div class="voynu-datetime-time-groups"></div><div class="voynu-datetime-info"></div><button type="button" class="voynu-datetime-confirm">Done</button>`;
      body.querySelector(".voynu-datetime-close").addEventListener("click", closeSheet);
      const groupsEl = body.querySelector(".voynu-datetime-time-groups");
      groups.forEach(([name, items]) => {
        const group = document.createElement("div"); group.className = "voynu-datetime-time-group"; const h = document.createElement("h4"); h.textContent = name; group.appendChild(h); const grid = document.createElement("div"); grid.className = "voynu-datetime-times";
        items.forEach((slot) => { const b = document.createElement("button"); b.type = "button"; b.className = `voynu-datetime-time${slot.value === input.value ? " selected" : ""}${slot.disabled ? " disabled" : ""}`; b.textContent = timeLabel(slot.value); if (!slot.disabled) b.addEventListener("click", () => { setNativeValue(input, slot.value); closeSheet(); refresh(); }); grid.appendChild(b); });
        group.appendChild(grid); if (grid.children.length) groupsEl.appendChild(group);
      });
      const info = body.querySelector(".voynu-datetime-info");
      if (input.id === "pickupTime" && selectedDate === localDate() && min >= 1440) info.innerHTML = `<span>ℹ</span><span><strong>Today is nearly over.</strong> Please choose tomorrow or a later date.</span>`;
      else if (input.id === "returnTime" && durationSeconds != null && travel && pickup && selectedDate === travel) {
        const start = parseLocal(travel, pickup); const arrival = start ? new Date(start.getTime() + Number(durationSeconds) * 1000) : null; const latest = arrival ? new Date(arrival.getTime() + 180 * 60000) : null;
        info.innerHTML = arrival && latest ? `<span>↻</span><span>Estimated arrival <strong>${timeLabel(arrival)}</strong> · Latest return <strong>${timeLabel(latest)}</strong> · Waiting charges may apply.</span>` : `<span>ℹ</span><span>Return must be after your estimated arrival and within the allowed waiting window.</span>`;
      } else info.innerHTML = `<span>✓</span><span>Times are shown in 30-minute slots so choosing your pickup is quick and clear.</span>`;
      body.querySelector(".voynu-datetime-confirm").addEventListener("click", closeSheet);
    };

    let backdrop = null; let sheet = null; let body = null;
    const ensureSheet = () => {
      if (backdrop) return;
      backdrop = document.createElement("div"); backdrop.className = "voynu-datetime-backdrop";
      sheet = document.createElement("div"); sheet.className = "voynu-datetime-sheet";
      const grab = document.createElement("div"); grab.className = "voynu-datetime-grab";
      body = document.createElement("div");
      sheet.appendChild(grab); sheet.appendChild(body); document.body.appendChild(backdrop); document.body.appendChild(sheet);
      backdrop.addEventListener("click", closeSheet);
    };
    function closeSheet() { if (!backdrop) return; backdrop.classList.remove("open"); sheet.classList.remove("open"); activeInput = null; }
    const openSheet = (input) => {
      activeInput = input; ensureSheet(); clearLocal(input);
      if (input.type === "date") { const value = input.value || getBounds(input).min || localDate(); calendarMonth = new Date(`${value}T12:00:00`); renderDateSheet(input, body); }
      else renderTimeSheet(input, body);
      requestAnimationFrame(() => { backdrop.classList.add("open"); sheet.classList.add("open"); });
    };

    const updateButton = (input) => {
      if (!input) return;
      const button = field(input)?.querySelector(`.voynu-datetime-button[data-for="${input.id}"]`);
      if (!button) return;
      const value = button.querySelector(".voynu-datetime-button-value"); const hint = button.querySelector(".voynu-datetime-button-hint");
      if (input.type === "date") { value.textContent = input.value ? dateLabel(input.value) : (input.id === "returnDate" ? "Choose return date" : "Choose travel date"); hint.textContent = input.value ? (input.id === "returnDate" ? "Return journey" : "Your journey date") : "Tap to open calendar"; }
      else { value.textContent = input.value ? timeLabel(input.value) : (input.id === "returnTime" ? "Choose return time" : "Choose pickup time"); hint.textContent = input.value ? "Selected time" : "Tap to choose a time"; }
      value.classList.toggle("placeholder", !input.value);
    };

    const wrapInput = (input, kind) => {
      if (!input || input.dataset.voynuDatetimeV5 === "true") { if (input) updateButton(input); return; }
      ensureStyles(); input.dataset.voynuDatetimeV5 = "true"; input.dataset.voynuDatetimeKind = kind; input.classList.add("voynu-datetime-native");
      const parent = input.parentElement; if (!parent) return; parent.classList.add("voynu-datetime-wrap");
      const button = document.createElement("button"); button.type = "button"; button.className = "voynu-datetime-button"; button.dataset.for = input.id; button.innerHTML = `<span class="voynu-datetime-button-icon">${iconSvg(kind)}</span><span class="voynu-datetime-button-copy"><span class="voynu-datetime-button-value placeholder"></span><span class="voynu-datetime-button-hint"></span></span><span class="voynu-datetime-chevron"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>`;
      button.addEventListener("click", () => openSheet(input)); input.insertAdjacentElement("beforebegin", button); updateButton(input);
    };

    const suppressGlobalMessage = () => {
      document.querySelectorAll(".message.errorMessage,[role=alert]").forEach((node) => {
        const text = String(node.textContent || "").trim(); if (!text) return;
        let target = null;
        if (/pickup time/i.test(text)) target = get("pickupTime"); else if (/travel date/i.test(text)) target = get("travelDate"); else if (/return date/i.test(text)) target = get("returnDate"); else if (/return time/i.test(text)) target = get("returnTime");
        if (!target || !/past|before|later|select|choose|arrival|same day/i.test(text)) return;
        node.style.setProperty("display", "none", "important"); node.setAttribute("aria-hidden", "true"); addLocal(target, text.replace(/^!\s*/, ""));
      });
    };

    const refresh = () => {
      if (destroyed) return; ensureStyles();
      const travelDate = get("travelDate"); const pickupTime = get("pickupTime"); const returnDate = get("returnDate"); const returnTime = get("returnTime");
      wrapInput(travelDate, "date"); wrapInput(pickupTime, "time"); wrapInput(returnDate, "date"); wrapInput(returnTime, "time");
      const today = localDate(); const now = localTime();
      if (travelDate) travelDate.min = today;
      if (pickupTime) { if (travelDate?.value === today) pickupTime.min = now; else pickupTime.removeAttribute("min"); }
      if (returnDate) { returnDate.min = travelDate?.value && travelDate.value > today ? travelDate.value : today; if (travelDate?.value) returnDate.max = travelDate.value; }
      if (travelDate?.value === today && pickupTime?.value && pickupTime.value < now) addLocal(pickupTime, "That pickup time has already passed. Please choose a later time today.");
      if (returnDate && returnTime && travelDate?.value && returnDate.value === travelDate.value && pickupTime?.value && durationSeconds != null) {
        const start = parseLocal(travelDate.value, pickupTime.value);
        if (start) { const arrival = new Date(start.getTime() + Number(durationSeconds) * 1000); const latest = new Date(arrival.getTime() + 180 * 60000); returnTime.min = `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`; returnTime.max = `${pad(latest.getHours())}:${pad(latest.getMinutes())}`; const ret = parseLocal(returnDate.value, returnTime.value); if (ret && ret < arrival) addLocal(returnTime, `Return must be after your estimated arrival at ${timeLabel(arrival)}.`); else if (ret && ret > latest) addLocal(returnTime, `Please return by ${timeLabel(latest)}. Maximum waiting time is 3 hours after arrival.`); else if (ret) addMeta(returnTime, [`Arrival ${timeLabel(arrival)}`, `Latest ${timeLabel(latest)}`]); }
      }
      [travelDate,pickupTime,returnDate,returnTime].forEach(updateButton); suppressGlobalMessage();
    };

    const onInput = (event) => { if (!ids.includes(event.target?.id)) return; clearLocal(event.target); window.setTimeout(refresh, 0); };
    const onChange = (event) => { if (!ids.includes(event.target?.id)) return; clearLocal(event.target); window.setTimeout(refresh, 0); };
    document.addEventListener("input", onInput, true); document.addEventListener("change", onChange, true);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes("/api/route-distance")) { const clone = response.clone(); clone.json().then((data) => { if (Number.isFinite(Number(data?.durationSeconds))) { durationSeconds = Number(data.durationSeconds); refresh(); } }).catch(() => {}); }
      } catch {}
      return response;
    };

    observer = new MutationObserver(() => { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(refresh); });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(refresh, 250);
    return () => { destroyed = true; clearTimeout(timer); if (raf) cancelAnimationFrame(raf); observer?.disconnect(); document.removeEventListener("input", onInput, true); document.removeEventListener("change", onChange, true); window.fetch = originalFetch; backdrop?.remove(); sheet?.remove(); document.getElementById("voynu-datetime-polish-v5")?.remove(); };
  }, []);

  return null;
}
