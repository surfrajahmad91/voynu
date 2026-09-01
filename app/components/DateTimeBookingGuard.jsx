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
const timeLabel = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function DateTimeBookingGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/") return undefined;

    let durationSeconds = null;
    let destroyed = false;
    let observer = null;
    let raf = 0;
    const originalFetch = window.fetch.bind(window);
    const ids = ["travelDate", "pickupTime", "returnDate", "returnTime"];
    const get = (id) => document.getElementById(id);

    const ensureStyles = () => {
      if (document.getElementById("voynu-datetime-polish-v2")) return;
      const style = document.createElement("style");
      style.id = "voynu-datetime-polish-v2";
      style.textContent = `
        .voynu-datetime-wrap{position:relative!important}
        input[data-voynu-datetime-v2="true"]{box-sizing:border-box!important;width:100%!important;min-height:58px!important;padding:0 48px 0 50px!important;border:1.5px solid #dbe8e0!important;border-radius:16px!important;background:#f9fcfa!important;color:#183128!important;font-size:17px!important;font-weight:750!important;box-shadow:0 2px 8px rgba(18,70,43,.05)!important;transition:border-color .18s ease,box-shadow .18s ease,background .18s ease!important}
        input[data-voynu-datetime-v2="true"]:focus{border-color:#08783f!important;background:#fff!important;box-shadow:0 0 0 4px rgba(8,120,63,.10),0 4px 12px rgba(18,70,43,.07)!important;outline:none!important}
        input[data-voynu-datetime-v2="true"][data-voynu-datetime-invalid="true"]{border-color:#d34f43!important;background:#fff8f7!important;box-shadow:0 0 0 4px rgba(211,79,67,.09)!important}
        input[data-voynu-datetime-v2="true"]::-webkit-calendar-picker-indicator{opacity:.7;cursor:pointer;width:22px;height:22px}
        .voynu-datetime-icon{position:absolute!important;left:16px!important;top:50%!important;transform:translateY(-50%)!important;width:22px!important;height:22px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#08783f!important;pointer-events:none!important;z-index:2!important}
        .voynu-datetime-local-error{display:flex!important;align-items:flex-start!important;gap:9px!important;margin:7px 2px 0!important;padding:10px 12px!important;border:1px solid #efc7c2!important;border-radius:12px!important;background:#fff1ef!important;color:#9f3027!important;font-size:12.5px!important;line-height:1.4!important;font-weight:650!important}
        .voynu-datetime-local-error::before{content:"!";width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:#d34f43;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
        .voynu-datetime-hint{margin:7px 2px 0!important;color:#64746c!important;font-size:11.5px!important;line-height:1.35!important;font-weight:550!important}
        .voynu-datetime-meta{display:flex!important;flex-wrap:wrap!important;gap:7px!important;margin:8px 2px 0!important}
        .voynu-datetime-chip{padding:6px 9px!important;border-radius:999px!important;background:#eef8f2!important;color:#2e7650!important;font-size:11px!important;font-weight:750!important}
        .voynu-global-datetime-error{display:none!important}
      `;
      document.head.appendChild(style);
    };

    const field = (input) => input?.closest(".field") || input?.parentElement || null;
    const clearLocal = (input) => {
      if (!input) return;
      field(input)?.querySelectorAll(".voynu-datetime-local-error,.voynu-datetime-hint,.voynu-datetime-meta").forEach((n) => n.remove());
      input.dataset.voynuDatetimeInvalid = "false";
    };
    const addLocal = (input, text, type = "error") => {
      if (!input || !text) return;
      const f = field(input);
      if (!f) return;
      f.querySelectorAll(".voynu-datetime-local-error,.voynu-datetime-hint,.voynu-datetime-meta").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.className = type === "error" ? "voynu-datetime-local-error" : "voynu-datetime-hint";
      node.textContent = text;
      input.insertAdjacentElement("afterend", node);
      input.dataset.voynuDatetimeInvalid = type === "error" ? "true" : "false";
    };
    const addMeta = (input, chips) => {
      if (!input || !chips?.length) return;
      const f = field(input);
      if (!f) return;
      f.querySelectorAll(".voynu-datetime-meta").forEach((n) => n.remove());
      const node = document.createElement("div");
      node.className = "voynu-datetime-meta";
      chips.forEach((chip) => { const el = document.createElement("span"); el.className = "voynu-datetime-chip"; el.textContent = chip; node.appendChild(el); });
      input.insertAdjacentElement("afterend", node);
    };
    const wrapInput = (input, kind) => {
      if (!input || input.dataset.voynuDatetimeV2 === "true") return;
      ensureStyles();
      input.dataset.voynuDatetimeV2 = "true";
      input.dataset.voynuDatetimeKind = kind;
      const parent = input.parentElement;
      if (!parent) return;
      parent.classList.add("voynu-datetime-wrap");
      const icon = document.createElement("span");
      icon.className = "voynu-datetime-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = kind === "date"
        ? `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`
        : `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5l3.2 3.2"/></svg>`;
      parent.insertBefore(icon, input);
    };

    const suppressGlobalMessage = () => {
      document.querySelectorAll(".message.errorMessage,[role=alert]").forEach((node) => {
        const text = String(node.textContent || "").trim();
        if (!text) return;
        let target = null;
        if (/pickup time/i.test(text)) target = get("pickupTime");
        else if (/return date/i.test(text)) target = get("returnDate");
        else if (/return time/i.test(text)) target = get("returnTime");
        if (target && /past|before|later|select|choose|arrival|same day/i.test(text)) {
          node.classList.add("voynu-global-datetime-error");
          addLocal(target, text.replace(/^!\s*/, ""), "error");
        }
      });
    };

    const refresh = () => {
      if (destroyed) return;
      ensureStyles();
      const travelDate = get("travelDate");
      const pickupTime = get("pickupTime");
      const returnDate = get("returnDate");
      const returnTime = get("returnTime");
      wrapInput(travelDate, "date");
      wrapInput(pickupTime, "time");
      wrapInput(returnDate, "date");
      wrapInput(returnTime, "time");
      if (!travelDate || !pickupTime) return;

      const today = localDate();
      const now = localTime();
      travelDate.min = today;
      if (travelDate.value === today) pickupTime.min = now;
      else pickupTime.removeAttribute("min");

      if (returnDate) {
        returnDate.min = travelDate.value && travelDate.value > today ? travelDate.value : today;
        if (travelDate.value) returnDate.max = travelDate.value;
        else returnDate.removeAttribute("max");
      }

      if (travelDate.value === today && pickupTime.value && pickupTime.value < now) pickupTime.dataset.voynuDatetimeInvalid = "true";

      if (returnDate && returnTime && travelDate.value && returnDate.value === travelDate.value && pickupTime.value && durationSeconds != null) {
        const start = parseLocal(travelDate.value, pickupTime.value);
        if (start) {
          const arrival = new Date(start.getTime() + Number(durationSeconds) * 1000);
          const latest = new Date(arrival.getTime() + 180 * 60000);
          returnTime.min = `${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`;
          returnTime.max = `${pad(latest.getHours())}:${pad(latest.getMinutes())}`;
          const ret = parseLocal(returnDate.value, returnTime.value);
          if (returnTime.value && ret) {
            if (ret < arrival) addLocal(returnTime, `Return time must be after your estimated arrival at ${timeLabel(arrival)}.`, "error");
            else if (ret > latest) addLocal(returnTime, `Return time must be by ${timeLabel(latest)}. Maximum waiting time is 3 hours after arrival.`, "error");
            else { clearLocal(returnTime); addMeta(returnTime, [`Arrival ${timeLabel(arrival)}`, `Latest ${timeLabel(latest)}`, "Waiting fee set in Admin"]); }
          }
        }
      }
      suppressGlobalMessage();
    };

    const onInput = (event) => { if (ids.includes(event.target?.id)) clearLocal(event.target); window.setTimeout(refresh, 0); };
    const onChange = (event) => { if (ids.includes(event.target?.id)) clearLocal(event.target); window.setTimeout(refresh, 0); };
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
        if (url.includes("/api/route-distance")) {
          const clone = response.clone();
          clone.json().then((data) => { if (Number.isFinite(Number(data?.durationSeconds))) { durationSeconds = Number(data.durationSeconds); refresh(); } }).catch(() => {});
        }
      } catch {}
      return response;
    };

    observer = new MutationObserver(() => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(refresh);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setTimeout(refresh, 250);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
      observer?.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onChange, true);
      window.fetch = originalFetch;
      document.getElementById("voynu-datetime-polish-v2")?.remove();
    };
  }, []);

  return null;
}
