
import { useState, useEffect, useRef, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// FONTS & GLOBAL STYLES
// ═══════════════════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#02030c}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-track{background:rgba(255,255,255,0.02)}
::-webkit-scrollbar-thumb{background:rgba(180,160,255,0.25);border-radius:2px}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(0.92)}}
@keyframes glow{0%,100%{box-shadow:0 0 8px currentColor,0 0 20px currentColor}50%{box-shadow:0 0 20px currentColor,0 0 50px currentColor,0 0 80px currentColor}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
@keyframes nowBeam{0%,100%{opacity:0.6;height:100%}50%{opacity:1;height:102%}}
@keyframes scanline{0%{background-position:0 0}100%{background-position:0 100px}}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// DATA LAYER
// ═══════════════════════════════════════════════════════════════════════════════
const EPOCHS = {
  COSMIC:       { label:"COSMIC",        sub:"13.8 Billion Years",  start:-13_800_000_000, end:2025, color:"#a78bfa" },
  GEOLOGICAL:   { label:"GEOLOGICAL",    sub:"500 Million Years",   start:-500_000_000,    end:2025, color:"#34d399" },
  DEEP_HUMAN:   { label:"DEEP HUMAN",    sub:"70,000 Years",        start:-70_000,         end:2025, color:"#fbbf24" },
  HISTORICAL:   { label:"HISTORICAL",    sub:"5,000 Years",         start:-5_000,          end:2025, color:"#60a5fa" },
  MODERN:       { label:"MODERN",        sub:"600 Years",           start:1400,            end:2025, color:"#f9a8d4" },
  CONTEMPORARY: { label:"CONTEMPORARY",  sub:"200 Years",           start:1800,            end:2025, color:"#86efac" },
};

const LAYERS = [
  { id:"cosmos",     label:"COSMOS & PHYSICS",    color:"#c4b5fd", accent:"#7c3aed", z: 5 },
  { id:"earth",      label:"EARTH & CLIMATE",     color:"#6ee7b7", accent:"#059669", z: 4 },
  { id:"life",       label:"LIFE & BIOLOGY",      color:"#a7f3d0", accent:"#10b981", z: 3 },
  { id:"society",    label:"HUMAN & SOCIETY",     color:"#fde68a", accent:"#d97706", z: 2 },
  { id:"conflict",   label:"WAR & POLITICS",      color:"#fca5a5", accent:"#dc2626", z: 1 },
  { id:"science",    label:"SCIENCE & TECH",      color:"#93c5fd", accent:"#2563eb", z: 0 },
  { id:"culture",    label:"ARTS & CULTURE",      color:"#f9a8d4", accent:"#db2777", z:-1 },
  { id:"philosophy", label:"PHILOSOPHY & IDEAS",  color:"#e9d5ff", accent:"#9333ea", z:-2 },
];

const EVENTS = [
  {id:1,  year:-13_800_000_000, layer:"cosmos",     imp:5, title:"The Big Bang",               desc:"All matter, energy, space and time emerge from a singularity. The universe ignites from infinite density and temperature, expanding outward in the first fraction of a second.",                          tags:["cosmology","origin","physics"]},
  {id:2,  year:-13_500_000_000, layer:"cosmos",     imp:4, title:"First Stars Ignite",          desc:"Population III stars form from primordial hydrogen and helium. Nuclear fusion begins forging the heavy elements that will eventually build planets, oceans, and living organisms.",                     tags:["astronomy","stellar","fusion"]},
  {id:3,  year:-10_000_000_000, layer:"cosmos",     imp:3, title:"Milky Way Forms",             desc:"Our galaxy takes shape over billions of years through galactic mergers and star formation. A spiral disk of 400 billion stars emerges in the cosmic web.",                                              tags:["galaxy","astronomy"]},
  {id:4,  year:-4_600_000_000,  layer:"cosmos",     imp:5, title:"Solar System Forms",          desc:"Gravitational collapse of a molecular cloud forms our Sun and a protoplanetary disk. The inner planets, including proto-Earth, coalesce from rocky material within 100 million years.",                tags:["solar","planets","formation"]},
  {id:5,  year:-4_500_000_000,  layer:"earth",      imp:5, title:"Earth & Moon Form",           desc:"Proto-Earth completes accretion. A Mars-sized body (Theia) collides and ejects material that coalesces into the Moon. Earth's rotation stabilizes. Magnetic field forms.",                           tags:["earth","moon","geology"]},
  {id:6,  year:-3_800_000_000,  layer:"life",       imp:5, title:"First Life Emerges",          desc:"Self-replicating RNA molecules appear in hydrothermal vents or tidal pools. The boundary between chemistry and biology is crossed. The biosphere begins its 3.8 billion year journey.",              tags:["biology","RNA","origin","evolution"]},
  {id:7,  year:-2_400_000_000,  layer:"earth",      imp:4, title:"Great Oxidation Event",       desc:"Cyanobacteria flood the atmosphere with oxygen through photosynthesis, poisoning the anaerobic world and triggering a mass extinction. This catastrophe becomes the foundation of complex life.",      tags:["atmosphere","oxygen","extinction"]},
  {id:8,  year:-1_500_000_000,  layer:"life",       imp:4, title:"Eukaryotic Cells Appear",     desc:"A momentous endosymbiotic event: an archaeon engulfs a bacterium, which becomes the mitochondrion. Complex cells with nuclei emerge, enabling multicellular organisms.",                             tags:["evolution","cells","biology"]},
  {id:9,  year:-541_000_000,    layer:"life",       imp:5, title:"Cambrian Explosion",          desc:"In ~25 million years, nearly all major animal body plans appear suddenly in the fossil record. Eyes, limbs, nervous systems, and predation emerge. The diversity of visible life begins.",             tags:["evolution","diversity","paleontology"]},
  {id:10, year:-375_000_000,    layer:"life",       imp:4, title:"Life Colonizes Land",         desc:"Fish with primitive limbs (Tiktaalik) pioneer the transition to land. Over millions of years, tetrapods adapt to terrestrial environments. Forests spread across continents.",                       tags:["evolution","tetrapods","transition"]},
  {id:11, year:-250_000_000,    layer:"earth",      imp:4, title:"Great Permian Extinction",    desc:"The Great Dying — 96% of marine species and 70% of land vertebrates vanish. Volcanic eruptions in Siberia trigger runaway greenhouse effect. Recovery takes 10 million years.",                      tags:["extinction","geology","volcanic"]},
  {id:12, year:-66_000_000,     layer:"earth",      imp:5, title:"Chicxulub Impact",            desc:"A 10km asteroid strikes the Yucatan Peninsula with the force of a billion nuclear bombs. Non-avian dinosaurs go extinct. Mammals inherit a cooling, recovering Earth.",                               tags:["asteroid","extinction","cretaceous"]},
  {id:13, year:-7_000_000,      layer:"life",       imp:4, title:"Hominid Split",               desc:"The lineage leading to humans diverges from our last common ancestor with chimpanzees. Bipedalism emerges on the African savanna as forests recede.",                                                 tags:["evolution","hominid","africa"]},
  {id:14, year:-300_000,        layer:"life",       imp:5, title:"Homo Sapiens Emerge",         desc:"Anatomically modern humans appear in Morocco and East Africa. Brain architecture enables recursive language, abstract thought, and cumulative culture — a new kind of mind on Earth.",               tags:["human","evolution","cognition"]},
  {id:15, year:-70_000,         layer:"society",    imp:5, title:"Cognitive Revolution",        desc:"Something ignites in the human mind — possibly a genetic mutation in brain wiring. Symbolic language, art, religion, and long-distance trade appear suddenly. Behavioral modernity begins.",         tags:["cognition","language","consciousness"]},
  {id:16, year:-45_000,         layer:"society",    imp:3, title:"Humans Reach Australia",      desc:"Maritime technology allows humans to cross open water and populate Australia. Megafauna extinctions follow. Aboriginal culture — the oldest continuous civilization — begins.",                      tags:["migration","australia","maritime"]},
  {id:17, year:-12_000,         layer:"earth",      imp:3, title:"Last Ice Age Ends",           desc:"Glaciers retreat. Sea levels rise 120 meters. Modern continental coastlines emerge. Climate stabilizes into the Holocene — the warm, wet epoch that makes agriculture possible.",                    tags:["climate","ice age","holocene"]},
  {id:18, year:-10_000,         layer:"society",    imp:5, title:"Agricultural Revolution",     desc:"Humans in the Fertile Crescent begin cultivating wheat, barley, and lentils. Independently, rice in China, maize in Mexico, yams in West Africa. The basis of civilization emerges.",               tags:["agriculture","civilization","neolithic"]},
  {id:19, year:-5_000,          layer:"society",    imp:4, title:"First Cities Rise",           desc:"Uruk in Mesopotamia grows to 50,000 inhabitants. Specialized labor, markets, temples, and administrative bureaucracy emerge. The city becomes humanity's dominant social form.",                     tags:["urban","mesopotamia","sumer"]},
  {id:20, year:-3_200,          layer:"culture",    imp:5, title:"Writing Invented",            desc:"Cuneiform script emerges in Sumer for accounting. Within centuries, it records laws, literature, and astronomy. Human knowledge transcends memory and geography for the first time.",                tags:["writing","communication","information"]},
  {id:21, year:-2_560,          layer:"culture",    imp:3, title:"Great Pyramid Built",         desc:"The Giza complex is completed by Pharaoh Khufu. It remains the tallest human structure for 3,800 years — a monument to organizational genius, astronomical knowledge, and divine kingship.",        tags:["egypt","architecture","engineering"]},
  {id:22, year:-1_200,          layer:"society",    imp:4, title:"Bronze Age Collapse",         desc:"Mysterious simultaneous collapse of Mycenean Greece, Hittite Empire, Ugarit, and Egypt. Trade networks shatter. Writing systems are lost. A 'dark age' descends on the Mediterranean.",            tags:["collapse","bronze age","crisis"]},
  {id:23, year:-600,            layer:"philosophy", imp:5, title:"The Axial Age",               desc:"The most extraordinary philosophical florescence in history: Buddha in India, Confucius in China, Zoroaster in Persia, Hebrew prophets, and Greek pre-Socratics all emerge simultaneously.",         tags:["philosophy","religion","consciousness","axial"]},
  {id:24, year:-508,            layer:"conflict",   imp:4, title:"Athenian Democracy",          desc:"Cleisthenes establishes demokratia in Athens. Citizens vote directly on laws and policy. The first experiment in self-governance plants seeds that bloom 2,500 years later.",                       tags:["democracy","greece","politics","governance"]},
  {id:25, year:-323,            layer:"culture",    imp:3, title:"Death of Alexander",          desc:"Alexander the Great dies at 32, having conquered from Greece to India. Hellenistic culture spreads Greek thought across three continents, fusing with Persian, Egyptian, and Indian wisdom.",       tags:["greece","empire","hellenistic"]},
  {id:26, year:-221,            layer:"conflict",   imp:4, title:"Qin Unifies China",           desc:"Qin Shi Huang creates the first Chinese empire. Standardized writing, currency, laws, and weights. The Great Wall begins. The Silk Road opens. 1.4 billion people trace this moment.",             tags:["china","empire","unification"]},
  {id:27, year:-44,             layer:"conflict",   imp:3, title:"Caesar Assassinated",         desc:"Julius Caesar falls in the Roman Senate on the Ides of March. The Republic collapses. The Empire rises. Roman law, Latin language, and Christian religion reshape Western civilization.",          tags:["rome","republic","politics"]},
  {id:28, year:1,               layer:"society",    imp:3, title:"Common Era Begins",           desc:"The Julian calendar reform anchors the Western chronological system. Approximate birth of Jesus of Nazareth, whose teachings will reshape the moral framework of half of humanity.",               tags:["christianity","calendar","rome"]},
  {id:29, year:476,             layer:"conflict",   imp:3, title:"Fall of Western Rome",        desc:"Romulus Augustulus is deposed. The Western Roman Empire formally ends. Medieval Europe begins. Yet Roman law, Latin, and Christianity endure for another thousand years.",                         tags:["rome","medieval","collapse"]},
  {id:30, year:632,             layer:"society",    imp:5, title:"Islam Spreads",               desc:"After Muhammad's death, Islam expands from Arabia across Persia, Egypt, North Africa, and Spain within a century. It preserves Greek science through the dark ages and transforms world civilization.", tags:["islam","religion","expansion","arabic"]},
  {id:31, year:1066,            layer:"conflict",   imp:3, title:"Norman Conquest",             desc:"Battle of Hastings. William the Conqueror permanently reshapes English law, language, and aristocracy. The fusion of Norman French and Anglo-Saxon becomes the English language.",                  tags:["england","medieval","conquest"]},
  {id:32, year:1215,            layer:"conflict",   imp:4, title:"Magna Carta",                 desc:"King John forced to sign the Great Charter limiting royal power. Seeds of habeas corpus, constitutional law, and the idea that rulers are subject to the law are planted.",                        tags:["law","rights","england","constitution"]},
  {id:33, year:1347,            layer:"society",    imp:5, title:"The Black Death",             desc:"Bubonic plague kills 30–60% of Europe's population in 5 years. Labor becomes scarce; serfs gain power. Art grows macabre. The Church loses authority. Modernity accelerates.",                   tags:["plague","pandemic","medieval","death"]},
  {id:34, year:1440,            layer:"science",    imp:5, title:"Gutenberg Press",             desc:"Johannes Gutenberg's movable type printing press democratizes knowledge. Within 50 years, 20 million books exist in Europe. The Reformation, Scientific Revolution, and Enlightenment follow.",    tags:["printing","information","technology","renaissance"]},
  {id:35, year:1492,            layer:"society",    imp:5, title:"Columbian Exchange",          desc:"Columbus reaches the Americas. Two biospheres that evolved separately for 20,000 years collide. Maize, potato, and tomato transform the Old World; smallpox and colonialism devastate the New.",   tags:["exploration","americas","colonialism","exchange"]},
  {id:36, year:1543,            layer:"science",    imp:5, title:"Copernican Revolution",       desc:"Heliocentric model published. Earth removed from the center of the cosmos. Science and church enter a centuries-long collision. The scientific method is born.",                                    tags:["astronomy","science","copernicus"]},
  {id:37, year:1687,            layer:"science",    imp:5, title:"Newton's Principia",          desc:"Laws of motion and universal gravitation published. The same force governing falling apples governs orbiting planets. Classical mechanics — the first unified theory of physics — is complete.",    tags:["physics","mathematics","newton","gravity"]},
  {id:38, year:1776,            layer:"conflict",   imp:4, title:"American Revolution",         desc:"Declaration of Independence. Enlightenment ideals — life, liberty, and the pursuit of happiness — are codified as the basis of government. A republic of 3 million becomes a superpower.",         tags:["revolution","democracy","america","enlightenment"]},
  {id:39, year:1789,            layer:"conflict",   imp:5, title:"French Revolution",           desc:"Liberté, Égalité, Fraternité. Louis XVI executed. Terror and then Napoleon follow. Modern concepts of nationalism, citizenship, human rights, and secular governance are born.",                   tags:["revolution","france","democracy","rights"]},
  {id:40, year:1859,            layer:"science",    imp:5, title:"Theory of Evolution",         desc:"Darwin's On the Origin of Species. Natural selection explains the diversity of all life from a common ancestor. Humans are not the center of biology, just as Earth is not the center of the cosmos.", tags:["biology","evolution","darwin","science"]},
  {id:41, year:1905,            layer:"science",    imp:5, title:"Einstein's Relativity",       desc:"Special relativity published in Einstein's annus mirabilis. E=mc². Space and time are not absolute — they depend on the observer's frame of reference. Physics is never the same.",                 tags:["physics","einstein","relativity","spacetime"]},
  {id:42, year:1914,            layer:"conflict",   imp:5, title:"World War I",                 desc:"Industrial warfare kills 20 million. Four empires dissolve. The map of the Middle East, Europe, and Asia is redrawn. Trench warfare and poison gas reveal the dark potential of technology.",        tags:["war","global","industrial","empire"]},
  {id:43, year:1917,            layer:"conflict",   imp:5, title:"Russian Revolution",          desc:"The Bolsheviks seize power. The Soviet Union forms. Communism as state ideology reshapes the 20th century, triggering the Cold War that divides the world for 70 years.",                          tags:["communism","revolution","russia","ideology"]},
  {id:44, year:1929,            layer:"society",    imp:4, title:"Great Depression",            desc:"Global financial collapse after the stock market crash. 25% unemployment in the US. Keynesian economics, the New Deal, and expanded government reshape capitalism permanently.",                    tags:["economy","depression","finance","capitalism"]},
  {id:45, year:1939,            layer:"conflict",   imp:5, title:"World War II",                desc:"Deadliest conflict in history. 70–85 million dead. The Holocaust. Atomic bombs. The United Nations, Bretton Woods, and the Marshall Plan create a new world order.",                               tags:["war","holocaust","nuclear","global"]},
  {id:46, year:1953,            layer:"science",    imp:5, title:"DNA Double Helix",            desc:"Watson, Crick, and Franklin reveal the molecular structure of DNA. The code of life is decoded. Molecular biology, genomics, genetic medicine, and eventually gene editing all flow from this moment.", tags:["biology","genetics","dna","medicine"]},
  {id:47, year:1969,            layer:"science",    imp:5, title:"Moon Landing",                desc:"Apollo 11. Armstrong and Aldrin walk on the Moon. Humanity reaches another world. 600 million watch live. The overview effect — seeing Earth as a whole — enters human consciousness.",             tags:["space","nasa","moon","exploration"]},
  {id:48, year:1989,            layer:"conflict",   imp:5, title:"Berlin Wall Falls",           desc:"The Cold War ends. Germany reunifies. The Soviet bloc collapses. Liberal democracy appears triumphant. A unipolar American moment begins — and ends within a generation.",                          tags:["coldwar","germany","communism","freedom"]},
  {id:49, year:1991,            layer:"science",    imp:5, title:"World Wide Web",              desc:"Tim Berners-Lee publishes the first website from CERN. HTTP, HTML, and URLs create the architecture of the information age. Within 30 years, 5 billion humans are connected.",                     tags:["internet","technology","information","web"]},
  {id:50, year:2001,            layer:"conflict",   imp:4, title:"September 11",                desc:"Al-Qaeda attacks kill 2,977 people in New York, DC, and Pennsylvania. The War on Terror begins. Surveillance states expand. Two decades of war in Afghanistan and Iraq follow.",                    tags:["terrorism","usa","geopolitics","security"]},
  {id:51, year:2007,            layer:"science",    imp:5, title:"iPhone Era Begins",           desc:"Steve Jobs introduces the iPhone. The smartphone era begins. Within a decade, 3 billion humans carry supercomputers and global network access in their pockets.",                                   tags:["mobile","technology","connectivity","apple"]},
  {id:52, year:2008,            layer:"society",    imp:4, title:"Global Financial Crisis",     desc:"Near-collapse of global banking. Lehman Brothers fails. Inequality and economic insecurity reshape politics worldwide, fueling populism and distrust of institutions.",                             tags:["economy","finance","capitalism","inequality"]},
  {id:53, year:2015,            layer:"earth",      imp:4, title:"Paris Climate Accord",        desc:"196 nations agree to limit global warming to 1.5°C. The first global governance response to an existential civilizational threat. Implementation remains deeply insufficient.",                    tags:["climate","environment","global","governance"]},
  {id:54, year:2020,            layer:"society",    imp:5, title:"COVID-19 Pandemic",           desc:"The first pandemic of the hyper-connected age. 7+ million dead. Remote work, digital life, mRNA vaccines, and mass inequality are all accelerated or exposed.",                                   tags:["pandemic","biology","society","technology"]},
  {id:55, year:2022,            layer:"science",    imp:4, title:"AlphaFold Solves Proteins",   desc:"DeepMind's AI predicts the 3D structure of every known protein — solving a 50-year grand challenge in weeks. Drug discovery and biology are fundamentally transformed.",                          tags:["ai","biology","medicine","proteins"]},
  {id:56, year:2023,            layer:"science",    imp:5, title:"AI Language Revolution",      desc:"GPT-4, Claude, Gemini demonstrate human-level reasoning across science, law, code, and creative domains. The third industrial revolution — cognitive automation — begins in earnest.",              tags:["ai","technology","intelligence","automation"]},
  {id:57, year:2024,            layer:"science",    imp:5, title:"AI Agents & Autonomy",        desc:"AI systems achieve autonomous planning, multi-step reasoning, and tool use. Knowledge work transforms. Every field from medicine to law to software faces restructuring.",                           tags:["ai","agents","automation","future"]},
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
const TW = 5200; // timeline width in px

function yearToX(year, start, end) {
  return ((year - start) / (end - start)) * TW;
}

function formatYear(y) {
  const a = Math.abs(y);
  const suffix = y < 0 ? " BCE" : y > 0 ? " CE" : "";
  if (a >= 1e9)  return `${(a/1e9).toFixed(1)}B${suffix}`;
  if (a >= 1e6)  return `${(a/1e6).toFixed(0)}M${suffix}`;
  if (a >= 1000) return `${(a/1000).toFixed(1)}K${suffix}`;
  return `${a}${suffix}`;
}

function getRulerTicks(start, end) {
  const range = end - start;
  let step;
  if (range > 5e9)       step = 1e9;
  else if (range > 1e9)  step = 5e8;
  else if (range > 1e8)  step = 2e7;
  else if (range > 1e7)  step = 5e6;
  else if (range > 1e6)  step = 1e6;
  else if (range > 1e5)  step = 2e4;
  else if (range > 1e4)  step = 2000;
  else if (range > 2000) step = 500;
  else if (range > 500)  step = 100;
  else                    step = 25;

  const ticks = [];
  const first = Math.ceil(start / step) * step;
  for (let t = first; t <= end; t += step) {
    ticks.push({ year: t, x: yearToX(t, start, end) });
  }
  return ticks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STARFIELD CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
function Starfield() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    const stars = Array.from({ length: 350 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.2 + 0.2,
      o: Math.random() * 0.8 + 0.1,
      speed: Math.random() * 0.003 + 0.0005,
      phase: Math.random() * Math.PI * 2,
    }));
    let raf, t = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, c.width, c.height);
      // Deep space bg
      const bg = ctx.createRadialGradient(c.width*0.35, c.height*0.4, 0, c.width*0.5, c.height*0.5, c.width*0.8);
      bg.addColorStop(0, "#0e0520"); bg.addColorStop(0.5, "#040312"); bg.addColorStop(1, "#02030c");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      // Nebula glow 1
      const n1 = ctx.createRadialGradient(c.width*0.15, c.height*0.35, 0, c.width*0.15, c.height*0.35, c.width*0.3);
      n1.addColorStop(0, "rgba(109,40,217,0.06)"); n1.addColorStop(1, "transparent");
      ctx.fillStyle = n1; ctx.fillRect(0, 0, c.width, c.height);
      // Nebula glow 2
      const n2 = ctx.createRadialGradient(c.width*0.8, c.height*0.6, 0, c.width*0.8, c.height*0.6, c.width*0.25);
      n2.addColorStop(0, "rgba(6,182,212,0.05)"); n2.addColorStop(1, "transparent");
      ctx.fillStyle = n2; ctx.fillRect(0, 0, c.width, c.height);
      // Stars
      stars.forEach(s => {
        const alpha = s.o * (0.5 + 0.5 * Math.sin(t * s.speed * 100 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT NODE + HOVER CARD
// ═══════════════════════════════════════════════════════════════════════════════
function EventNode({ ev, layer, x, onClick, selected }) {
  const [hovered, setHovered] = useState(false);
  const size = 5 + ev.imp * 3;
  const showCard = hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(ev)}
      style={{
        position:"absolute",
        left: x - size/2,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: hovered ? 100 : 10,
        cursor: "pointer",
      }}
    >
      {/* Glow ring */}
      <div style={{
        position:"absolute",
        inset: -size*0.6,
        borderRadius:"50%",
        background: `radial-gradient(circle, ${layer.accent}44 0%, transparent 70%)`,
        animation: selected || hovered ? "glow 1.5s ease-in-out infinite" : "none",
        transition: "all 0.3s",
      }} />
      {/* Node dot */}
      <div style={{
        width: size, height: size,
        borderRadius:"50%",
        background: hovered || selected
          ? `radial-gradient(circle at 30% 30%, white, ${layer.color})`
          : `radial-gradient(circle at 30% 30%, ${layer.color}, ${layer.accent})`,
        boxShadow: `0 0 ${size*1.5}px ${layer.color}88, 0 0 ${size*3}px ${layer.accent}44`,
        border: `1px solid ${layer.color}cc`,
        transition: "all 0.2s",
        transform: hovered ? "scale(1.5)" : "scale(1)",
      }} />
      {/* Hover card */}
      {showCard && (
        <div style={{
          position:"absolute",
          bottom: size + 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 240,
          background: "linear-gradient(135deg, rgba(10,8,30,0.97) 0%, rgba(20,10,50,0.97) 100%)",
          border: `1px solid ${layer.accent}66`,
          borderTop: `2px solid ${layer.accent}`,
          borderRadius: 8,
          padding: "12px 14px",
          pointerEvents:"none",
          animation: "fadeIn 0.15s ease-out",
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${layer.accent}22`,
          backdropFilter:"blur(12px)",
          zIndex:200,
        }}>
          <div style={{ fontFamily:"Share Tech Mono", fontSize:9, color: layer.color, letterSpacing:2, marginBottom:4, opacity:0.8 }}>
            {formatYear(ev.year)} · {layer.label}
          </div>
          <div style={{ fontFamily:"Cinzel", fontSize:13, color:"white", fontWeight:600, marginBottom:6, lineHeight:1.4 }}>
            {ev.title}
          </div>
          <div style={{ fontFamily:"Lora", fontSize:11, color:"rgba(200,190,230,0.85)", lineHeight:1.6 }}>
            {ev.desc.slice(0, 120)}…
          </div>
          <div style={{ marginTop:8, display:"flex", gap:4, flexWrap:"wrap" }}>
            {ev.tags.slice(0,3).map(t => (
              <span key={t} style={{
                fontFamily:"Share Tech Mono", fontSize:9, color: layer.accent,
                background: `${layer.accent}18`, border:`1px solid ${layer.accent}33`,
                padding:"1px 6px", borderRadius:3, letterSpacing:1,
              }}>{t}</span>
            ))}
          </div>
          {/* Arrow */}
          <div style={{
            position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)",
            width:0, height:0,
            borderLeft:"7px solid transparent", borderRight:"7px solid transparent",
            borderTop:`7px solid ${layer.accent}66`,
          }} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY LANE
// ═══════════════════════════════════════════════════════════════════════════════
function CategoryLane({ layer, epochKey, onEventClick, selectedEvent, active }) {
  const epoch = EPOCHS[epochKey];
  const events = useMemo(() =>
    EVENTS.filter(e => e.layer === layer.id && e.year >= epoch.start && e.year <= epoch.end),
    [layer.id, epochKey, epoch.start, epoch.end]
  );

  if (!active) return null;

  return (
    <div style={{
      position:"relative",
      height: 88,
      borderBottom: `1px solid rgba(255,255,255,0.04)`,
      background: `linear-gradient(90deg, ${layer.accent}08 0%, transparent 5%, transparent 95%, ${layer.accent}08 100%)`,
      flexShrink:0,
    }}>
      {/* Subtle lane glow */}
      <div style={{
        position:"absolute", inset:0,
        background: `radial-gradient(ellipse 30% 100% at 50% 50%, ${layer.accent}06, transparent)`,
        pointerEvents:"none",
      }} />
      {/* Center line */}
      <div style={{
        position:"absolute", top:"50%", left:0, right:0, height:1,
        background: `linear-gradient(90deg, transparent 0%, ${layer.accent}22 10%, ${layer.accent}15 90%, transparent 100%)`,
        transform:"translateY(-50%)",
        pointerEvents:"none",
      }} />
      {events.map(ev => (
        <EventNode
          key={ev.id} ev={ev} layer={layer}
          x={yearToX(ev.year, epoch.start, epoch.end)}
          onClick={onEventClick}
          selected={selectedEvent?.id === ev.id}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME RULER
// ═══════════════════════════════════════════════════════════════════════════════
function TimeRuler({ epochKey }) {
  const epoch = EPOCHS[epochKey];
  const ticks = useMemo(() => getRulerTicks(epoch.start, epoch.end), [epochKey, epoch.start, epoch.end]);

  return (
    <div style={{
      position:"relative", height:48,
      background:"linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(10,5,30,0.4) 100%)",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      flexShrink:0,
    }}>
      {ticks.map((tick, i) => (
        <div key={i} style={{ position:"absolute", left: tick.x, top:0, height:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ width:1, height:tick.year === 0 ? 28 : 16, background: tick.year === 0 ? "#fde68a66" : "rgba(255,255,255,0.15)", marginTop:"auto" }} />
          <span style={{
            fontFamily:"Share Tech Mono", fontSize:9, color: tick.year === 0 ? "#fde68a" : "rgba(255,255,255,0.35)",
            whiteSpace:"nowrap", transform:"translateX(-50%)", marginBottom:4, letterSpacing:0.5,
          }}>
            {formatYear(tick.year)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function EventModal({ ev, onClose }) {
  const layer = LAYERS.find(l => l.id === ev.layer);
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:1000,
        background:"rgba(2,3,12,0.85)",
        backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        animation:"fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:560, maxWidth:"90vw",
          background:"linear-gradient(135deg, rgba(12,8,35,0.99) 0%, rgba(18,10,45,0.99) 100%)",
          border:`1px solid ${layer.accent}55`,
          borderTop:`3px solid ${layer.accent}`,
          borderRadius:12,
          padding:"32px 36px",
          boxShadow:`0 40px 120px rgba(0,0,0,0.9), 0 0 80px ${layer.accent}18`,
          animation:"float 0.3s ease-out",
        }}
      >
        {/* Layer badge */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <span style={{
            fontFamily:"Share Tech Mono", fontSize:10, color: layer.color,
            background:`${layer.accent}18`, border:`1px solid ${layer.accent}44`,
            padding:"4px 12px", borderRadius:4, letterSpacing:2, textTransform:"uppercase",
          }}>{layer.label}</span>
          <span style={{ fontFamily:"Share Tech Mono", fontSize:11, color:"rgba(200,180,255,0.5)", letterSpacing:1 }}>
            {formatYear(ev.year)}
          </span>
        </div>
        {/* Title */}
        <h2 style={{ fontFamily:"Cinzel", fontSize:26, fontWeight:700, color:"white", marginBottom:16, lineHeight:1.3 }}>
          {ev.title}
        </h2>
        {/* Divider */}
        <div style={{ height:1, background:`linear-gradient(90deg, ${layer.accent}66, transparent)`, marginBottom:20 }} />
        {/* Description */}
        <p style={{ fontFamily:"Lora", fontSize:15, color:"rgba(210,200,240,0.9)", lineHeight:1.8, marginBottom:24 }}>
          {ev.desc}
        </p>
        {/* Tags */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
          {ev.tags.map(t => (
            <span key={t} style={{
              fontFamily:"Share Tech Mono", fontSize:10, color: layer.accent,
              background:`${layer.accent}18`, border:`1px solid ${layer.accent}33`,
              padding:"3px 10px", borderRadius:4, letterSpacing:1.5,
            }}># {t}</span>
          ))}
        </div>
        {/* Close */}
        <button onClick={onClose} style={{
          fontFamily:"Share Tech Mono", fontSize:11, letterSpacing:2,
          color:"rgba(200,180,255,0.6)", background:"transparent",
          border:"1px solid rgba(200,180,255,0.2)", padding:"8px 20px",
          borderRadius:4, cursor:"pointer", transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.target.style.color="white"; e.target.style.borderColor="rgba(200,180,255,0.5)"; }}
          onMouseLeave={e => { e.target.style.color="rgba(200,180,255,0.6)"; e.target.style.borderColor="rgba(200,180,255,0.2)"; }}
        >
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function GodsView() {
  const [epochKey, setEpochKey] = useState("HISTORICAL");
  const [activeLayers, setActiveLayers] = useState(new Set(LAYERS.map(l => l.id)));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const scrollRef = useRef(null);

  // Scroll timeline to "now" on epoch change
  useEffect(() => {
    if (!scrollRef.current) return;
    const epoch = EPOCHS[epochKey];
    const nowX = yearToX(2024, epoch.start, epoch.end);
    scrollRef.current.scrollLeft = Math.max(0, nowX - scrollRef.current.clientWidth * 0.82);
  }, [epochKey]);

  const handleEpochChange = useCallback((key) => {
    setTransitioning(true);
    setTimeout(() => {
      setEpochKey(key);
      setTransitioning(false);
    }, 250);
  }, []);

  const toggleLayer = useCallback((id) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const epoch = EPOCHS[epochKey];
  const nowX = yearToX(2025, epoch.start, epoch.end);

  const totalEvents = EVENTS.filter(e =>
    activeLayers.has(e.layer) && e.year >= epoch.start && e.year <= epoch.end
  ).length;

  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
      <style>{GLOBAL_CSS}</style>
      <Starfield />

      {/* ── HEADER ── */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0,
        padding:"14px 28px 12px",
        background:"linear-gradient(180deg, rgba(2,3,12,0.98) 0%, rgba(5,4,22,0.85) 100%)",
        borderBottom:"1px solid rgba(180,160,255,0.12)",
        backdropFilter:"blur(20px)",
        display:"flex", alignItems:"center", gap:24,
      }}>
        {/* Logo area */}
        <div style={{ flexShrink:0 }}>
          <div style={{ fontFamily:"Cinzel", fontSize:18, fontWeight:900, color:"white", letterSpacing:4, lineHeight:1.1 }}>
            GOD'S<span style={{ color:"#a78bfa" }}>  VIEW</span>
          </div>
          <div style={{ fontFamily:"Share Tech Mono", fontSize:9, color:"rgba(200,180,255,0.4)", letterSpacing:3, marginTop:2 }}>
            ◈ CHRONICLE OF TIME ◈
          </div>
        </div>

        <div style={{ width:1, height:36, background:"rgba(255,255,255,0.08)", flexShrink:0 }} />

        {/* Epoch selector */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {Object.entries(EPOCHS).map(([key, ep]) => (
            <button key={key} onClick={() => handleEpochChange(key)} style={{
              fontFamily:"Share Tech Mono", fontSize:9, letterSpacing:1.5,
              padding:"5px 12px", borderRadius:3, cursor:"pointer",
              border: epochKey === key ? `1px solid ${ep.color}` : "1px solid rgba(255,255,255,0.12)",
              background: epochKey === key ? `${ep.color}18` : "rgba(255,255,255,0.03)",
              color: epochKey === key ? ep.color : "rgba(255,255,255,0.4)",
              transition:"all 0.2s",
            }}
              onMouseEnter={e => { if (epochKey !== key) { e.target.style.borderColor = `${ep.color}66`; e.target.style.color = `${ep.color}99`; }}}
              onMouseLeave={e => { if (epochKey !== key) { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.color = "rgba(255,255,255,0.4)"; }}}
            >
              {ep.label}
              <span style={{ display:"block", fontSize:7, opacity:0.6, letterSpacing:0.5, marginTop:1 }}>{ep.sub}</span>
            </button>
          ))}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
          {/* Stats */}
          <div style={{ fontFamily:"Share Tech Mono", fontSize:9, color:"rgba(200,180,255,0.45)", letterSpacing:1.5, textAlign:"right" }}>
            <div><span style={{ color: epoch.color }}>{totalEvents}</span> EVENTS IN VIEW</div>
            <div style={{ opacity:0.6 }}>{Object.values(activeLayers).length === LAYERS.length ? "ALL" : activeLayers.size} LAYERS ACTIVE</div>
          </div>
          {/* Live dot */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", animation:"pulse 2s infinite", boxShadow:"0 0 8px #4ade80" }} />
            <span style={{ fontFamily:"Share Tech Mono", fontSize:8, color:"#4ade8077", letterSpacing:2 }}>LIVE</span>
          </div>
          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(p => !p)} style={{
            fontFamily:"Share Tech Mono", fontSize:9, letterSpacing:1.5,
            padding:"5px 10px", background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)",
            borderRadius:3, cursor:"pointer",
          }}>
            {sidebarOpen ? "◁ LAYERS" : "▷ LAYERS"}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", position:"relative", zIndex:10 }}>

        {/* ── LAYER SIDEBAR ── */}
        {sidebarOpen && (
          <div style={{
            width:190, flexShrink:0, display:"flex", flexDirection:"column",
            background:"linear-gradient(180deg, rgba(5,3,20,0.97) 0%, rgba(8,5,25,0.97) 100%)",
            borderRight:"1px solid rgba(180,160,255,0.1)",
            overflowY:"auto", backdropFilter:"blur(10px)",
            animation:"slideInRight 0.2s ease-out",
          }}>
            <div style={{ padding:"16px 14px 10px", fontFamily:"Share Tech Mono", fontSize:8, color:"rgba(200,180,255,0.3)", letterSpacing:3 }}>
              ◈ DIMENSIONS
            </div>
            {LAYERS.map((layer, idx) => (
              <button key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 14px",
                background: activeLayers.has(layer.id) ? `${layer.accent}0c` : "transparent",
                border:"none", borderLeft: `2px solid ${activeLayers.has(layer.id) ? layer.accent : "transparent"}`,
                cursor:"pointer", textAlign:"left", transition:"all 0.2s",
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background: activeLayers.has(layer.id) ? layer.color : "rgba(255,255,255,0.1)",
                  boxShadow: activeLayers.has(layer.id) ? `0 0 8px ${layer.accent}88` : "none",
                  flexShrink:0, transition:"all 0.2s",
                }} />
                <span style={{
                  fontFamily:"Share Tech Mono", fontSize:8.5, letterSpacing:1.2,
                  color: activeLayers.has(layer.id) ? layer.color : "rgba(255,255,255,0.2)",
                  transition:"all 0.2s",
                }}>{layer.label}</span>
              </button>
            ))}
            <div style={{ padding:"20px 14px 14px", marginTop:"auto", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontFamily:"Share Tech Mono", fontSize:8, color:"rgba(200,180,255,0.2)", lineHeight:1.8, letterSpacing:0.5 }}>
                SCROLL → NAVIGATE TIME<br/>HOVER → PREVIEW EVENT<br/>CLICK → FULL DETAIL
              </div>
            </div>
          </div>
        )}

        {/* ── TIMELINE AREA ── */}
        <div style={{
          flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
          perspective:"1400px",
        }}>
          {/* Layer labels column (fixed) */}
          <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
            {/* Fixed label column */}
            <div style={{ width: 0, flexShrink:0, zIndex:20 }}>
              {/* spacer for ruler */}
              <div style={{ height:48 }} />
              {LAYERS.map(layer => activeLayers.has(layer.id) && (
                <div key={layer.id} style={{
                  height:88, display:"flex", alignItems:"center",
                  paddingLeft:0, justifyContent:"flex-end",
                }} />
              ))}
            </div>

            {/* Scrollable timeline */}
            <div
              ref={scrollRef}
              style={{
                flex:1, overflowX:"auto", overflowY:"hidden",
                display:"flex", flexDirection:"column",
                opacity: transitioning ? 0 : 1,
                transition:"opacity 0.25s ease",
              }}
            >
              {/* Timeline inner */}
              <div style={{ width:TW, display:"flex", flexDirection:"column", position:"relative" }}>
                {/* Time Ruler */}
                <TimeRuler epochKey={epochKey} />

                {/* NOW vertical beam */}
                <div style={{
                  position:"absolute",
                  left: nowX,
                  top:0, bottom:0, width:1,
                  background:"linear-gradient(180deg, transparent 0%, #4ade8044 10%, #4ade8066 50%, #4ade8044 90%, transparent 100%)",
                  pointerEvents:"none", zIndex:50,
                  animation:"nowBeam 3s ease-in-out infinite",
                }}>
                  <div style={{
                    position:"absolute", top:52, left:-18,
                    fontFamily:"Share Tech Mono", fontSize:8, color:"#4ade80",
                    letterSpacing:1.5, background:"rgba(0,0,0,0.8)",
                    border:"1px solid #4ade8044", padding:"2px 6px", borderRadius:2,
                    whiteSpace:"nowrap",
                  }}>NOW ▾</div>
                </div>

                {/* Future fade-out */}
                <div style={{
                  position:"absolute",
                  right:0, top:0, bottom:0, width:200,
                  background:"linear-gradient(90deg, transparent, rgba(2,3,12,0.9))",
                  pointerEvents:"none", zIndex:30,
                }} />
                <div style={{
                  position:"absolute", right:20, top:"50%", transform:"translateY(-50%)",
                  fontFamily:"Share Tech Mono", fontSize:9, color:"rgba(200,180,255,0.2)",
                  letterSpacing:3, zIndex:35,
                }}>FUTURE ∞</div>

                {/* Past fade-in */}
                <div style={{
                  position:"absolute",
                  left:0, top:0, bottom:0, width:120,
                  background:"linear-gradient(90deg, rgba(2,3,12,0.9), transparent)",
                  pointerEvents:"none", zIndex:30,
                }} />

                {/* Category Lanes */}
                {LAYERS.map(layer => (
                  <CategoryLane
                    key={layer.id} layer={layer} epochKey={epochKey}
                    onEventClick={setSelectedEvent}
                    selectedEvent={selectedEvent}
                    active={activeLayers.has(layer.id)}
                  />
                ))}

                {/* Bottom timeline spine */}
                <div style={{ height:32, borderTop:"1px solid rgba(255,255,255,0.04)", background:"rgba(0,0,0,0.3)" }}>
                  <div style={{
                    position:"absolute", bottom:8, left:TW*0.15, right:TW*0.05,
                    height:1, background:"linear-gradient(90deg, transparent, rgba(180,160,255,0.08), transparent)",
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── LAYER LABELS OVERLAY (left-pinned) ── */}
          <div style={{
            position:"absolute", left: sidebarOpen ? 190 : 0,
            top:54 + 48, // header + ruler
            zIndex:40, pointerEvents:"none",
          }}>
            {LAYERS.map(layer => activeLayers.has(layer.id) && (
              <div key={layer.id} style={{
                height:88, display:"flex", alignItems:"center", paddingLeft:12,
                background:"linear-gradient(90deg, rgba(2,3,12,0.9) 0%, rgba(2,3,12,0.4) 70%, transparent 100%)",
                width:160,
              }}>
                <div style={{
                  width:4, height:4, borderRadius:"50%",
                  background: layer.color,
                  boxShadow:`0 0 6px ${layer.accent}`,
                  marginRight:8, flexShrink:0,
                }} />
                <span style={{
                  fontFamily:"Share Tech Mono", fontSize:8, letterSpacing:1.5,
                  color: layer.color, opacity:0.7, whiteSpace:"nowrap",
                }}>{layer.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0,
        height:28, display:"flex", alignItems:"center",
        padding:"0 20px", gap:24,
        background:"rgba(2,3,12,0.95)",
        borderTop:"1px solid rgba(180,160,255,0.07)",
      }}>
        {[
          ["EPOCH", `${epoch.label} · ${epoch.sub}`],
          ["RANGE", `${formatYear(epoch.start)} → ${formatYear(epoch.end)}`],
          ["EVENTS", `${totalEvents} IN VIEW · ${EVENTS.length} TOTAL`],
          ["LAYERS", `${activeLayers.size} / ${LAYERS.length} ACTIVE`],
          ["STATUS", "PROTOTYPE v0.1 · DATA: STATIC · LIVE FEEDS: PLANNED"],
        ].map(([k, v]) => (
          <span key={k} style={{ fontFamily:"Share Tech Mono", fontSize:8, letterSpacing:1, color:"rgba(200,180,255,0.25)" }}>
            <span style={{ color: epoch.color, marginRight:6 }}>{k}</span>{v}
          </span>
        ))}
      </div>

      {/* ── EVENT MODAL ── */}
      {selectedEvent && (
        <EventModal ev={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}
