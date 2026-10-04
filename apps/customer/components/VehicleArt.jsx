"use client";

import { theme } from "../../../shared/lib/theme";

// Vehicle picture for cab cards: uses the category's uploaded photo when there is one, otherwise a clean
// brand-coloured side-view illustration (hatchback / sedan / SUV / EV).
function kindOf(slug, name) {
  const t = `${slug || ""} ${name || ""}`.toLowerCase();
  if (/\bev\b|electric/.test(t)) return "ev";
  if (/suv|innova|xuv|muv/.test(t)) return "suv";
  if (/sedan/.test(t)) return "sedan";
  return "hatchback";
}

const BODY = { hatchback: ["#0A7FA6", "#07627F"], sedan: ["#12384F", "#0A2337"], suv: ["#E0702F", "#B9551C"], ev: ["#16A34A", "#118038"] };

function Car({ kind }) {
  const [body, shade] = BODY[kind];
  const suv = kind === "suv";
  const sedan = kind === "sedan";
  const lowerY = suv ? 24 : 28;
  const lowerH = suv ? 16 : 12;
  const wheelR = suv ? 9 : 8;
  const cabin = suv ? "M26 24 L33 9 Q35 7 39 7 L84 7 Q88 7 90 10 L96 24 Z"
    : sedan ? "M34 28 L43 14 Q45 12 49 12 L70 12 Q74 12 77 14 L88 28 Z"
    : "M30 28 L40 14 Q42 12 46 12 L74 12 Q78 12 81 15 L92 28 Z";
  const windows = suv ? ["M37 22 L41 10 L58 10 L58 22 Z", "M62 10 L82 10 L89 22 L62 22 Z"]
    : sedan ? ["M45 26 L50 15 L61 15 L61 26 Z", "M65 15 L72 15 L81 26 L65 26 Z"]
    : ["M42 26 L48 15 L62 15 L62 26 Z", "M66 15 L76 15 L84 26 L66 26 Z"];
  return (
    <svg viewBox="0 0 120 56" width="100%" height="100%" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <ellipse cx="60" cy="50" rx="50" ry="3" fill="rgba(10,35,55,.13)" />
      {suv && <rect x="38" y="4" width="46" height="2.4" rx="1.2" fill={shade} />}
      <path d={cabin} fill={body} />
      <rect x={sedan ? 6 : 8} y={lowerY} width={sedan ? 108 : 104} height={lowerH} rx="5" fill={body} />
      <rect x={sedan ? 6 : 8} y={lowerY + lowerH - 4} width={sedan ? 108 : 104} height="4" rx="2" fill={shade} />
      {windows.map((d) => <path key={d} d={d} fill="#E7F4F8" />)}
      <rect x="106" y={lowerY + 3} width="5" height="3" rx="1.5" fill="#FFD27A" />
      <rect x={sedan ? 7 : 9} y={lowerY + 3} width="4" height="3" rx="1.5" fill="#FF8A80" />
      {kind === "ev" && (
        <g>
          <circle cx="62" cy="33" r="5.2" fill="#fff" />
          <path d="M63.2 29.2 59.4 33.6h2.6l-.9 3.2 3.8-4.4h-2.6z" fill="#16A34A" />
        </g>
      )}
      {[32, 88].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={lowerY + lowerH - 2} r={wheelR} fill="#0A2337" />
          <circle cx={cx} cy={lowerY + lowerH - 2} r="3.2" fill="#CBD5E1" />
        </g>
      ))}
    </svg>
  );
}

export default function VehicleArt({ slug, name, imageUrl, width = 84 }) {
  return (
    <div className="vehicleArt" style={{ width }}>
      {imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={imageUrl} alt={name || "Vehicle"} loading="lazy" />
        : <Car kind={kindOf(slug, name)} />}
      <style jsx>{`
        .vehicleArt { flex:0 0 auto; aspect-ratio:84/52; display:flex; align-items:center; justify-content:center; padding:4px 5px; border-radius:12px; background:linear-gradient(145deg, ${theme.colors.primaryTint}, #fff); border:1px solid ${theme.colors.border}; overflow:hidden; }
        .vehicleArt img { width:100%; height:100%; object-fit:contain; }
      `}</style>
    </div>
  );
}
