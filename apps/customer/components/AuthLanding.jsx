"use client";

import Link from "next/link";

function Icon({ name, size = 22 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "car") return <svg {...p}><path d="M4 16h16M6 16l1.4-5a2 2 0 0 1 2-1.5h5.2a2 2 0 0 1 2 1.5L18 16" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" /></svg>;
  if (name === "rent") return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M8 17h5" /></svg>;
  if (name === "commute") return <svg {...p}><path d="M5 18h14M7 15h10l-1-6H8l-1 6Z" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /><path d="M9 9V6h6v3" /></svg>;
  if (name === "route") return <svg {...p}><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18h3a4 4 0 0 0 4-4v-2a4 4 0 0 1 4-4" /></svg>;
  if (name === "shield") return <svg {...p}><path d="M12 3 19 6v5c0 4.6-2.8 7.9-7 9.5C7.8 18.9 5 15.6 5 11V6l7-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>;
  if (name === "bolt") return <svg {...p} fill="currentColor" stroke="none"><path d="m13 2-9 12h6l-1 8 9-12h-6l1-8Z" /></svg>;
  if (name === "arrow") return <svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  if (name === "menu") return <svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
  return null;
}

const services = [
  { icon: "car", title: "Ride", desc: "Book a cab for one-way, round-trip and intercity travel.", href: "/signup" },
  { icon: "rent", title: "Rentals", desc: "Find approved cars, bikes and scooters for your own use.", href: "/rentals" },
  { icon: "route", title: "Outstation", desc: "Plan longer journeys with clear route and fare details.", href: "/signup" },
  { icon: "commute", title: "Commute", desc: "Set up a recurring daily route around your schedule.", href: "/subscriptions" },
];

const steps = [
  ["01", "Set your route", "Choose pickup and destination and let VOYNU calculate the road journey."],
  ["02", "Choose your ride", "Compare available vehicle categories and see the applicable fare before booking."],
  ["03", "Meet your driver", "Get booking updates, driver details and live trip status when your ride is active."],
];

export default function AuthLanding() {
  return (
    <main className="voynuLanding">
      <header className="landingHeader">
        <div className="landingHeaderInner">
          <Link href="/" className="landingBrand" aria-label="VOYNU home">
            <img src="/icon.svg" alt="" width="40" height="40" />
            <span>VOYNU</span>
          </Link>

          <nav className="landingDesktopNav" aria-label="Services">
            <a href="#services">Services</a>
            <a href="#how-it-works">How it works</a>
            <a href="#why-voynu">Why VOYNU</a>
          </nav>

          <div className="landingActions">
            <Link href="/login" className="landingLogin">Log in</Link>
            <Link href="/signup" className="landingSignup">Get started <Icon name="arrow" size={15} /></Link>
          </div>
        </div>
      </header>

      <section className="landingHero">
        <div className="landingHeroCopy">
          <div className="eyebrow"><span /> SMARTER TRAVEL, ONE APP</div>
          <h1>Go where you need to go.<br /><em>We’ll handle the journey.</em></h1>
          <p className="heroLead">VOYNU brings cab rides, rentals, outstation travel and daily commute into one simple customer experience.</p>

          <div className="heroCtas">
            <Link href="/signup" className="primaryCta">Start a trip <Icon name="arrow" size={17} /></Link>
            <Link href="/login" className="secondaryCta">I already have an account</Link>
          </div>

          <div className="heroTrust">
            <span><Icon name="shield" size={15} /> Secure account</span>
            <span><Icon name="route" size={15} /> Route-aware booking</span>
            <span><Icon name="bolt" size={14} /> EV options at cab selection</span>
          </div>
        </div>

        <div className="landingHeroVisual" aria-label="VOYNU trip preview">
          <div className="visualTop">
            <div><b>YOUR NEXT JOURNEY</b><span>VOYNU customer app</span></div>
            <span className="live"><i /> READY</span>
          </div>
          <div className="mapCard">
            <div className="mapGlow one" />
            <div className="mapGlow two" />
            <div className="mapGrid" />
            <div className="road roadA" />
            <div className="road roadB" />
            <div className="routeLine" />
            <div className="pin pinA"><span /></div>
            <div className="pin pinB"><span /></div>
            <div className="mapLabel labelA"><b>Pickup</b><small>Choose your location</small></div>
            <div className="mapLabel labelB"><b>Destination</b><small>We'll plan the route</small></div>
            <div className="tripMini">
              <span className="tripDot" />
              <div><b>Clear trip details</b><small>Distance · time · fare</small></div>
              <Icon name="arrow" size={16} />
            </div>
          </div>
          <div className="visualStats">
            <div><strong>4</strong><span>ways to travel</span></div>
            <div><strong>1</strong><span>customer account</span></div>
            <div><strong>24/7</strong><span>trip visibility</span></div>
          </div>
        </div>
      </section>

      <section id="services" className="section servicesSection">
        <div className="sectionHead">
          <div className="eyebrow center"><span /> ONE APP, FOUR CORE SERVICES</div>
          <h2>Everything is organised around the trip you need.</h2>
          <p>Choose the service first. The booking flow then shows only the options relevant to that journey.</p>
        </div>
        <div className="serviceGrid">
          {services.map((s, i) => (
            <Link href={s.href} key={s.title} className={"serviceCard " + (i === 0 ? "featured" : "")}>
              <span className="serviceIcon"><Icon name={s.icon} size={22} /></span>
              <span className="serviceNumber">0{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <span className="serviceAction">Explore <Icon name="arrow" size={14} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section processSection">
        <div className="sectionHead">
          <div className="eyebrow center"><span /> HOW IT WORKS</div>
          <h2>A cleaner booking flow from start to finish.</h2>
        </div>
        <div className="stepGrid">
          {steps.map(([num, title, desc]) => (
            <article className="stepCard" key={num}>
              <span className="stepNum">{num}</span>
              <div className="stepLine" />
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="why-voynu" className="trustSection">
        <div className="trustInner">
          <div>
            <div className="eyebrow light"><span /> BUILT AROUND THE CUSTOMER</div>
            <h2>Less clutter. Clearer choices. Better trip visibility.</h2>
            <p>VOYNU keeps the customer journey focused: pick a service, define the trip, choose the vehicle and follow the booking.</p>
          </div>
          <div className="trustList">
            <div><span>01</span><b>Clear route information</b><small>Pickup, destination, distance and timing stay visible.</small></div>
            <div><span>02</span><b>Vehicle choice where it matters</b><small>EV and other vehicle options belong in cab selection.</small></div>
            <div><span>03</span><b>Account-first trip history</b><small>Bookings, commute and wallet stay accessible from the app shell.</small></div>
          </div>
        </div>
      </section>

      <section className="finalCta">
        <div>
          <div className="eyebrow"><span /> READY WHEN YOU ARE</div>
          <h2>Start with your next destination.</h2>
          <p>Create your VOYNU account and plan the trip in a few steps.</p>
        </div>
        <Link href="/signup" className="primaryCta">Create account <Icon name="arrow" size={17} /></Link>
      </section>

      <footer className="landingFooter">
        <Link href="/" className="landingBrand"><img src="/icon.svg" alt="" width="32" height="32" /><span>VOYNU</span></Link>
        <span>Travel safe. Travel smart.</span>
      </footer>

      <style jsx>{`
        .voynuLanding{min-height:100vh;background:#F6F9FB;color:#1E3348;font-family:var(--voynu-font);overflow-x:hidden}
        .landingHeader{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-bottom:1px solid rgba(10,35,55,.07)}
        .landingHeaderInner{width:min(1180px,calc(100% - 32px));min-height:72px;margin:auto;display:flex;align-items:center;gap:24px}
        .landingBrand{display:flex;align-items:center;gap:9px;text-decoration:none;color:#0A2337;font-weight:850;font-size:19px;letter-spacing:-.6px}
        .landingBrand img{display:block;border-radius:11px;box-shadow:0 7px 16px rgba(10,35,55,.14)}
        .landingDesktopNav{display:flex;align-items:center;gap:24px;margin-left:18px;flex:1}
        .landingDesktopNav a{font-size:11px;font-weight:750;color:#647487;text-decoration:none}
        .landingDesktopNav a:hover{color:#0A7FA6}
        .landingActions{display:flex;align-items:center;gap:8px}
        .landingLogin,.landingSignup{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 15px;border-radius:12px;text-decoration:none;font-size:11px;font-weight:800}
        .landingLogin{color:#1E3348;border:1px solid #D9E1E8;background:#fff}
        .landingSignup{gap:6px;color:#fff;background:linear-gradient(135deg,#12A0C6,#0A7FA6 55%,#F5813F);box-shadow:0 9px 20px rgba(10,127,166,.18)}
        .landingHero{width:min(1180px,calc(100% - 32px));margin:auto;padding:76px 0 70px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(440px,1fr);gap:64px;align-items:center}
        .eyebrow{display:flex;align-items:center;gap:8px;color:#00456B;font-size:9px;font-weight:850;letter-spacing:1.5px}
        .eyebrow span{width:24px;height:3px;border-radius:99px;background:linear-gradient(90deg,#12A0C6,#F5813F)}
        .eyebrow.center{justify-content:center}
        .eyebrow.light{color:#8EDBED}
        h1{margin:17px 0 0;color:#0A2337;font-size:clamp(42px,5.6vw,72px);line-height:1.02;letter-spacing:-3px;font-weight:850}
        h1 em{font-style:normal;background:linear-gradient(135deg,#12A0C6,#0A7FA6 50%,#F5813F);-webkit-background-clip:text;background-clip:text;color:transparent}
        .heroLead{max-width:560px;margin:22px 0 0;color:#5B6B7C;font-size:15px;line-height:1.75}
        .heroCtas{display:flex;gap:10px;flex-wrap:wrap;margin-top:28px}
        .primaryCta,.secondaryCta{min-height:52px;padding:0 19px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-size:12px;font-weight:850}
        .primaryCta{color:#fff;background:linear-gradient(135deg,#12A0C6,#0A7FA6 55%,#F5813F);box-shadow:0 13px 28px rgba(10,127,166,.2)}
        .secondaryCta{color:#1E3348;background:#fff;border:1px solid #D8E0E7}
        .heroTrust{display:flex;flex-wrap:wrap;gap:16px;margin-top:25px}
        .heroTrust span{display:inline-flex;align-items:center;gap:6px;color:#657486;font-size:10px;font-weight:750}
        .heroTrust span svg{color:#0A7FA6}
        .landingHeroVisual{padding:15px;border:1px solid rgba(255,255,255,.9);border-radius:28px;background:rgba(255,255,255,.76);box-shadow:0 30px 80px rgba(10,35,55,.12);backdrop-filter:blur(16px)}
        .visualTop{display:flex;justify-content:space-between;align-items:center;padding:4px 5px 13px}
        .visualTop div{display:flex;flex-direction:column;gap:3px}.visualTop b{font-size:9px;letter-spacing:1px;color:#0A2337}.visualTop span{font-size:8px;color:#8491A0}
        .live{display:flex!important;flex-direction:row!important;align-items:center;gap:6px;color:#138A4B!important;font-size:8px!important;font-weight:850}
        .live i{width:6px;height:6px;border-radius:50%;background:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,.1)}
        .mapCard{position:relative;height:390px;overflow:hidden;border-radius:20px;background:linear-gradient(145deg,#081E30,#0D304A 58%,#12384F)}
        .mapGrid{position:absolute;inset:-30px;background-image:linear-gradient(rgba(255,255,255,.065) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.065) 1px,transparent 1px);background-size:38px 38px;transform:rotate(-7deg) scale(1.14)}
        .mapGlow{position:absolute;border-radius:50%;filter:blur(35px)}.mapGlow.one{width:260px;height:260px;left:-100px;top:-100px;background:rgba(18,160,198,.2)}.mapGlow.two{width:280px;height:280px;right:-110px;bottom:-130px;background:rgba(245,129,63,.18)}
        .road{position:absolute;border:2px solid rgba(255,255,255,.07);border-radius:50%}.roadA{width:85%;height:48%;left:-16%;top:17%;transform:rotate(-12deg)}.roadB{width:95%;height:42%;right:-35%;bottom:10%;transform:rotate(10deg)}
        .routeLine{position:absolute;left:22%;top:27%;width:56%;height:50%;border-left:3px solid #6FD6EC;border-bottom:3px solid #6FD6EC;border-radius:0 0 0 58%;transform:rotate(-11deg);box-shadow:0 0 22px rgba(18,160,198,.35)}
        .pin{position:absolute;width:18px;height:18px;border-radius:50%;z-index:2;background:#fff}.pin:before{content:"";position:absolute;inset:-7px;border-radius:50%;background:rgba(111,214,236,.12)}.pin span{position:absolute;inset:5px;border-radius:50%;background:#12A0C6}.pinA{left:20%;top:25%}.pinB{right:20%;bottom:21%}.pinB span{background:#F5813F}.pinB:before{background:rgba(245,129,63,.13)}
        .mapLabel{position:absolute;display:flex;flex-direction:column;gap:3px;padding:10px 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(6,24,38,.72);backdrop-filter:blur(10px);color:#fff;z-index:3}.mapLabel b{font-size:10px}.mapLabel small{font-size:8px;color:rgba(255,255,255,.58)}.labelA{left:8%;top:34%}.labelB{right:8%;bottom:29%;text-align:right;align-items:flex-end}
        .tripMini{position:absolute;left:12px;right:12px;bottom:12px;z-index:4;display:flex;align-items:center;gap:9px;padding:11px 12px;border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.08);backdrop-filter:blur(12px);color:#fff}.tripMini>div{flex:1}.tripMini b{display:block;font-size:10px}.tripMini small{display:block;margin-top:2px;font-size:8px;color:rgba(255,255,255,.55)}.tripMini svg{opacity:.7}.tripDot{width:7px;height:7px;border-radius:50%;background:#6FD6EC;box-shadow:0 0 0 5px rgba(111,214,236,.1)}
        .visualStats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:12px;border:1px solid #EEF3F7;border-radius:14px;overflow:hidden;background:#EEF3F7}.visualStats div{padding:10px 8px;background:#fff}.visualStats strong{display:block;color:#0A2337;font-size:15px}.visualStats span{display:block;margin-top:2px;color:#8491A0;font-size:8px}
        .section{width:min(1180px,calc(100% - 32px));margin:auto}.servicesSection{padding:60px 0 82px}.sectionHead{text-align:center;max-width:700px;margin:0 auto 34px}.sectionHead h2{margin:12px 0 9px;font-size:clamp(24px,3.4vw,36px);line-height:1.12;letter-spacing:-1.2px;color:#0A2337}.sectionHead p{margin:0;color:#667588;font-size:13px;line-height:1.65}
        .serviceGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.serviceCard{position:relative;display:flex;flex-direction:column;min-height:205px;padding:20px;border-radius:20px;border:1px solid #E8EEF2;background:#fff;box-shadow:0 10px 26px rgba(10,35,55,.045);text-decoration:none;color:inherit;transition:.2s ease}.serviceCard:hover{transform:translateY(-3px);box-shadow:0 18px 36px rgba(10,35,55,.09)}.serviceCard.featured{border-color:rgba(10,127,166,.22);background:linear-gradient(150deg,#fff,#F2FAFC)}.serviceIcon{width:44px;height:44px;display:grid;place-items:center;border-radius:13px;background:#E7F4F8;color:#0A7FA6}.serviceNumber{position:absolute;right:18px;top:18px;color:#DCE5EA;font-size:12px;font-weight:850}.serviceCard h3{margin:22px 0 6px;font-size:16px;color:#0A2337}.serviceCard p{margin:0;color:#657486;font-size:11.5px;line-height:1.55}.serviceAction{display:inline-flex;align-items:center;gap:5px;margin-top:auto;padding-top:16px;color:#0A7FA6;font-size:10px;font-weight:850}
        .processSection{padding:20px 0 90px}.stepGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stepCard{position:relative;padding:24px;border-radius:20px;background:#fff;border:1px solid #E8EEF2;box-shadow:0 10px 26px rgba(10,35,55,.045)}.stepNum{color:#C7D5DE;font-size:26px;font-weight:850}.stepLine{width:38px;height:3px;margin:18px 0;background:linear-gradient(90deg,#12A0C6,#F5813F);border-radius:99px}.stepCard h3{margin:0 0 7px;color:#0A2337;font-size:16px}.stepCard p{margin:0;color:#657486;font-size:11.5px;line-height:1.6}
        .trustSection{padding:70px 0;background:#0A2337;color:#fff}.trustInner{width:min(1180px,calc(100% - 32px));margin:auto;display:grid;grid-template-columns:.95fr 1.05fr;gap:70px;align-items:center}.trustInner h2{margin:13px 0 10px;font-size:clamp(25px,3.5vw,39px);line-height:1.1;letter-spacing:-1.2px}.trustInner>div>p{margin:0;max-width:500px;color:rgba(255,255,255,.63);font-size:13px;line-height:1.7}.trustList{display:grid;gap:9px}.trustList div{display:grid;grid-template-columns:36px 1fr;column-gap:12px;padding:15px 16px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.045)}.trustList span{grid-row:1/3;color:#6FD6EC;font-size:10px;font-weight:850}.trustList b{font-size:12px}.trustList small{margin-top:3px;color:rgba(255,255,255,.5);font-size:9.5px;line-height:1.45}
        .finalCta{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:70px 0;display:flex;align-items:center;justify-content:space-between;gap:24px}.finalCta h2{margin:10px 0 6px;color:#0A2337;font-size:clamp(25px,3vw,35px);letter-spacing:-1px}.finalCta p{margin:0;color:#657486;font-size:12.5px}.landingFooter{width:min(1180px,calc(100% - 32px));min-height:72px;margin:auto;border-top:1px solid #E2E9EE;display:flex;align-items:center;justify-content:space-between;color:#81909E;font-size:9px}
        @media(max-width:920px){.landingDesktopNav{display:none}.landingHero{grid-template-columns:1fr;gap:40px;padding-top:48px}.landingHeroCopy{text-align:center;display:flex;flex-direction:column;align-items:center}.heroLead{max-width:620px}.heroTrust{justify-content:center}.landingHeroVisual{width:min(620px,100%);margin:auto}.serviceGrid{grid-template-columns:repeat(2,1fr)}.trustInner{grid-template-columns:1fr;gap:35px}}
        @media(max-width:600px){.landingHeaderInner,.landingHero,.section,.trustInner,.finalCta,.landingFooter{width:calc(100% - 24px)}.landingHeaderInner{min-height:64px}.landingBrand span{font-size:17px}.landingActions{gap:5px}.landingLogin,.landingSignup{min-height:36px;padding:0 11px;font-size:10px}.landingHero{padding:38px 0 52px}.eyebrow{font-size:8px}.heroLead{font-size:13px}.heroCtas{width:100%;flex-direction:column}.primaryCta,.secondaryCta{width:100%}.heroTrust{gap:9px 12px}.heroTrust span{font-size:8.5px}.landingHeroVisual{padding:10px;border-radius:22px}.mapCard{height:310px}.serviceGrid{gap:9px}.serviceCard{min-height:190px;padding:16px}.serviceCard h3{margin-top:18px}.servicesSection{padding:48px 0 60px}.processSection{padding:5px 0 62px}.stepGrid{grid-template-columns:1fr}.trustSection{padding:55px 0}.finalCta{padding:55px 0;display:flex;flex-direction:column;align-items:flex-start}.finalCta .primaryCta{width:auto}.landingFooter{min-height:76px;flex-direction:column;justify-content:center;gap:7px}}
      `}</style>
    </main>
  );
}
