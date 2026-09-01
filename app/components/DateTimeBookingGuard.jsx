"use client";

import { useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");
function todayString() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nowTimeString() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function parseDateTime(date, time) { if (!date || !time) return null; const d = new Date(`${date}T${time}:00`); return Number.isNaN(d.getTime()) ? null : d; }
function formatTime(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

export default function DateTimeBookingGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/") return undefined;

    let durationSeconds = null;
    let destroyed = false;
    let submitAttempted = false;
    const originalFetch = window.fetch.bind(window);

    const fields = () => ({
      dates: Array.from(document.querySelectorAll('input[type="date"]')),
      times: Array.from(document.querySelectorAll('input[type="time"]')),
    });

    const ensureStyle = () => {
      if (document.getElementById("voynu-datetime-polish")) return;
      const style = document.createElement("style");
      style.id = "voynu-datetime-polish";
      style.textContent = `
        input[data-voynu-datetime-enhanced] {
          box-sizing:border-box!important;width:100%!important;min-height:64px!important;
          padding:0 50px 0 52px!important;border:1.5px solid #d8e7df!important;border-radius:18px!important;
          background-color:#fbfdfc!important;color:#21362b!important;font-size:18px!important;font-weight:700!important;
          letter-spacing:.1px!important;box-shadow:0 2px 7px rgba(18,70,43,.06),inset 0 0 0 1px rgba(255,255,255,.8)!important;
          transition:border-color .18s ease,box-shadow .18s ease,background-color .18s ease,transform .12s ease!important;
        }
        input[data-voynu-datetime-enhanced]:focus {
          border-color:#08783f!important;background-color:#fff!important;box-shadow:0 0 0 4px rgba(8,120,63,.10),0 3px 10px rgba(18,70,43,.08)!important;outline:none!important;
        }
        input[data-voynu-datetime-enhanced][data-voynu-datetime-invalid="true"] {
          border-color:#d34f43!important;background:#fff8f7!important;box-shadow:0 0 0 4px rgba(211,79,67,.10)!important;
        }
        input[data-voynu-datetime-enhanced]::-webkit-calendar-picker-indicator { opacity:.72;cursor:pointer;width:22px;height:22px; }
        [data-voynu-datetime-field] { position:relative!important; }
        [data-voynu-datetime-field="invalid"] input[data-voynu-datetime-enhanced] { border-color:#d34f43!important;background:#fff8f7!important; }
        [data-voynu-datetime-message] {
          box-sizing:border-box!important;display:flex;align-items:flex-start;gap:9px;margin:8px 2px 0!important;padding:10px 12px!important;
          border-radius:12px!important;font-size:13px!important;line-height:1.4!important;font-weight:650!important;
        }
        [data-voynu-datetime-message="error"] { color:#9f3027!important;background:#fff1ef!important;border:1px solid #efc7c2!important; }
        [data-voynu-datetime-message="hint"] { color:#64746c!important;background:transparent!important;border:0!important;padding:6px 2px 0!important;font-weight:550!important; }
        [data-voynu-datetime-message="hint"]::before { content:"";width:6px;height:6px;border-radius:50%;background:#16824b;display:block;margin-top:6px;flex:0 0 6px; }
        [data-voynu-datetime-message="error"]::before { content:"!";width:20px;height:20px;border-radius:50%;background:#d34f43;color:white;display:flex;align-items:center;justify-content:center;font-weight:800;flex:0 0 20px; }
        [data-voynu-datetime-meta] { display:flex;flex-wrap:wrap;gap:7px;margin:8px 2px 0!important; }
        [data-voynu-datetime-chip] { padding:6px 9px;border-radius:999px;background:#eef8f2;color:#2e7650;font-size:12px;font-weight:700; }
      `;
      document.head.appendChild(style);
    };

    const getHost = (input) => {
      if (!input) return null;
      let host = input.closest("[data-field], .form-field, .field, .space-y-2, .space-y-3");
      if (!host || host === document.body) host = input.parentElement;
      return host || input.parentElement || input;
    };

    const decorateInput = (input, type, index) => {
      if (!input) return;
      ensureStyle();
      input.dataset.voynuDatetimeEnhanced = "true";
      input.dataset.voynuDatetimeType = type;
      input.dataset.voynuDatetimeIndex = String(index);
      input.setAttribute("aria-label", type === "date" ? (index === 0 ? "Travel date" : "Return date") : (index === 0 ? "Pickup time" : "Return time"));
      input.style.backgroundImage = type === "date"
        ? "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2308783f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2.5'/%3E%3Cpath d='M16 3v4M8 3v4M3 10h18'/%3E%3C/svg%3E\")"
        : "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2308783f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7.5v5l3.2 3.2'/%3E%3C/svg%3E\")";
      input.style.backgroundRepeat = "no-repeat";
      input.style.backgroundPosition = "16px center";
      input.style.backgroundSize = "22px 22px";
      const host = getHost(input);
      if (host) host.dataset.voynuDatetimeField = host.dataset.voynuDatetimeField === "invalid" ? "invalid" : "valid";
    };

    const removeMessages = (input) => {
      const host = input?.parentElement;
      if (host) host.querySelectorAll("[data-voynu-datetime-message],[data-voynu-datetime-meta]").forEach((n) => n.remove());
      const field = getHost(input);
      if (field && field !== host) field.querySelectorAll("[data-voynu-datetime-message],[data-voynu-datetime-meta]").forEach((n) => n.remove());
      if (field) field.dataset.voynuDatetimeField = "valid";
      if (input) input.dataset.voynuDatetimeInvalid = "false";
    };

    const insertBelowField = (input, node) => {
      const field = getHost(input);
      if (!field || !field.parentElement) { input?.insertAdjacentElement("afterend", node); return; }
      field.parentElement.insertBefore(node, field.nextSibling);
    };

    const addMessage = (input, text, kind = "error") => {
      if (!input) return;
      const field = getHost(input);
      field?.querySelectorAll("[data-voynu-datetime-message]").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.dataset.voynuDatetimeMessage = kind;
      node.textContent = text || "";
      insertBelowField(input, node);
      if (field) field.dataset.voynuDatetimeField = kind === "error" ? "invalid" : "valid";
      input.dataset.voynuDatetimeInvalid = kind === "error" && text ? "true" : "false";
    };

    const addHint = (input, text) => {
      if (!input) return;
      const field = getHost(input);
      field?.querySelectorAll("[data-voynu-datetime-message]").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.dataset.voynuDatetimeMessage = "hint";
      node.textContent = text || "";
      insertBelowField(input, node);
      if (field) field.dataset.voynuDatetimeField = "valid";
      input.dataset.voynuDatetimeInvalid = "false";
    };

    const addMeta = (input, chips) => {
      if (!input || !chips?.length) return;
      const field = getHost(input);
      field?.querySelectorAll("[data-voynu-datetime-meta]").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.dataset.voynuDatetimeMeta = "true";
      chips.forEach((chip) => { const el = document.createElement("span"); el.dataset.voynuDatetimeChip = "true"; el.textContent = chip; node.appendChild(el); });
      insertBelowField(input, node);
    };

    const removeLegacyMessage = () => {
      const legacy = "Pickup time cannot be in the past.";
      document.querySelectorAll("div, p, span, li").forEach((node) => {
        if (node === document.body) return;
        const text = String(node.textContent || "").trim();
        if (text === legacy || text.includes(legacy)) {
          const ownText = Array.from(node.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
          if (text === legacy || ownText === legacy) node.remove();
        }
      });
    };

    const validate = () => {
      if (destroyed) return true;
      const { dates, times } = fields();
      if (!dates.length || !times.length) return true;
      dates.forEach((input, index) => decorateInput(input, "date", index));
      times.forEach((input, index) => decorateInput(input, "time", index));

      const travelDate = dates[0]?.value || "";
      const pickupTime = times[0]?.value || "";
      const returnDate = dates[1]?.value || "";
      const returnTime = times[1]?.value || "";
      const today = todayString();
      const now = nowTimeString();
      let valid = true;

      dates.forEach((input) => { input.min = today; });
      if (travelDate && travelDate < today) { addMessage(dates[0], "Travel date cannot be earlier than today. Please choose today or a future date."); valid = false; }
      else { addHint(dates[0], travelDate === today ? "Today" : "Choose your travel day"); }

      if (travelDate === today) {
        times[0].min = now;
        if (!pickupTime) {
          if (submitAttempted) { addMessage(times[0], "Please choose a pickup time for today."); valid = false; }
          else { addHint(times[0], "Only future pickup times are available today"); }
        } else if (pickupTime < now) {
          addMessage(times[0], "This pickup time has already passed. Please choose a later time today."); valid = false;
        } else { addHint(times[0], "Pickup time selected"); }
      } else {
        times[0].removeAttribute("min");
        if (travelDate) addHint(times[0], "Choose your preferred pickup time");
        else addHint(times[0], "Select a travel date first");
      }

      const isRoundTrip = dates.length > 1 || times.length > 1;
      if (!isRoundTrip) { removeLegacyMessage(); return valid; }

      if (travelDate) { dates[1].min = travelDate > today ? travelDate : today; dates[1].max = travelDate; }
      else { dates[1].min = today; dates[1].removeAttribute("max"); }

      if (returnDate && travelDate && returnDate !== travelDate) {
        addMessage(dates[1], "Round trips must return on the same day. Please select the pickup date."); valid = false;
      } else if (!returnDate) {
        if (submitAttempted) { addMessage(dates[1], "Please choose your return date."); valid = false; }
        else addHint(dates[1], travelDate ? "Same-day return only" : "Select a travel date first");
      } else addHint(dates[1], "Same-day return");

      if (travelDate && returnDate === travelDate && pickupTime) {
        const start = parseDateTime(travelDate, pickupTime);
        if (start && durationSeconds != null) {
          const arrival = new Date(start.getTime() + Number(durationSeconds) * 1000);
          const latest = new Date(arrival.getTime() + 180 * 60000);
          const minReturn = formatTime(arrival);
          const maxReturn = latest.getDate() === arrival.getDate() ? formatTime(latest) : "11:59 PM";
          times[1].min = `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`;
          times[1].max = `${pad(latest.getHours())}:${pad(latest.getMinutes())}`;
          if (!returnTime) {
            if (submitAttempted) { addMessage(times[1], `Please choose a return time after your estimated arrival at ${minReturn}.`); valid = false; }
            else { addHint(times[1], `Choose after arrival • Latest return ${maxReturn}`); addMeta(times[1], [`Arrival ${minReturn}`, `Latest ${maxReturn}`, "Waiting fee applies"]); }
          } else {
            const ret = parseDateTime(returnDate, returnTime);
            if (ret && ret < arrival) { addMessage(times[1], `Return time must be after your estimated arrival at ${minReturn}.`); valid = false; }
            else if (ret && ret > latest) { addMessage(times[1], `Return time must be by ${maxReturn}. Maximum waiting time is 3 hours after arrival.`); valid = false; }
            else { addHint(times[1], "Return time selected"); addMeta(times[1], [`Arrival ${minReturn}`, `Latest ${maxReturn}`, "Waiting fee set in Admin"]); }
          }
        } else {
          times[1].removeAttribute("min"); times[1].removeAttribute("max");
          if (returnTime && pickupTime && returnTime <= pickupTime) { addMessage(times[1], "Return time must be later than pickup time."); valid = false; }
          else addHint(times[1], "Return time will be limited after the route is calculated");
        }
      } else {
        times[1].removeAttribute("min"); times[1].removeAttribute("max");
        if (!returnTime) {
          if (submitAttempted) { addMessage(times[1], "Please choose your return time."); valid = false; }
          else addHint(times[1], "Select a return time after arrival");
        } else if (pickupTime && returnTime <= pickupTime) { addMessage(times[1], "Return time must be later than pickup time."); valid = false; }
      }

      removeLegacyMessage();
      return valid;
    };

    const onChange = () => { window.setTimeout(validate, 0); };
    document.addEventListener("change", onChange, true);
    document.addEventListener("input", onChange, true);

    const onClick = (event) => {
      const target = event.target?.closest?.("button");
      if (!target) return;
      const text = String(target.textContent || "").toLowerCase();
      if (!text.includes("continue to cab selection")) return;
      submitAttempted = true;
      if (!validate()) { event.preventDefault(); event.stopPropagation(); }
    };
    document.addEventListener("click", onClick, true);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes("/api/route-distance")) {
          const clone = response.clone();
          clone.json().then((data) => { if (Number.isFinite(Number(data?.durationSeconds))) { durationSeconds = Number(data.durationSeconds); validate(); } }).catch(() => {});
        }
      } catch {}
      return response;
    };

    const observer = new MutationObserver(() => validate());
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(validate, 300);

    return () => {
      destroyed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("input", onChange, true);
      document.removeEventListener("click", onClick, true);
      window.fetch = originalFetch;
      document.getElementById("voynu-datetime-polish")?.remove();
    };
  }, []);

  return null;
}
