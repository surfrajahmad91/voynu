"use client";

import { theme } from "../lib/theme";
import PageHeader from "./PageHeader";

function Icon({ name, size = 15 }) {
  const p={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"};
  if(name==="shield") return <svg {...p}><path d="M12 3 19 6v5c0 4.6-2.8 7.9-7 9.5C7.8 18.9 5 15.6 5 11V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if(name==="route") return <svg {...p}><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18h3a4 4 0 0 0 4-4v-2a4 4 0 0 1 4-4"/></svg>;
  if(name==="bolt") return <svg {...p} fill="currentColor" stroke="none"><path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z"/></svg>;
  if(name==="check") return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>;
  return null;
}

export default function AuthShell({
  children,
  panelDescription,
  showMarketingPanel = true,
  showProductBar = false,
  whatsappLabel = "Chat with us",
  whatsappHref,
}) {
  return (
    <main className="voynuAuthPage">
      <PageHeader
        maxWidth={theme.maxWidth.wide}
        showAccountLink={false}
        showWhatsapp={true}
        showProductBar={showProductBar}
        whatsappLabel={whatsappLabel}
        whatsappHref={whatsappHref}
      />

      <div className={"authLayout" + (showMarketingPanel ? "" : " compact")}>
        {showMarketingPanel && (
          <section className="authIntro">
            <div className="authIntroTop">
              <span className="authEyebrow">VOYNU CUSTOMER</span>
              <span className="authStatus"><i /> Secure access</span>
            </div>

            <div className="authCopy">
              <h1>Everything for your journey,<br /><em>in one place.</em></h1>
              <p>{panelDescription || "Sign in to manage rides, rentals, commute plans, wallet credits and trip history from one customer account."}</p>
            </div>

            <div className="authRoute">
              <div className="authMapGrid" />
              <div className="authGlow one" />
              <div className="authGlow two" />
              <div className="authRoad" />
              <div className="authPin a" />
              <div className="authPin b" />
              <div className="authRouteCard a"><b>Pickup</b><span>Set your starting point</span></div>
              <div className="authRouteCard b"><b>Destination</b><span>Choose where you're going</span></div>
              <div className="authRouteFooter"><Icon name="route" size={13} /> Route-aware trip planning</div>
            </div>

            <div className="authBenefits">
              <div><span><Icon name="check" size={13}/></span><b>Clear trip details</b><small>Route, timing and booking status stay visible.</small></div>
              <div><span><Icon name="shield" size={13}/></span><b>Protected account</b><small>Your customer actions stay tied to your account.</small></div>
              <div><span><Icon name="bolt" size={13}/></span><b>Vehicle choice</b><small>EV options appear at the right point in cab selection.</small></div>
            </div>
          </section>
        )}

        <section className="authFormArea">
          <div className="authFormCard">
            <div className="authFormBrand">
              <img src="/icon.svg" alt="VOYNU" width="38" height="38" />
              <div><b>VOYNU</b><span>Customer account</span></div>
            </div>
            {children}
          </div>
        </section>
      </div>

      <style jsx>{\`
        .voynuAuthPage{min-height:100vh;background:radial-gradient(circle at 10% 10%,rgba(18,160,198,.07),transparent 30%),radial-gradient(circle at 90% 80%,rgba(245,129,63,.07),transparent 32%),#F5F8FA;color:#1E3348;font-family:var(--voynu-font)}
        .authLayout{width:min(1180px,calc(100% - 32px));min-height:calc(100vh - 72px);margin:auto;padding:34px 0 48px;display:grid;grid-template-columns:minmax(0,1.02fr) minmax(380px,.78fr);gap:48px;align-items:center}
        .authLayout.compact{grid-template-columns:minmax(380px,460px);justify-content:center}
        .authIntro{position:relative;overflow:hidden;min-height:610px;padding:34px;border-radius:30px;background:linear-gradient(145deg,#071D2E,#0A2B43 58%,#12384F);color:#fff;box-shadow:0 30px 80px rgba(10,35,55,.15)}
        .authIntro:after{content:"";position:absolute;width:340px;height:340px;right:-160px;top:-140px;border-radius:50%;background:rgba(18,160,198,.13);filter:blur(16px)}
        .authIntroTop{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2}.authEyebrow{font-size:9px;font-weight:850;letter-spacing:1.5px;color:#8EDBED}.authStatus{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:1px solid rgba(255,255,255,.1);border-radius:999px;background:rgba(255,255,255,.06);font-size:9px;font-weight:750;color:rgba(255,255,255,.72)}.authStatus i{width:6px;height:6px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,.1)}
        .authCopy{position:relative;z-index:2;margin-top:56px}.authCopy h1{margin:0;font-size:clamp(32px,4vw,52px);line-height:1.05;letter-spacing:-2px}.authCopy em{font-style:normal;background:linear-gradient(135deg,#6FD6EC,#F5813F);-webkit-background-clip:text;background-clip:text;color:transparent}.authCopy p{max-width:530px;margin:17px 0 0;color:rgba(255,255,255,.64);font-size:13px;line-height:1.7}
        .authRoute{position:relative;z-index:2;height:225px;margin-top:34px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:20px;background:rgba(255,255,255,.045)}.authMapGrid{position:absolute;inset:-20px;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:32px 32px;transform:rotate(-7deg) scale(1.12)}.authGlow{position:absolute;border-radius:50%;filter:blur(28px)}.authGlow.one{width:180px;height:180px;left:-70px;top:-70px;background:rgba(18,160,198,.14)}.authGlow.two{width:190px;height:190px;right:-80px;bottom:-80px;background:rgba(245,129,63,.13)}.authRoad{position:absolute;left:18%;top:26%;width:62%;height:55%;border-left:3px solid rgba(111,214,236,.8);border-bottom:3px solid rgba(111,214,236,.8);border-radius:0 0 0 60%;transform:rotate(-10deg);box-shadow:0 0 20px rgba(18,160,198,.24)}.authPin{position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;z-index:3;box-shadow:0 0 0 6px rgba(111,214,236,.1)}.authPin.a{left:16%;top:23%}.authPin.b{right:16%;bottom:20%;box-shadow:0 0 0 6px rgba(245,129,63,.1)}.authPin.b:after{content:"";position:absolute;inset:4px;border-radius:50%;background:#F5813F}.authRouteCard{position:absolute;z-index:4;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border-radius:10px;background:rgba(5,20,32,.72);border:1px solid rgba(255,255,255,.09)}.authRouteCard b{font-size:9px}.authRouteCard span{font-size:7.5px;color:rgba(255,255,255,.5)}.authRouteCard.a{left:10%;top:34%}.authRouteCard.b{right:9%;bottom:27%;text-align:right;align-items:flex-end}.authRouteFooter{position:absolute;left:13px;right:13px;bottom:12px;display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.5);font-size:8px}
        .authBenefits{position:relative;z-index:2;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.authBenefits>div{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.045)}.authBenefits span{display:grid;place-items:center;width:25px;height:25px;border-radius:8px;background:rgba(111,214,236,.12);color:#8EDBED}.authBenefits b{display:block;margin-top:8px;font-size:9.5px}.authBenefits small{display:block;margin-top:3px;color:rgba(255,255,255,.45);font-size:7.5px;line-height:1.4}
        .authFormArea{display:flex;justify-content:center}.authFormCard{width:100%;box-sizing:border-box;padding:30px 28px;border-radius:26px;background:rgba(255,255,255,.88);border:1px solid rgba(255,255,255,.95);box-shadow:0 25px 70px rgba(10,35,55,.1);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.authFormBrand{display:flex;align-items:center;gap:10px;margin-bottom:22px}.authFormBrand img{border-radius:11px;box-shadow:0 6px 14px rgba(10,35,55,.12)}.authFormBrand b{display:block;color:#0A2337;font-size:14px;line-height:1}.authFormBrand span{display:block;margin-top:4px;color:#8491A0;font-size:9px}
        @media(max-width:900px){.authLayout{grid-template-columns:1fr;min-height:auto;padding:22px 0 50px;gap:18px}.authIntro{min-height:470px;padding:26px;border-radius:24px}.authCopy{margin-top:38px}.authRoute{height:190px}.authBenefits{grid-template-columns:1fr 1fr}.authBenefits>div:last-child{grid-column:1/-1}.authFormArea{width:100%}.authFormCard{max-width:460px}}
        @media(max-width:560px){.authLayout{width:calc(100% - 24px)}.authIntro{min-height:430px;padding:20px}.authIntroTop .authStatus{display:none}.authCopy h1{font-size:34px;letter-spacing:-1.5px}.authCopy p{font-size:12px}.authRoute{height:175px;margin-top:25px}.authBenefits{display:none}.authFormCard{padding:24px 18px;border-radius:22px}.authFormBrand{margin-bottom:18px}}
      \`}</style>
    </main>
  );
}
