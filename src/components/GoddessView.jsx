
import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from "react";
import { createPortal } from "react-dom";

// ═══════════════════════════════════════════════════════════════════════════════
// THEME — Gaia earth tones, dark & light
// ═══════════════════════════════════════════════════════════════════════════════
const THEMES = {
  dark: {
    bg: "#0d0c0a",
    bgAlt: "#161410",
    surface: "rgba(22,20,16,0.97)",
    surfaceHover: "rgba(30,28,22,0.97)",
    headerBg: "linear-gradient(180deg, rgba(13,12,10,0.98) 0%, rgba(22,20,16,0.90) 100%)",
    cardBg: "linear-gradient(135deg, rgba(22,18,12,0.98) 0%, rgba(30,24,16,0.98) 100%)",
    text: "#e8e0d4",
    textMuted: "rgba(210,200,180,0.55)",
    textDim: "rgba(180,170,150,0.30)",
    border: "rgba(180,160,120,0.12)",
    borderHover: "rgba(180,160,120,0.30)",
    rulerText: "rgba(200,190,170,0.45)",
    nowColor: "#8aaa6a",
    scrollThumb: "rgba(160,140,100,0.25)",
    starBg1: "#0e0d08",
    starBg2: "#0a0908",
    starBg3: "#0d0c0a",
    nebula1: "rgba(120,90,50,0.05)",
    nebula2: "rgba(60,90,80,0.04)",
    fadeEdge: "rgba(13,12,10,0.9)",
    modalOverlay: "rgba(10,9,7,0.88)",
  },
  light: {
    bg: "#f5f0e8",
    bgAlt: "#ede7db",
    surface: "rgba(245,240,232,0.97)",
    surfaceHover: "rgba(235,228,216,0.97)",
    headerBg: "linear-gradient(180deg, rgba(245,240,232,0.98) 0%, rgba(235,228,216,0.92) 100%)",
    cardBg: "linear-gradient(135deg, rgba(255,250,242,0.98) 0%, rgba(245,238,226,0.98) 100%)",
    text: "#2a2418",
    textMuted: "rgba(60,52,38,0.55)",
    textDim: "rgba(80,70,50,0.30)",
    border: "rgba(80,70,50,0.15)",
    borderHover: "rgba(80,70,50,0.35)",
    rulerText: "rgba(80,70,50,0.50)",
    nowColor: "#5a7a3a",
    scrollThumb: "rgba(100,90,60,0.25)",
    starBg1: "#ede7db",
    starBg2: "#e8e0d0",
    starBg3: "#f5f0e8",
    nebula1: "rgba(160,120,60,0.06)",
    nebula2: "rgba(80,120,100,0.05)",
    fadeEdge: "rgba(245,240,232,0.9)",
    modalOverlay: "rgba(245,240,232,0.88)",
  },
};

// Earth-tone layer palette — muted, warm, natural
const LAYER_COLORS = {
  dark: {
    herstory:   { color:"#c9977a", accent:"#9a6248" },
    indigenous: { color:"#c4a85a", accent:"#8a7530" },
    cosmos:     { color:"#9a90b8", accent:"#6a5a8a" },
    earth:      { color:"#7aaa7e", accent:"#4a7a4e" },
    life:       { color:"#6a9a7a", accent:"#3a7a5a" },
    society:    { color:"#c4aa6a", accent:"#8a7a3a" },
    conflict:   { color:"#b87a6a", accent:"#8a4a3a" },
    science:    { color:"#6a8ab0", accent:"#3a5a7a" },
    culture:    { color:"#b88a9a", accent:"#7a4a5a" },
    philosophy: { color:"#9a8aaa", accent:"#6a5a7a" },
  },
  light: {
    herstory:   { color:"#8a5238", accent:"#6a3a28" },
    indigenous: { color:"#7a6520", accent:"#5a4810" },
    cosmos:     { color:"#5a4a7a", accent:"#3a2a5a" },
    earth:      { color:"#3a6a3e", accent:"#2a4a2e" },
    life:       { color:"#2a6a4a", accent:"#1a4a3a" },
    society:    { color:"#7a6a2a", accent:"#5a4a1a" },
    conflict:   { color:"#7a3a2a", accent:"#5a2a1a" },
    science:    { color:"#2a4a6a", accent:"#1a3a5a" },
    culture:    { color:"#6a3a4a", accent:"#4a2a3a" },
    philosophy: { color:"#5a4a6a", accent:"#3a2a4a" },
  },
};

const ThemeContext = createContext("dark");

function useTheme() {
  const mode = useContext(ThemeContext);
  return { mode, t: THEMES[mode], lc: LAYER_COLORS[mode] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════
const EPOCHS = {
  COSMIC:       { label:"COSMIC",        sub:"13.8 Billion Years",  start:-13_800_000_000, end:2026, colorKey:"cosmos" },
  GEOLOGICAL:   { label:"GEOLOGICAL",    sub:"500 Million Years",   start:-500_000_000,    end:2026, colorKey:"earth" },
  DEEP_HUMAN:   { label:"DEEP HUMAN",    sub:"70,000 Years",        start:-70_000,         end:2026, colorKey:"society" },
  HISTORICAL:   { label:"HISTORICAL",    sub:"5,000 Years",         start:-5_000,          end:2026, colorKey:"science" },
  MODERN:       { label:"MODERN",        sub:"600 Years",           start:1400,            end:2026, colorKey:"culture" },
  CONTEMPORARY: { label:"CONTEMPORARY",  sub:"200 Years",           start:1800,            end:2026, colorKey:"life" },
};

const LAYERS = [
  { id:"herstory",   label:"HERSTORY & WOMEN" },
  { id:"indigenous", label:"INDIGENOUS WISDOM" },
  { id:"cosmos",     label:"COSMOS & PHYSICS" },
  { id:"earth",      label:"EARTH & CLIMATE" },
  { id:"life",       label:"LIFE & BIOLOGY" },
  { id:"society",    label:"HUMAN & SOCIETY" },
  { id:"conflict",   label:"WAR & POLITICS" },
  { id:"science",    label:"SCIENCE & TECH" },
  { id:"culture",    label:"ARTS & CULTURE" },
  { id:"philosophy", label:"PHILOSOPHY & IDEAS" },
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
  {id:9,  year:-541_000_000,    layer:"life",       imp:5, title:"Cambrian Explosion",          desc:"In ~25 million years, nearly all major animal body plans appear suddenly in the fossil record. Eyes, limbs, nervous systems, and predation emerge.",             tags:["evolution","diversity","paleontology"]},
  {id:10, year:-375_000_000,    layer:"life",       imp:4, title:"Life Colonizes Land",         desc:"Fish with primitive limbs (Tiktaalik) pioneer the transition to land. Over millions of years, tetrapods adapt to terrestrial environments.",                       tags:["evolution","tetrapods","transition"]},
  {id:11, year:-250_000_000,    layer:"earth",      imp:4, title:"Great Permian Extinction",    desc:"The Great Dying — 96% of marine species and 70% of land vertebrates vanish. Volcanic eruptions in Siberia trigger runaway greenhouse effect.",                      tags:["extinction","geology","volcanic"]},
  {id:12, year:-66_000_000,     layer:"earth",      imp:5, title:"Chicxulub Impact",            desc:"A 10km asteroid strikes the Yucatan Peninsula with the force of a billion nuclear bombs. Non-avian dinosaurs go extinct. Mammals inherit a cooling, recovering Earth.",                               tags:["asteroid","extinction","cretaceous"]},
  {id:13, year:-7_000_000,      layer:"life",       imp:4, title:"Hominid Split",               desc:"The lineage leading to humans diverges from our last common ancestor with chimpanzees. Bipedalism emerges on the African savanna as forests recede.",                                                 tags:["evolution","hominid","africa"]},
  {id:14, year:-300_000,        layer:"life",       imp:5, title:"Homo Sapiens Emerge",         desc:"Anatomically modern humans appear in Morocco and East Africa. Brain architecture enables recursive language, abstract thought, and cumulative culture.",               tags:["human","evolution","cognition"]},
  {id:15, year:-70_000,         layer:"society",    imp:5, title:"Cognitive Revolution",        desc:"Something ignites in the human mind — possibly a genetic mutation in brain wiring. Symbolic language, art, religion, and long-distance trade appear suddenly.",         tags:["cognition","language","consciousness"]},
  {id:16, year:-45_000,         layer:"society",    imp:3, title:"Humans Reach Australia",      desc:"Maritime technology allows humans to cross open water and populate Australia. Aboriginal culture — the oldest continuous civilization — begins.",                      tags:["migration","australia","maritime"]},
  {id:17, year:-12_000,         layer:"earth",      imp:3, title:"Last Ice Age Ends",           desc:"Glaciers retreat. Sea levels rise 120 meters. Modern continental coastlines emerge. Climate stabilizes into the Holocene.",                    tags:["climate","ice age","holocene"]},
  {id:18, year:-10_000,         layer:"society",    imp:5, title:"Agricultural Revolution",     desc:"Humans in the Fertile Crescent begin cultivating wheat, barley, and lentils. Independently, rice in China, maize in Mexico, yams in West Africa.",               tags:["agriculture","civilization","neolithic"]},
  {id:19, year:-5_000,          layer:"society",    imp:4, title:"First Cities Rise",           desc:"Uruk in Mesopotamia grows to 50,000 inhabitants. Specialized labor, markets, temples, and administrative bureaucracy emerge.",                     tags:["urban","mesopotamia","sumer"]},
  {id:20, year:-3_200,          layer:"culture",    imp:5, title:"Writing Invented",            desc:"Cuneiform script emerges in Sumer for accounting. Within centuries, it records laws, literature, and astronomy.",                tags:["writing","communication","information"]},
  {id:21, year:-2_560,          layer:"culture",    imp:3, title:"Great Pyramid Built",         desc:"The Giza complex is completed by Pharaoh Khufu. It remains the tallest human structure for 3,800 years.",        tags:["egypt","architecture","engineering"]},
  {id:22, year:-1_200,          layer:"society",    imp:4, title:"Bronze Age Collapse",         desc:"Mysterious simultaneous collapse of Mycenean Greece, Hittite Empire, Ugarit, and Egypt. Trade networks shatter. Writing systems are lost.",            tags:["collapse","bronze age","crisis"]},
  {id:23, year:-600,            layer:"philosophy", imp:5, title:"The Axial Age",               desc:"Buddha in India, Confucius in China, Zoroaster in Persia, Hebrew prophets, and Greek pre-Socratics all emerge simultaneously.",         tags:["philosophy","religion","consciousness","axial"]},
  {id:24, year:-508,            layer:"conflict",   imp:4, title:"Athenian Democracy",          desc:"Cleisthenes establishes demokratia in Athens. Citizens vote directly on laws and policy. The first experiment in self-governance.",                       tags:["democracy","greece","politics","governance"]},
  {id:25, year:-323,            layer:"culture",    imp:3, title:"Death of Alexander",          desc:"Alexander the Great dies at 32, having conquered from Greece to India. Hellenistic culture spreads Greek thought across three continents.",       tags:["greece","empire","hellenistic"]},
  {id:26, year:-221,            layer:"conflict",   imp:4, title:"Qin Unifies China",           desc:"Qin Shi Huang creates the first Chinese empire. Standardized writing, currency, laws, and weights. The Great Wall begins.",             tags:["china","empire","unification"]},
  {id:27, year:-44,             layer:"conflict",   imp:3, title:"Caesar Assassinated",         desc:"Julius Caesar falls in the Roman Senate on the Ides of March. The Republic collapses. The Empire rises.",          tags:["rome","republic","politics"]},
  {id:28, year:1,               layer:"society",    imp:3, title:"Common Era Begins",           desc:"The Julian calendar reform anchors the Western chronological system. Approximate birth of Jesus of Nazareth.",               tags:["christianity","calendar","rome"]},
  {id:29, year:476,             layer:"conflict",   imp:3, title:"Fall of Western Rome",        desc:"Romulus Augustulus is deposed. The Western Roman Empire formally ends. Medieval Europe begins.",                         tags:["rome","medieval","collapse"]},
  {id:30, year:632,             layer:"society",    imp:5, title:"Islam Spreads",               desc:"After Muhammad's death, Islam expands from Arabia across Persia, Egypt, North Africa, and Spain within a century.", tags:["islam","religion","expansion","arabic"]},
  {id:31, year:1066,            layer:"conflict",   imp:3, title:"Norman Conquest",             desc:"Battle of Hastings. William the Conqueror permanently reshapes English law, language, and aristocracy.",                  tags:["england","medieval","conquest"]},
  {id:32, year:1215,            layer:"conflict",   imp:4, title:"Magna Carta",                 desc:"King John forced to sign the Great Charter limiting royal power. Seeds of habeas corpus and constitutional law are planted.",                        tags:["law","rights","england","constitution"]},
  {id:33, year:1347,            layer:"society",    imp:5, title:"The Black Death",             desc:"Bubonic plague kills 30-60% of Europe's population in 5 years. Labor becomes scarce; serfs gain power. Modernity accelerates.",                   tags:["plague","pandemic","medieval","death"]},
  {id:34, year:1440,            layer:"science",    imp:5, title:"Gutenberg Press",             desc:"Movable type printing press democratizes knowledge. Within 50 years, 20 million books exist in Europe.",    tags:["printing","information","technology","renaissance"]},
  {id:35, year:1492,            layer:"society",    imp:5, title:"Columbian Exchange",          desc:"Columbus reaches the Americas. Two biospheres that evolved separately for 20,000 years collide.",   tags:["exploration","americas","colonialism","exchange"]},
  {id:36, year:1543,            layer:"science",    imp:5, title:"Copernican Revolution",       desc:"Heliocentric model published. Earth removed from the center of the cosmos. The scientific method is born.",                                    tags:["astronomy","science","copernicus"]},
  {id:37, year:1687,            layer:"science",    imp:5, title:"Newton's Principia",          desc:"Laws of motion and universal gravitation published. Classical mechanics — the first unified theory of physics — is complete.",    tags:["physics","mathematics","newton","gravity"]},
  {id:38, year:1776,            layer:"conflict",   imp:4, title:"American Revolution",         desc:"Declaration of Independence. Enlightenment ideals codified as the basis of government.",         tags:["revolution","democracy","america","enlightenment"]},
  {id:39, year:1789,            layer:"conflict",   imp:5, title:"French Revolution",           desc:"Liberte, Egalite, Fraternite. Modern concepts of nationalism, citizenship, human rights, and secular governance are born.",                   tags:["revolution","france","democracy","rights"]},
  {id:40, year:1859,            layer:"science",    imp:5, title:"Theory of Evolution",         desc:"Darwin's On the Origin of Species. Natural selection explains the diversity of all life from a common ancestor.", tags:["biology","evolution","darwin","science"]},
  {id:41, year:1905,            layer:"science",    imp:5, title:"Einstein's Relativity",       desc:"Special relativity published. E=mc2. Space and time are not absolute — they depend on the observer's frame of reference.",                 tags:["physics","einstein","relativity","spacetime"]},
  {id:42, year:1914,            layer:"conflict",   imp:5, title:"World War I",                 desc:"Industrial warfare kills 20 million. Four empires dissolve. The map of the Middle East, Europe, and Asia is redrawn.",        tags:["war","global","industrial","empire"]},
  {id:43, year:1917,            layer:"conflict",   imp:5, title:"Russian Revolution",          desc:"The Bolsheviks seize power. The Soviet Union forms. Communism reshapes the 20th century.",                          tags:["communism","revolution","russia","ideology"]},
  {id:44, year:1929,            layer:"society",    imp:4, title:"Great Depression",            desc:"Global financial collapse after the stock market crash. 25% unemployment in the US.",                    tags:["economy","depression","finance","capitalism"]},
  {id:45, year:1939,            layer:"conflict",   imp:5, title:"World War II",                desc:"Deadliest conflict in history. 70-85 million dead. The Holocaust. Atomic bombs. A new world order.",                               tags:["war","holocaust","nuclear","global"]},
  {id:46, year:1953,            layer:"science",    imp:5, title:"DNA Double Helix",            desc:"Watson, Crick, and Franklin reveal the molecular structure of DNA. The code of life is decoded.", tags:["biology","genetics","dna","medicine"]},
  {id:47, year:1969,            layer:"science",    imp:5, title:"Moon Landing",                desc:"Apollo 11. Armstrong and Aldrin walk on the Moon. 600 million watch live.",             tags:["space","nasa","moon","exploration"]},
  {id:48, year:1989,            layer:"conflict",   imp:5, title:"Berlin Wall Falls",           desc:"The Cold War ends. Germany reunifies. The Soviet bloc collapses.",                          tags:["coldwar","germany","communism","freedom"]},
  {id:49, year:1991,            layer:"science",    imp:5, title:"World Wide Web",              desc:"Tim Berners-Lee publishes the first website from CERN. Within 30 years, 5 billion humans are connected.",                     tags:["internet","technology","information","web"]},
  {id:50, year:2001,            layer:"conflict",   imp:4, title:"September 11",                desc:"Al-Qaeda attacks kill 2,977 people. The War on Terror begins. Surveillance states expand.",                    tags:["terrorism","usa","geopolitics","security"]},
  {id:51, year:2007,            layer:"science",    imp:5, title:"iPhone Era Begins",           desc:"The smartphone era begins. Within a decade, 3 billion humans carry supercomputers in their pockets.",                                   tags:["mobile","technology","connectivity","apple"]},
  {id:52, year:2008,            layer:"society",    imp:4, title:"Global Financial Crisis",     desc:"Near-collapse of global banking. Inequality reshapes politics worldwide.",                             tags:["economy","finance","capitalism","inequality"]},
  {id:53, year:2015,            layer:"earth",      imp:4, title:"Paris Climate Accord",        desc:"196 nations agree to limit global warming to 1.5C. Implementation remains deeply insufficient.",                    tags:["climate","environment","global","governance"]},
  {id:54, year:2020,            layer:"society",    imp:5, title:"COVID-19 Pandemic",           desc:"The first pandemic of the hyper-connected age. 7+ million dead. Remote work, mRNA vaccines, mass inequality exposed.",                                   tags:["pandemic","biology","society","technology"]},
  {id:55, year:2022,            layer:"science",    imp:4, title:"AlphaFold Solves Proteins",   desc:"DeepMind's AI predicts the 3D structure of every known protein — solving a 50-year grand challenge.",                          tags:["ai","biology","medicine","proteins"]},
  {id:56, year:2023,            layer:"science",    imp:5, title:"AI Language Revolution",      desc:"GPT-4, Claude, Gemini demonstrate human-level reasoning. Cognitive automation begins in earnest.",              tags:["ai","technology","intelligence","automation"]},
  {id:57, year:2024,            layer:"science",    imp:5, title:"AI Agents & Autonomy",        desc:"AI systems achieve autonomous planning, multi-step reasoning, and tool use. Knowledge work transforms.",                           tags:["ai","agents","automation","future"]},
  // HERSTORY
  {id:101, year:-3500,      layer:"herstory",   imp:4, title:"First Female Pharaohs",           desc:"Queens Neithhotep and Merneith rule ancient Egypt independently. Their names were erased from later king lists.", tags:["egypt","women","leadership","erased"]},
  {id:102, year:-2300,      layer:"herstory",   imp:5, title:"Enheduanna — First Named Author",  desc:"High priestess of Ur writes the Hymns to Inanna — the first signed literary works in human history. Predating Homer by 1,500 years.", tags:["writing","poetry","women","mesopotamia","erased"]},
  {id:103, year:-1500,      layer:"herstory",   imp:4, title:"Hatshepsut Rules Egypt",           desc:"One of history's most successful pharaohs reigns for 20+ years. Her stepson later smashed her statues and chiseled out her name.", tags:["egypt","pharaoh","women","erased","power"]},
  {id:104, year:-500,       layer:"herstory",   imp:3, title:"Artemisia Commands Fleet",  desc:"Queen of Halicarnassus commands her own warships at Salamis — the only commander Xerxes commended for courage.", tags:["war","women","greece","military","leadership"]},
  {id:105, year:-350,       layer:"herstory",   imp:4, title:"Agnodice — First Female Doctor",   desc:"Athenian woman disguises herself as a man to study medicine. Becomes Athens' most popular physician. Saved by revolting patients.", tags:["medicine","women","greece","rights","courage"]},
  {id:106, year:624,        layer:"herstory",   imp:4, title:"Khadijah bint Khuwaylid",          desc:"Muhammad's first wife and first Muslim. A successful merchant who funded the early Islamic movement.", tags:["islam","women","business","faith","leadership"]},
  {id:107, year:1030,       layer:"herstory",   imp:3, title:"Murasaki Shikibu's Tale of Genji", desc:"Japanese noblewoman writes what many scholars call the world's first novel.", tags:["literature","women","japan","first","novel"]},
  {id:108, year:1098,       layer:"herstory",   imp:4, title:"Hildegard von Bingen",  desc:"Abbess, composer of 77 works, herbalist, visionary, theologian. Her music was 'lost' for 600 years.", tags:["science","music","women","medieval","genius"]},
  {id:109, year:1405,       layer:"herstory",   imp:3, title:"Christine de Pizan", desc:"First known woman in Europe to earn her living by writing. Refuted claims of women's inferiority 600 years before feminism.", tags:["literature","women","feminism","france","writing"]},
  {id:110, year:1843,       layer:"herstory",   imp:5, title:"Ada Lovelace — First Programmer",  desc:"Writes the first algorithm for a machine. Envisions computers composing music. 100 years before the first computer.", tags:["computing","women","programming","first","technology"]},
  {id:111, year:1848,       layer:"herstory",   imp:5, title:"Seneca Falls Convention",          desc:"'All men and women are created equal.' The formal birth of the women's rights movement.", tags:["feminism","rights","usa","suffrage","equality"]},
  {id:112, year:1898,       layer:"herstory",   imp:5, title:"Marie Curie — First Nobel",        desc:"First woman Nobel laureate. First person to win two Nobels. The French Academy refused her due to sex.", tags:["science","women","physics","chemistry","first","erased"]},
  {id:113, year:1920,       layer:"herstory",   imp:5, title:"Women's Suffrage — USA",           desc:"19th Amendment ratified after 72 years of struggle. New Zealand was first in 1893.", tags:["suffrage","rights","usa","democracy","equality"]},
  {id:114, year:1950,       layer:"herstory",   imp:5, title:"Rosalind Franklin's Photo 51",     desc:"Her X-ray crystallography reveals DNA's structure. Watson and Crick used her data without credit.", tags:["science","women","dna","erased","injustice","biology"]},
  {id:115, year:1963,       layer:"herstory",   imp:4, title:"Friedan's Feminine Mystique", desc:"Documents 'the problem that has no name.' The book that launched second-wave feminism.", tags:["feminism","usa","rights","equality","liberation"]},
  {id:116, year:1963,       layer:"herstory",   imp:4, title:"Tereshkova in Space",    desc:"First woman in space, orbiting Earth 48 times. USSR then grounded all female cosmonauts for 19 years.", tags:["space","women","soviet","first","courage"]},
  {id:117, year:1976,       layer:"herstory",   imp:5, title:"Katherine Johnson at NASA", desc:"Manually verified orbital mechanics for Glenn's flight. Glenn personally requested she check the computers.", tags:["computing","women","nasa","mathematics","erased"]},
  {id:118, year:2017,       layer:"herstory",   imp:4, title:"#MeToo Goes Global",               desc:"Tarana Burke's movement explodes worldwide. Most significant shift in workplace power since suffrage.", tags:["feminism","justice","global","movement","equality"]},
  {id:119, year:2020,       layer:"herstory",   imp:4, title:"First Female VP — USA",       desc:"Kamala Harris becomes the first woman VP — also first Black and South Asian American in the role.", tags:["politics","women","usa","first","equality"]},
  // INDIGENOUS
  {id:201, year:-40000,     layer:"indigenous", imp:5, title:"Aboriginal Songlines",             desc:"Australia's First Peoples develop navigational cosmology encoded in song. The oldest continuous knowledge system on Earth.", tags:["indigenous","australia","navigation","wisdom","cosmology"]},
  {id:202, year:-12000,     layer:"indigenous", imp:4, title:"First Nations Land Management",    desc:"Indigenous peoples practice sophisticated land management — controlled burns, aquaculture, food forests.", tags:["indigenous","ecology","americas","science","erased"]},
  {id:203, year:-3000,      layer:"indigenous", imp:4, title:"Polynesian Navigation",            desc:"Pacific Islanders navigate 10 million square miles of open ocean using stars, waves, and birds.", tags:["indigenous","navigation","pacific","ocean","genius"]},
  {id:204, year:1492,       layer:"indigenous", imp:5, title:"Indigenous Genocide Begins",       desc:"Columbus's arrival begins systematic destruction. 90% of indigenous populations die within 150 years.", tags:["genocide","indigenous","colonialism","americas","catastrophe"]},
  {id:205, year:1830,       layer:"indigenous", imp:4, title:"Trail of Tears",                   desc:"Indian Removal Act forces 60,000+ Native Americans from ancestral lands. 15,000 die on forced marches.", tags:["indigenous","genocide","usa","removal","catastrophe"]},
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function formatYear(y) {
  const a = Math.abs(y);
  const suffix = y < 0 ? " BCE" : y > 0 ? " CE" : "";
  if (a >= 1e9)  return `${(a/1e9).toFixed(1)}B${suffix}`;
  if (a >= 1e6)  return `${(a/1e6).toFixed(1)}M${suffix}`;
  if (a >= 1e5)  return `${(a/1e3).toFixed(0)}K${suffix}`;
  if (a >= 1000) return `${(a/1000).toFixed(1)}K${suffix}`;
  return `${a}${suffix}`;
}

function getRulerTicks(start, end) {
  const range = end - start;
  let step;
  if (range > 5e9) step = 1e9; else if (range > 1e9) step = 5e8;
  else if (range > 1e8) step = 2e7; else if (range > 1e7) step = 5e6;
  else if (range > 1e6) step = 1e6; else if (range > 1e5) step = 2e4;
  else if (range > 1e4) step = 2000; else if (range > 2000) step = 500;
  else if (range > 500) step = 100; else if (range > 100) step = 25;
  else if (range > 20) step = 5; else step = 1;
  const ticks = [];
  for (let t = Math.ceil(start / step) * step; t <= end; t += step) ticks.push(t);
  return ticks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STARFIELD — theme-aware
// ═══════════════════════════════════════════════════════════════════════════════
function Starfield({ panOffset, theme }) {
  const ref = useRef(null);
  const starsRef = useRef(null);
  const t = THEMES[theme];

  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext("2d");
    if (!starsRef.current) {
      starsRef.current = Array.from({ length: 300 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        o: Math.random() * (theme === "dark" ? 0.7 : 0.25) + 0.1,
        speed: Math.random() * 0.003 + 0.0005,
        phase: Math.random() * Math.PI * 2,
        depth: Math.random() * 0.8 + 0.2,
      }));
    }
    const stars = starsRef.current;
    let raf, time = 0;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.006;
      ctx.clearRect(0, 0, c.width, c.height);
      const bg = ctx.createRadialGradient(c.width*0.35, c.height*0.4, 0, c.width*0.5, c.height*0.5, c.width*0.8);
      bg.addColorStop(0, t.starBg1); bg.addColorStop(0.5, t.starBg2); bg.addColorStop(1, t.starBg3);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
      // Nebula
      const n1 = ctx.createRadialGradient(c.width*0.15, c.height*0.35, 0, c.width*0.15, c.height*0.35, c.width*0.3);
      n1.addColorStop(0, t.nebula1); n1.addColorStop(1, "transparent");
      ctx.fillStyle = n1; ctx.fillRect(0, 0, c.width, c.height);
      const n2 = ctx.createRadialGradient(c.width*0.8, c.height*0.6, 0, c.width*0.8, c.height*0.6, c.width*0.25);
      n2.addColorStop(0, t.nebula2); n2.addColorStop(1, "transparent");
      ctx.fillStyle = n2; ctx.fillRect(0, 0, c.width, c.height);
      // Stars with parallax
      const px = (panOffset || 0) * 0.00003;
      const dotColor = theme === "dark" ? "255,255,255" : "60,50,30";
      stars.forEach(s => {
        const alpha = s.o * (0.5 + 0.5 * Math.sin(time * s.speed * 100 + s.phase));
        const sx = ((s.x + px * s.depth) % 1 + 1) % 1;
        ctx.beginPath();
        ctx.arc(sx * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor},${alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [panOffset, theme, t]);

  return <canvas ref={ref} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════
function ParticleCanvas({ events, yearToPct, layerColors, containerRect }) {
  const ref = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const c = ref.current;
    if (!c || !containerRect) return;
    const ctx = c.getContext("2d");
    c.width = containerRect.width;
    c.height = containerRect.height;

    events.forEach(ev => {
      const pct = yearToPct(ev.year);
      if (pct < 0 || pct > 1) return;
      const lc = layerColors[ev.layer];
      if (!lc || particlesRef.current.length > 250) return;
      for (let i = 0; i < 1 + Math.floor(Math.random()); i++) {
        particlesRef.current.push({
          x: pct * c.width + (Math.random() - 0.5) * 10,
          y: Math.random() * c.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(Math.random() * 0.4 + 0.15),
          life: 1, decay: 0.002 + Math.random() * 0.003,
          r: Math.random() * 2 + 0.5,
          color: lc.color,
        });
      }
    });
    if (particlesRef.current.length > 250) particlesRef.current = particlesRef.current.slice(-250);

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) return false;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.life * 35).toString(16).padStart(2, "0");
        ctx.fill();
        return true;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [events, yearToPct, layerColors, containerRect]);

  return <canvas ref={ref} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:5, opacity:0.5 }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION LINES
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectionLines({ hoveredEvent, visibleEvents, yearToPct, activeLayerIds, layerColors, containerRect }) {
  const ref = useRef(null);

  useEffect(() => {
    const c = ref.current;
    if (!c || !containerRect) return;
    const ctx = c.getContext("2d");
    c.width = containerRect.width; c.height = containerRect.height;
    ctx.clearRect(0, 0, c.width, c.height);
    if (!hoveredEvent) return;

    const srcPct = yearToPct(hoveredEvent.year);
    const srcTags = new Set(hoveredEvent.tags);
    const srcLc = layerColors[hoveredEvent.layer];

    visibleEvents.forEach(ev => {
      if (ev.id === hoveredEvent.id) return;
      const shared = ev.tags.filter(t => srcTags.has(t));
      if (shared.length === 0) return;
      const pct = yearToPct(ev.year);
      if (pct < 0 || pct > 1) return;
      const srcIdx = activeLayerIds.indexOf(hoveredEvent.layer);
      const tgtIdx = activeLayerIds.indexOf(ev.layer);
      if (srcIdx < 0 || tgtIdx < 0) return;
      const laneH = containerRect.height / activeLayerIds.length;
      const srcY = (srcIdx + 0.5) * laneH;
      const tgtY = (tgtIdx + 0.5) * laneH;
      const alpha = Math.min(shared.length * 0.15, 0.4);
      ctx.beginPath();
      ctx.moveTo(srcPct * c.width, srcY);
      ctx.quadraticCurveTo((srcPct * c.width + pct * c.width) / 2, Math.min(srcY, tgtY) - 25, pct * c.width, tgtY);
      ctx.strokeStyle = (srcLc?.color || "#9a8a7a") + Math.floor(alpha * 255).toString(16).padStart(2, "0");
      ctx.lineWidth = shared.length * 0.5 + 0.5;
      ctx.stroke();
    });
  }, [hoveredEvent, visibleEvents, yearToPct, activeLayerIds, layerColors, containerRect]);

  return <canvas ref={ref} style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:4 }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT NODE
// ═══════════════════════════════════════════════════════════════════════════════
function EventNode({ ev, xPct, onClick, selected, onHover, breathPhase }) {
  const { t, lc } = useTheme();
  const [hovered, setHovered] = useState(false);
  const nodeRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);
  const layerColor = lc[ev.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
  const size = 10 + ev.imp * 4;
  const breathScale = 1 + Math.sin(breathPhase + ev.id * 1.7) * 0.06;

  // Calculate card position in viewport coords when hovered
  useEffect(() => {
    if (!hovered || !nodeRef.current) { setCardPos(null); return; }
    const rect = nodeRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const CARD_W = 320, CARD_H = 220;
    // If not enough room above (< 220px from top), show below
    const showBelow = rect.top < CARD_H + 10;
    // Clamp horizontal so card stays on screen
    let left = cx - CARD_W / 2;
    left = Math.max(8, Math.min(window.innerWidth - CARD_W - 8, left));
    const top = showBelow ? rect.bottom + 12 : rect.top - CARD_H - 12;
    setCardPos({ left, top, showBelow });
  }, [hovered]);

  return (
    <div
      ref={nodeRef}
      onMouseEnter={() => { setHovered(true); onHover(ev); }}
      onMouseLeave={() => { setHovered(false); onHover(null); }}
      onClick={(e) => { e.stopPropagation(); onClick(ev); }}
      style={{
        position:"absolute", left:`${xPct * 100}%`, top:"50%",
        transform:"translate(-50%, -50%)", zIndex: hovered ? 100 : 10,
        cursor:"pointer", padding:10,
      }}
    >
      <div style={{
        position:"absolute", left:"50%", top:"50%",
        width: size * 2.8, height: size * 2.8,
        transform: `translate(-50%, -50%) scale(${breathScale})`,
        borderRadius:"50%",
        background: `radial-gradient(circle, ${layerColor.accent}${hovered ? "55" : "25"} 0%, transparent 70%)`,
        transition: "all 0.3s",
      }} />
      <div style={{
        width: size, height: size, borderRadius:"50%",
        background: hovered || selected
          ? `radial-gradient(circle at 30% 30%, ${t.text}, ${layerColor.color})`
          : `radial-gradient(circle at 30% 30%, ${layerColor.color}, ${layerColor.accent})`,
        boxShadow: `0 0 ${size}px ${layerColor.color}55, 0 0 ${size*2}px ${layerColor.accent}22`,
        border: `1.5px solid ${layerColor.color}88`,
        transition: "all 0.2s",
        transform: `scale(${hovered ? 1.5 : breathScale})`,
        position:"relative", zIndex:2,
      }} />
      {/* Hover card rendered via portal so it escapes all overflow/z-index contexts */}
      {hovered && cardPos && createPortal(
        <div style={{
          position:"fixed",
          left: cardPos.left,
          top: cardPos.top,
          width: 320,
          background: t.cardBg,
          border: `1px solid ${layerColor.accent}55`,
          borderTop: cardPos.showBelow ? "none" : `3px solid ${layerColor.accent}`,
          borderBottom: cardPos.showBelow ? `3px solid ${layerColor.accent}` : "none",
          borderRadius: 12, padding:"18px 20px",
          pointerEvents:"none", animation:"fadeIn 0.12s ease-out",
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${layerColor.accent}15`,
          backdropFilter:"blur(12px)", zIndex:9999,
        }}>
          <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:600, color: layerColor.color, letterSpacing:2, marginBottom:6 }}>
            {formatYear(ev.year)} · {LAYERS.find(l => l.id === ev.layer)?.label}
          </div>
          <div style={{ fontFamily:"'Cinzel', serif", fontSize:17, fontWeight:700, color: t.text, marginBottom:10, lineHeight:1.4 }}>
            {ev.title}
          </div>
          <div style={{ fontFamily:"'Lora', serif", fontSize:14, color: t.textMuted, lineHeight:1.7 }}>
            {ev.desc.slice(0, 160)}...
          </div>
          <div style={{ marginTop:12, display:"flex", gap:5, flexWrap:"wrap" }}>
            {ev.tags.slice(0,4).map(tag => (
              <span key={tag} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600,
                color: layerColor.accent, background:`${layerColor.accent}15`,
                border:`1px solid ${layerColor.accent}30`, padding:"3px 9px", borderRadius:4, letterSpacing:1,
              }}>{tag}</span>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function EventModal({ ev, onClose }) {
  const { t, lc } = useTheme();
  const layerColor = lc[ev.layer] || { color:"#9a8a7a", accent:"#6a5a4a" };
  const layerLabel = LAYERS.find(l => l.id === ev.layer)?.label || "";

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:1000,
      background: t.modalOverlay, backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      animation:"fadeIn 0.2s ease-out",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:620, maxWidth:"92vw",
        background: t.cardBg,
        border:`1px solid ${layerColor.accent}44`, borderTop:`3px solid ${layerColor.accent}`,
        borderRadius:16, padding:"40px 44px",
        boxShadow:`0 40px 120px rgba(0,0,0,0.5), 0 0 60px ${layerColor.accent}10`,
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <span style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:13, fontWeight:700, color: layerColor.color,
            background:`${layerColor.accent}15`, border:`1px solid ${layerColor.accent}33`,
            padding:"6px 16px", borderRadius:6, letterSpacing:2, textTransform:"uppercase",
          }}>{layerLabel}</span>
          <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:14, fontWeight:600, color: t.textMuted, letterSpacing:1 }}>
            {formatYear(ev.year)}
          </span>
        </div>
        <h2 style={{ fontFamily:"'Cinzel', serif", fontSize:30, fontWeight:900, color: t.text, marginBottom:20, lineHeight:1.3 }}>
          {ev.title}
        </h2>
        <div style={{ height:2, background:`linear-gradient(90deg, ${layerColor.accent}55, transparent)`, marginBottom:24, borderRadius:1 }} />
        <p style={{ fontFamily:"'Lora', serif", fontSize:18, color: t.text, lineHeight:2, marginBottom:32, opacity:0.85 }}>
          {ev.desc}
        </p>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:34 }}>
          {ev.tags.map(tag => (
            <span key={tag} style={{
              fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:600, color: layerColor.accent,
              background:`${layerColor.accent}12`, border:`1px solid ${layerColor.accent}28`,
              padding:"5px 14px", borderRadius:6, letterSpacing:1.5,
            }}># {tag}</span>
          ))}
        </div>
        <button onClick={onClose} style={{
          fontFamily:"'Share Tech Mono', monospace", fontSize:13, fontWeight:700, letterSpacing:2,
          color: t.textMuted, background:"transparent",
          border:`1.5px solid ${t.border}`, padding:"12px 28px",
          borderRadius:6, cursor:"pointer", transition:"all 0.2s",
        }}
          onMouseEnter={e => { e.target.style.color = t.text; e.target.style.borderColor = t.borderHover; }}
          onMouseLeave={e => { e.target.style.color = t.textMuted; e.target.style.borderColor = t.border; }}
        >
          ESC · CLOSE
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function GoddessView() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  });
  const t = THEMES[theme];
  const lc = LAYER_COLORS[theme];

  const [viewStart, setViewStart] = useState(-5_000);
  const [viewEnd, setViewEnd] = useState(2026);
  const [activeLayers, setActiveLayers] = useState(new Set(LAYERS.map(l => l.id)));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [containerRect, setContainerRect] = useState(null);

  const dragRef = useRef({ startX:0, startViewStart:0, startViewEnd:0 });
  const timelineRef = useRef(null);
  const lanesRef = useRef(null);
  const animRef = useRef(null);
  const velocityRef = useRef(0);
  const edgeDriftRef = useRef(0);
  const mouseXRef = useRef(0.5);
  const lastDragXRef = useRef(0);
  const lastDragTimeRef = useRef(0);
  const viewRef = useRef({ start: viewStart, end: viewEnd });
  viewRef.current = { start: viewStart, end: viewEnd };

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e) => setTheme(e.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const el = lanesRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setContainerRect({ width: r.width, height: r.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Breathing
  useEffect(() => {
    let raf;
    const tick = () => { setBreathPhase(performance.now() * 0.002); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Edge drift + inertia
  useEffect(() => {
    let raf;
    const EDGE = 0.12, MAX = 0.015;
    const tick = () => {
      const v = viewRef.current, range = v.end - v.start;
      if (!isDragging && !isAutoPlaying) {
        const mx = mouseXRef.current;
        let drift = 0;
        if (mx < EDGE) drift = -MAX * Math.pow(1 - mx / EDGE, 2);
        else if (mx > 1 - EDGE) drift = MAX * Math.pow((mx - (1 - EDGE)) / EDGE, 2);
        edgeDriftRef.current = drift;
        if (Math.abs(drift) > 0.0001) {
          const s = drift * range;
          setViewStart(vs => vs + s); setViewEnd(ve => ve + s);
        }
      }
      if (!isDragging && Math.abs(velocityRef.current) > 0.0001) {
        const s = velocityRef.current * range;
        setViewStart(vs => vs + s); setViewEnd(ve => ve + s);
        velocityRef.current *= 0.95;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isDragging, isAutoPlaying]);

  // Auto-tour
  useEffect(() => {
    if (!isAutoPlaying) return;
    const eps = Object.values(EPOCHS);
    let idx = 0;
    const fly = () => {
      if (idx >= eps.length) { setIsAutoPlaying(false); return; }
      animateTo(eps[idx].start, eps[idx].end, 2500);
      idx++;
      return setTimeout(fly, 3000);
    };
    const timer = fly();
    return () => clearTimeout(timer);
  }, [isAutoPlaying]);

  const animateTo = useCallback((ts, te, dur = 700) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    const fs = viewRef.current.start, fe = viewRef.current.end, st = performance.now();
    const anim = (now) => {
      const p = Math.min((now - st) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setViewStart(fs + (ts - fs) * e); setViewEnd(fe + (te - fe) * e);
      if (p < 1) animRef.current = requestAnimationFrame(anim);
    };
    animRef.current = requestAnimationFrame(anim);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const v = viewRef.current, range = v.end - v.start, my = v.start + mx * range;
    const zf = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const nr = Math.max(10, Math.min(15e9, range * zf));
    setViewStart(my - mx * nr); setViewEnd(my + (1 - mx) * nr);
  }, []);

  const handleMouseMoveGlobal = useCallback((e) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) mouseXRef.current = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    velocityRef.current = 0;
    dragRef.current = { startX: e.clientX, startViewStart: viewRef.current.start, startViewEnd: viewRef.current.end };
    lastDragXRef.current = e.clientX; lastDragTimeRef.current = performance.now();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = e.clientX - dragRef.current.startX;
    const range = dragRef.current.startViewEnd - dragRef.current.startViewStart;
    const shift = -(dx / rect.width) * range;
    setViewStart(dragRef.current.startViewStart + shift); setViewEnd(dragRef.current.startViewEnd + shift);
    const now = performance.now(), dt = now - lastDragTimeRef.current;
    if (dt > 0) velocityRef.current = -((e.clientX - lastDragXRef.current) / rect.width) * 0.5;
    lastDragXRef.current = e.clientX; lastDragTimeRef.current = now;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  // Touch
  const touchRef = useRef({ startX:0, startViewStart:0, startViewEnd:0, lastDist:0 });
  const handleTouchStart = useCallback((e) => {
    if (animRef.current) cancelAnimationFrame(animRef.current); velocityRef.current = 0;
    if (e.touches.length === 1) touchRef.current = { startX: e.touches[0].clientX, startViewStart: viewRef.current.start, startViewEnd: viewRef.current.end, lastDist: 0 };
    else if (e.touches.length === 2) touchRef.current.lastDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
  }, []);
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.startX;
      const range = touchRef.current.startViewEnd - touchRef.current.startViewStart;
      setViewStart(touchRef.current.startViewStart - (dx/rect.width)*range);
      setViewEnd(touchRef.current.startViewEnd - (dx/rect.width)*range);
    } else if (e.touches.length === 2) {
      const dist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
      if (touchRef.current.lastDist > 0) {
        const sc = touchRef.current.lastDist / dist, v = viewRef.current;
        const range = v.end - v.start, mid = (v.start + v.end)/2;
        const nr = Math.max(10, Math.min(15e9, range*sc));
        setViewStart(mid-nr/2); setViewEnd(mid+nr/2);
      }
      touchRef.current.lastDist = dist;
    }
  }, []);

  const handleEpochChange = useCallback((key) => { const ep = EPOCHS[key]; animateTo(ep.start, ep.end); }, [animateTo]);
  const toggleLayer = useCallback((id) => { setActiveLayers(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);

  // Derived
  const range = viewEnd - viewStart;
  const yearToPct = useCallback((y) => (y - viewStart) / range, [viewStart, range]);
  const nowPct = yearToPct(2026);

  const currentEpochKey = useMemo(() => {
    let best = "HISTORICAL", bd = Infinity;
    for (const [k, ep] of Object.entries(EPOCHS)) {
      const d = Math.abs(viewStart - ep.start) + Math.abs(viewEnd - ep.end);
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }, [viewStart, viewEnd]);

  const epochColorKey = EPOCHS[currentEpochKey].colorKey;
  const epochColor = lc[epochColorKey]?.color || "#9a8a7a";

  const visibleEvents = useMemo(() =>
    EVENTS.filter(e => activeLayers.has(e.layer) && e.year >= viewStart && e.year <= viewEnd),
    [viewStart, viewEnd, activeLayers]);

  const activeLayersList = useMemo(() => LAYERS.filter(l => activeLayers.has(l.id)), [activeLayers]);
  const activeLayerIds = useMemo(() => activeLayersList.map(l => l.id), [activeLayersList]);

  const eventsByLayer = useMemo(() => {
    const m = {}; LAYERS.forEach(l => { m[l.id] = []; });
    visibleEvents.forEach(ev => { if (m[ev.layer]) m[ev.layer].push(ev); });
    return m;
  }, [visibleEvents]);

  const rulerTicks = useMemo(() => getRulerTicks(viewStart, viewEnd), [viewStart, viewEnd]);

  const zoomLabel = range > 1e9 ? "COSMIC" : range > 1e6 ? "GEOLOGICAL" : range > 1e4 ? "DEEP TIME"
    : range > 1000 ? "HISTORICAL" : range > 100 ? "CENTURY" : range > 20 ? "GENERATION" : "DECADE";

  const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:${t.bg}}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:${theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)"}}
::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:2px}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
`;

  return (
    <ThemeContext.Provider value={theme}>
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", display:"flex", flexDirection:"column", position:"relative", color: t.text }}>
      <style>{globalCSS}</style>
      <Starfield panOffset={viewStart} theme={theme} />

      {/* ── HEADER ── */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0,
        padding:"16px 28px 14px",
        background: t.headerBg,
        borderBottom:`1px solid ${t.border}`,
        backdropFilter:"blur(20px)",
        display:"flex", alignItems:"center", gap:20,
      }}>
        <div style={{ flexShrink:0 }}>
          <div style={{ fontFamily:"'Cinzel', serif", fontSize:22, fontWeight:900, color: t.text, letterSpacing:5, lineHeight:1.1 }}>
            SIMURGH'S<span style={{ color: epochColor, marginLeft:6 }}>VIEW</span>
          </div>
          <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textMuted, letterSpacing:3, marginTop:3 }}>
            HERSTORY OF TIME
          </div>
        </div>

        <div style={{ width:1, height:36, background: t.border, flexShrink:0 }} />

        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {Object.entries(EPOCHS).map(([key, ep]) => {
            const active = currentEpochKey === key;
            const ec = lc[ep.colorKey]?.color || "#9a8a7a";
            return (
              <button key={key} onClick={() => handleEpochChange(key)} style={{
                fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
                padding:"7px 14px", borderRadius:5, cursor:"pointer",
                border: active ? `1.5px solid ${ec}` : `1px solid ${t.border}`,
                background: active ? `${ec}18` : "transparent",
                color: active ? ec : t.textMuted,
                transition:"all 0.3s",
              }}
                onMouseEnter={e => { if (!active) { e.target.style.borderColor = `${ec}66`; e.target.style.color = ec; }}}
                onMouseLeave={e => { if (!active) { e.target.style.borderColor = t.border; e.target.style.color = t.textMuted; }}}
              >
                {ep.label}
                <span style={{ display:"block", fontSize:9, fontWeight:600, opacity:0.5, marginTop:2 }}>{ep.sub}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
          <button onClick={() => setIsAutoPlaying(p => !p)} style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
            padding:"7px 16px", borderRadius:5, cursor:"pointer",
            border: isAutoPlaying ? `1.5px solid ${t.nowColor}` : `1px solid ${t.border}`,
            background: isAutoPlaying ? `${t.nowColor}18` : "transparent",
            color: isAutoPlaying ? t.nowColor : t.textMuted,
            transition:"all 0.3s",
          }}>
            {isAutoPlaying ? "■ STOP" : "▶ TOUR"}
          </button>

          {/* Theme toggle */}
          <button onClick={() => setTheme(p => p === "dark" ? "light" : "dark")} style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700,
            padding:"7px 14px", borderRadius:5, cursor:"pointer",
            border:`1px solid ${t.border}`, background:"transparent", color: t.textMuted,
            transition:"all 0.3s", letterSpacing:1,
          }}>
            {theme === "dark" ? "☀ LIGHT" : "☾ DARK"}
          </button>

          <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textMuted, letterSpacing:1.5, textAlign:"right" }}>
            <div><span style={{ color: epochColor, fontWeight:700 }}>{visibleEvents.length}</span> EVENTS</div>
            <div style={{ opacity:0.6, fontSize:10 }}>{zoomLabel}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background: t.nowColor, boxShadow:`0 0 8px ${t.nowColor}` }} />
            <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:600, color: t.nowColor, opacity:0.5, letterSpacing:2 }}>LIVE</span>
          </div>
          <button onClick={() => setSidebarOpen(p => !p)} style={{
            fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5,
            padding:"7px 14px", background:"transparent",
            border:`1px solid ${t.border}`, color: t.textMuted,
            borderRadius:5, cursor:"pointer",
          }}>
            {sidebarOpen ? "◁" : "▷"} LAYERS
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden", position:"relative", zIndex:10 }}>

        {sidebarOpen && (
          <div style={{
            width:210, flexShrink:0, display:"flex", flexDirection:"column",
            background: t.surface, borderRight:`1px solid ${t.border}`,
            overflowY:"auto", backdropFilter:"blur(10px)",
            animation:"slideInRight 0.2s ease-out",
          }}>
            <div style={{ padding:"18px 16px 12px", fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:700, color: t.textDim, letterSpacing:3 }}>
              DIMENSIONS
            </div>
            {LAYERS.map((layer) => {
              const lCol = lc[layer.id] || { color:"#9a8a7a", accent:"#6a5a4a" };
              return (
                <button key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                  display:"flex", alignItems:"center", gap:12, padding:"11px 16px",
                  background: activeLayers.has(layer.id) ? `${lCol.accent}0c` : "transparent",
                  border:"none", borderLeft: `3px solid ${activeLayers.has(layer.id) ? lCol.accent : "transparent"}`,
                  cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                }}>
                  <div style={{
                    width:11, height:11, borderRadius:"50%",
                    background: activeLayers.has(layer.id) ? lCol.color : t.textDim,
                    boxShadow: activeLayers.has(layer.id) ? `0 0 8px ${lCol.accent}66` : "none",
                    flexShrink:0, transition:"all 0.2s",
                  }} />
                  <span style={{
                    fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.2,
                    color: activeLayers.has(layer.id) ? lCol.color : t.textDim,
                    transition:"all 0.2s",
                  }}>{layer.label}</span>
                </button>
              );
            })}
            <div style={{ padding:"20px 16px 16px", marginTop:"auto", borderTop:`1px solid ${t.border}` }}>
              <div style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textDim, lineHeight:2.4, letterSpacing:0.5 }}>
                SCROLL → ZOOM<br/>DRAG → PAN<br/>EDGE → DRIFT<br/>HOVER → LINKS<br/>▶ TOUR → FLY
              </div>
            </div>
          </div>
        )}

        {/* TIMELINE */}
        <div
          ref={timelineRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveGlobal}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          style={{
            flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
            cursor: isDragging ? "grabbing" : "grab",
            userSelect:"none", WebkitUserSelect:"none", position:"relative",
          }}
        >
          {/* RULER */}
          <div style={{
            position:"relative", height:56, flexShrink:0,
            background: theme === "dark"
              ? "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(13,12,10,0.3) 100%)"
              : "linear-gradient(180deg, rgba(245,240,232,0.8) 0%, rgba(235,228,216,0.4) 100%)",
            borderBottom:`1px solid ${t.border}`, overflow:"hidden",
          }}>
            {rulerTicks.map((year, i) => {
              const pct = yearToPct(year);
              if (pct < -0.05 || pct > 1.05) return null;
              return (
                <div key={i} style={{
                  position:"absolute", left:`${pct*100}%`, top:0, height:"100%",
                  display:"flex", flexDirection:"column", alignItems:"center",
                }}>
                  <div style={{ width:1, height: year === 0 ? 32 : 20, background: year === 0 ? `${epochColor}55` : t.textDim, marginTop:"auto" }} />
                  <span style={{
                    fontFamily:"'Share Tech Mono', monospace", fontSize:12, fontWeight:700, letterSpacing:0.5,
                    color: year === 0 ? epochColor : t.rulerText,
                    whiteSpace:"nowrap", transform:"translateX(-50%)", marginBottom:6,
                  }}>{formatYear(year)}</span>
                </div>
              );
            })}
            <div style={{ position:"absolute", top:6, right:14, fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, color: t.textDim, letterSpacing:1 }}>
              {formatYear(viewStart)} → {formatYear(viewEnd)}
            </div>
          </div>

          {/* LANES */}
          <div ref={lanesRef} style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden" }}>
            <ParticleCanvas events={visibleEvents} yearToPct={yearToPct} layerColors={lc} containerRect={containerRect} />
            <ConnectionLines hoveredEvent={hoveredEvent} visibleEvents={visibleEvents} yearToPct={yearToPct} activeLayerIds={activeLayerIds} layerColors={lc} containerRect={containerRect} />

            {nowPct >= -0.01 && nowPct <= 1.01 && (
              <div style={{
                position:"absolute", left:`${nowPct*100}%`, top:0, bottom:0, width:2,
                background:`linear-gradient(180deg, transparent 0%, ${t.nowColor}33 10%, ${t.nowColor}66 50%, ${t.nowColor}33 90%, transparent 100%)`,
                pointerEvents:"none", zIndex:50,
              }}>
                <div style={{
                  position:"absolute", top:6, left:-18,
                  fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, color: t.nowColor,
                  letterSpacing:1.5, background: theme === "dark" ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.8)",
                  border:`1px solid ${t.nowColor}44`, padding:"4px 10px", borderRadius:4, whiteSpace:"nowrap",
                }}>NOW</div>
              </div>
            )}

            <div style={{ position:"absolute", left:0, top:0, bottom:0, width:60, background:`linear-gradient(90deg, ${t.fadeEdge}, transparent)`, pointerEvents:"none", zIndex:30 }} />
            <div style={{ position:"absolute", right:0, top:0, bottom:0, width:60, background:`linear-gradient(90deg, transparent, ${t.fadeEdge})`, pointerEvents:"none", zIndex:30 }} />

            <div style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
              {activeLayersList.map(layer => {
                const events = eventsByLayer[layer.id] || [];
                const lCol = lc[layer.id] || { color:"#9a8a7a", accent:"#6a5a4a" };
                return (
                  <div key={layer.id} style={{
                    position:"relative", height:82, flexShrink:0,
                    borderBottom:`1px solid ${t.border}`,
                    background:`linear-gradient(90deg, ${lCol.accent}06 0%, transparent 5%, transparent 95%, ${lCol.accent}06 100%)`,
                  }}>
                    <div style={{
                      position:"absolute", top:"50%", left:0, right:0, height:1,
                      background:`linear-gradient(90deg, transparent 0%, ${lCol.accent}18 10%, ${lCol.accent}10 90%, transparent 100%)`,
                      transform:"translateY(-50%)", pointerEvents:"none",
                    }} />
                    <div style={{
                      position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
                      display:"flex", alignItems:"center", gap:8, zIndex:20, pointerEvents:"none",
                      background:`linear-gradient(90deg, ${t.fadeEdge} 0%, ${t.fadeEdge.replace("0.9","0.3")} 80%, transparent 100%)`,
                      paddingRight:28, paddingTop:2, paddingBottom:2,
                    }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background: lCol.color, boxShadow:`0 0 6px ${lCol.accent}55`, flexShrink:0 }} />
                      <span style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:700, letterSpacing:1.5, color: lCol.color, opacity:0.65, whiteSpace:"nowrap" }}>{layer.label}</span>
                    </div>
                    {events.map(ev => {
                      const pct = yearToPct(ev.year);
                      if (pct < -0.05 || pct > 1.05) return null;
                      return <EventNode key={ev.id} ev={ev} xPct={pct} onClick={setSelectedEvent} selected={selectedEvent?.id === ev.id} onHover={setHoveredEvent} breathPhase={breathPhase} />;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* STATUS BAR */}
      <div style={{
        position:"relative", zIndex:50, flexShrink:0, height:34,
        display:"flex", alignItems:"center", padding:"0 24px", gap:28,
        background: t.surface, borderTop:`1px solid ${t.border}`,
      }}>
        {[
          ["ZOOM", zoomLabel],
          ["RANGE", `${formatYear(viewStart)} → ${formatYear(viewEnd)}`],
          ["EVENTS", `${visibleEvents.length} / ${EVENTS.length}`],
          ["LAYERS", `${activeLayers.size} / ${LAYERS.length}`],
        ].map(([k, v]) => (
          <span key={k} style={{ fontFamily:"'Share Tech Mono', monospace", fontSize:11, fontWeight:600, letterSpacing:1, color: t.textDim }}>
            <span style={{ color: epochColor, marginRight:6, fontWeight:700 }}>{k}</span>{v}
          </span>
        ))}
        <span style={{ marginLeft:"auto", fontFamily:"'Share Tech Mono', monospace", fontSize:10, fontWeight:600, color: t.textDim, letterSpacing:1.5 }}>
          Simurgh's View — Because human HERstory deserves to be seen whole.
        </span>
      </div>

      {selectedEvent && <EventModal ev={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
    </ThemeContext.Provider>
  );
}
