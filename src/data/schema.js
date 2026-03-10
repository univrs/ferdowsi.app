// Simurgh's View — Event Schema & Constants
// This is the single source of truth for data structures

export const PRECISION = {
  EXACT: "exact",       // known to the day/hour
  DAY: "day",           // known to the day
  MONTH: "month",       // known to the month
  YEAR: "year",         // known to the year
  DECADE: "decade",     // approximate decade
  CENTURY: "century",   // approximate century
  MILLENNIUM: "millennium",
  EPOCH: "epoch",       // geological/cosmological
};

export const CONFIDENCE = {
  ESTABLISHED: "established",   // scholarly consensus
  DEBATED: "debated",           // multiple credible interpretations
  LEGENDARY: "legendary",       // traditional/mythological dating
  APPROXIMATE: "approximate",   // order-of-magnitude estimate
};

export const SOURCE_TYPE = {
  WIKIPEDIA: "wikipedia",
  WIKIDATA: "wikidata",
  ACADEMIC: "academic",
  PRIMARY: "primary",
  MUSEUM: "museum",
  NEWS: "news",
  BOOK: "book",
};

export const EPOCHS = {
  COSMIC:       { label:"COSMIC",        sub:"13.8 Billion Years",  start:-13_800_000_000, end:2026, colorKey:"cosmos" },
  GEOLOGICAL:   { label:"GEOLOGICAL",    sub:"500 Million Years",   start:-500_000_000,    end:2026, colorKey:"earth" },
  DEEP_HUMAN:   { label:"ANCIENT",        sub:"70,000 Years",        start:-70_000,         end:2026, colorKey:"society" },
  HISTORICAL:   { label:"HISTORICAL",    sub:"5,000 Years",         start:-5_000,          end:2026, colorKey:"science" },
  MODERN:       { label:"MODERN",        sub:"600 Years",           start:1400,            end:2026, colorKey:"culture" },
  CONTEMPORARY: { label:"CONTEMPORARY",  sub:"200 Years",           start:1800,            end:2026, colorKey:"life" },
};

export const LAYERS = [
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
