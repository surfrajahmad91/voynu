"use client";

import { useEffect } from "react";

const pad = (n) => String(n).padStart(2, "0");
function todayString() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nowTimeString() { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function parseDateTime(date, time) { if (!date || !time) return null; const d = new Date(`${date}T${time}:00`); return Number.isNaN(d.getTime()) ? null : d; }
function formatTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function minutesBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 60000); }

export default function DateTimeBookingGuard() {
  useEffect(() => {
    if (window.location.pathname !== "/") return undefined;

    let durationSeconds = null;
    let destroyed = false;
    const originalFetch = window.fetch.bind(window);

    const fields = () => ({
      dates: Array.from(document.querySelectorAll('input[type="date"]')),
      times: Array.from(document.querySelectorAll('input[type="time"]')),
    });

    const addMessage = (input, text, kind = "error") => {
      if (!input) return;
      let node = input.parentElement?.querySelector(`[data-voynu-datetime-message="${kind}"]`);
      if (!node) {
        node = document.createElement("div");
        node.dataset.voynuDatetimeMessage = kind;
        node.style.cssText = "margin-top:6px;font-size:12px;line-height:1.4;font-weight:600;color:#b33a2b;";
        input.parentElement?.appendChild(node);
      }
      node.textContent = text || "";
      node.style.display = text ? "block" : "none";
    };

    const clearMessage = (input) => {
      input?.parentElement?.querySelectorAll("[data-voynu-datetime-message]").forEach((n) => { n.remove(); });
    };

    const validate = () => {
      if (destroyed) return true;
      const { dates, times } = fields();
      if (!dates.length || !times.length) return true;
      const travelDate = dates[0]?.value || "";
      const pickupTime = times[0]?.value || "";
      const returnDate = dates[1]?.value || "";
      const returnTime = times[1]?.value || "";
      const today = todayString();
      const now = nowTimeString();
      let valid = true;

      dates.forEach((input) => { input.min = today; });
      if (travelDate && travelDate < today) { addMessage(dates[0], "Travel date cannot be earlier than today. Please choose today or a future date."); valid = false; } else clearMessage(dates[0]);
      if (travelDate === today && pickupTime) {
        times[0].min = now;
        if (pickupTime < now) { addMessage(times[0], "Pickup time has already passed. Please choose a later time today."); valid = false; } else clearMessage(times[0]);
      } else { times[0].removeAttribute("min"); clearMessage(times[0]); }

      const isRoundTrip = dates.length > 1 || times.length > 1;
      if (isRoundTrip && returnDate) {
        if (travelDate && returnDate !== travelDate) {
          addMessage(dates[1], "Round trips must return on the same day as pickup. Please choose the travel date.");
          valid = false;
        } else clearMessage(dates[1]);
      } else clearMessage(dates[1]);

      if (isRoundTrip && returnTime && travelDate && returnDate === travelDate && pickupTime) {
        const start = parseDateTime(travelDate, pickupTime);
        if (start && durationSeconds != null) {
          const arrival = new Date(start.getTime() + Number(durationSeconds) * 1000);
          const latest = new Date(arrival.getTime() + 180 * 60000);
          const minReturn = formatTime(arrival);
          const maxReturn = latest.getDate() === arrival.getDate() ? formatTime(latest) : "23:59";
          times[1].min = minReturn;
          times[1].max = maxReturn;
          const ret = parseDateTime(returnDate, returnTime);
          if (ret && ret < arrival) { addMessage(times[1], `Return time must be after the estimated arrival (${formatTime(arrival)}).`); valid = false; }
          else if (ret && ret > latest) { addMessage(times[1], "Return time is too late. The maximum round-trip wait is 3 hours after estimated arrival."); valid = false; }
          else clearMessage(times[1]);
        } else {
          times[1].removeAttribute("min"); times[1].removeAttribute("max"); clearMessage(times[1]);
        }
      } else if (isRoundTrip) {
        times[1].removeAttribute("min"); times[1].removeAttribute("max");
        if (returnDate === travelDate && returnTime && pickupTime && returnTime <= pickupTime) { addMessage(times[1], "Return time must be later than pickup time."); valid = false; }
        else clearMessage(times[1]);
      }

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
    };
  }, []);

  return null;
}
