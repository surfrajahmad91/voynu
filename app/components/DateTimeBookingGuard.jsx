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
          box-sizing: border-box !important;
          width: 100% !important;
          min-height: 62px !important;
          padding: 0 18px 0 48px !important;
          border: 1.5px solid #d9e7df !important;
          border-radius: 18px !important;
          background-color: #f9fcfa !important;
          color: #24352d !important;
          font-size: 18px !important;
          font-weight: 650 !important;
          letter-spacing: .1px !important;
          box-shadow: 0 1px 2px rgba(18, 70, 43, .04), inset 0 0 0 1px rgba(255,255,255,.65) !important;
          transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease !important;
        }
        input[data-voynu-datetime-enhanced]:focus {
          border-color: #08783f !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(8,120,63,.10) !important;
          outline: none !important;
        }
        input[data-voynu-datetime-enhanced][data-voynu-datetime-invalid="true"] {
          border-color: #d55a4d !important;
          background-color: #fff9f8 !important;
          box-shadow: 0 0 0 3px rgba(213,90,77,.08) !important;
        }
        input[data-voynu-datetime-enhanced]::-webkit-calendar-picker-indicator {
          opacity: .62;
          cursor: pointer;
          width: 22px;
          height: 22px;
        }
        [data-voynu-datetime-message] {
          box-sizing: border-box;
          margin: 8px 2px 0 !important;
          padding: 10px 12px !important;
          border-radius: 12px !important;
          font-size: 13px !important;
          line-height: 1.35 !important;
          font-weight: 650 !important;
        }
        [data-voynu-datetime-message="error"] {
          color: #a93429 !important;
          background: #fff2f0 !important;
          border: 1px solid #f0cbc6 !important;
        }
        [data-voynu-datetime-message="hint"] {
          color: #617168 !important;
          background: transparent !important;
          border: 0 !important;
          padding: 7px 2px 0 !important;
          font-weight: 500 !important;
        }
      `;
      document.head.appendChild(style);
    };

    const decorateInput = (input, type, index) => {
      if (!input) return;
      ensureStyle();
      input.dataset.voynuDatetimeEnhanced = "true";
      input.dataset.voynuDatetimeType = type;
      input.dataset.voynuDatetimeIndex = String(index);
      input.setAttribute("aria-label", type === "date" ? (index === 0 ? "Travel date" : "Return date") : (index === 0 ? "Pickup time" : "Return time"));
      if (type === "date") {
        input.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2308783f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2.5'/%3E%3Cpath d='M16 3v4M8 3v4M3 10h18'/%3E%3C/svg%3E\")";
      } else {
        input.style.backgroundImage = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='none' stroke='%2308783f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7.5v5l3.2 3.2'/%3E%3C/svg%3E\")";
      }
      input.style.backgroundRepeat = "no-repeat";
      input.style.backgroundPosition = "16px center";
      input.style.backgroundSize = "22px 22px";
    };

    const addMessage = (input, text, kind = "error") => {
      if (!input) return;
      let node = input.nextElementSibling;
      if (!node || node.dataset?.voynuDatetimeMessage !== kind) {
        node = document.createElement("div");
        node.dataset.voynuDatetimeMessage = kind;
        input.insertAdjacentElement("afterend", node);
      }
      node.textContent = text || "";
      node.style.display = text ? "block" : "none";
      input.dataset.voynuDatetimeInvalid = kind === "error" && text ? "true" : "false";
    };

    const clearMessage = (input, kind = null) => {
      if (!input) return;
      Array.from(input.parentElement?.querySelectorAll?.("[data-voynu-datetime-message]") || []).forEach((node) => {
        if (!kind || node.dataset.voynuDatetimeMessage === kind) node.remove();
      });
      if (!input.parentElement?.querySelector?.('[data-voynu-datetime-message="error"]')) input.dataset.voynuDatetimeInvalid = "false";
    };

    const addHint = (input, text) => {
      if (!input) return;
      let node = input.nextElementSibling;
      if (!node || node.dataset?.voynuDatetimeMessage !== "hint") {
        node = document.createElement("div");
        node.dataset.voynuDatetimeMessage = "hint";
        input.insertAdjacentElement("afterend", node);
      }
      node.textContent = text || "";
      node.style.display = text ? "block" : "none";
    };

    const removeLegacyMessage = () => {
      const legacy = "Pickup time cannot be in the past.";
      document.querySelectorAll("div, p, span").forEach((node) => {
        if (node.childElementCount === 0 && String(node.textContent || "").trim() === legacy) node.remove();
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
      if (travelDate && travelDate < today) {
        addMessage(dates[0], "Travel date cannot be earlier than today. Please choose today or a future date.");
        valid = false;
      } else {
        clearMessage(dates[0]);
        addHint(dates[0], travelDate === today ? "Today" : "Choose the day you want to travel");
      }

      if (travelDate === today) {
        times[0].min = now;
        if (!pickupTime) {
          if (submitAttempted) { addMessage(times[0], "Please choose a pickup time for today."); valid = false; }
          else { clearMessage(times[0]); addHint(times[0], "Choose a pickup time — only future times are available"); }
        } else if (pickupTime < now) {
          addMessage(times[0], "This pickup time has already passed. Please choose a later time today.");
          valid = false;
        } else {
          clearMessage(times[0]);
          addHint(times[0], "Pickup time");
        }
      } else {
        times[0].removeAttribute("min");
        clearMessage(times[0]);
        addHint(times[0], travelDate ? "Pickup time" : "Select a travel date first");
      }

      const isRoundTrip = dates.length > 1 || times.length > 1;
      if (!isRoundTrip) {
        removeLegacyMessage();
        return valid;
      }

      if (travelDate) {
        dates[1].min = travelDate > today ? travelDate : today;
        dates[1].max = travelDate;
      } else {
        dates[1].min = today;
        dates[1].removeAttribute("max");
      }

      if (returnDate && travelDate && returnDate !== travelDate) {
        addMessage(dates[1], "Round trips return on the same day. Please select the same date as your pickup.");
        valid = false;
      } else if (!returnDate) {
        if (submitAttempted) { addMessage(dates[1], "Please choose your return date."); valid = false; }
        else { clearMessage(dates[1]); addHint(dates[1], travelDate ? "Same-day return only" : "Select a travel date first"); }
      } else {
        clearMessage(dates[1]);
        addHint(dates[1], "Same-day return");
      }

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
            else { clearMessage(times[1]); addHint(times[1], `Estimated arrival ${minReturn} • Latest return ${maxReturn}`); }
          } else {
            const ret = parseDateTime(returnDate, returnTime);
            if (ret && ret < arrival) {
              addMessage(times[1], `Return time must be after your estimated arrival at ${minReturn}.`);
              valid = false;
            } else if (ret && ret > latest) {
              addMessage(times[1], `Return time must be by ${maxReturn}. Maximum waiting time is 3 hours after arrival.`);
              valid = false;
            } else {
              clearMessage(times[1]);
              addHint(times[1], `Estimated arrival ${minReturn} • Latest return ${maxReturn} • Waiting ₹50 / 15 min`);
            }
          }
        } else {
          times[1].removeAttribute("min");
          times[1].removeAttribute("max");
          clearMessage(times[1]);
          addHint(times[1], "Return time will be limited after route duration is calculated");
        }
      } else if (returnDate === travelDate && returnTime && pickupTime) {
        times[1].removeAttribute("min");
        times[1].removeAttribute("max");
        if (returnTime <= pickupTime) {
          addMessage(times[1], "Return time must be later than pickup time.");
          valid = false;
        } else clearMessage(times[1]);
        addHint(times[1], "Return time");
      } else {
        times[1].removeAttribute("min");
        times[1].removeAttribute("max");
        if (!returnTime) {
          if (submitAttempted) { addMessage(times[1], "Please choose your return time."); valid = false; }
          else { clearMessage(times[1]); addHint(times[1], "Select a return time after arrival"); }
        } else clearMessage(times[1]);
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
          clone.json().then((data) => {
            if (Number.isFinite(Number(data?.durationSeconds))) {
              durationSeconds = Number(data.durationSeconds);
              validate();
            }
          }).catch(() => {});
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
