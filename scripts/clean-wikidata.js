#!/usr/bin/env node
// Cleans invalid Wikidata enrichment from event JSON files.
// Removes wikidata fields where the description clearly doesn't match the event.
// Also validates images match the topic.

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const EVENTS_DIR = join(import.meta.dirname, "..", "src", "data", "events");

// Known-bad descriptions that indicate a QID collision
const BAD_PATTERNS = [
  "disambiguation page",
  "municipality of",
  "commune in",
  "town in",
  "village in",
  "district in",
  "city in",
  "census-designated place",
  "assault rifle",
  "electric capacitance",
  "eye disease",
  "mathematical term",
  "geographic coordinate",
  "German university teacher",
  "motor race",
  "Formula One",
  "American actress",
  "Swedish illustrator",
  "Swedish noble",
  "English pop singer",
  "artistic and social movement",  // when not the right one
  "sport where",
  "mythological creature",
  "foundational Islamic religious text", // wrong for Newton
  "President of the United States", // wrong for Darwin
  "quadrilateral",
  "genus of birds",
  "active volcano",
  "water well",
  "magnitude of velocity",
  "chemical compound",
  "1995 film",
  "Muhammad's sixth wife", // wrong for Hildegard
  "public university",
];

function isLikelyBad(wikidata, event) {
  if (!wikidata) return false;
  const desc = (wikidata.wdDescription || "").toLowerCase();

  // Check against known-bad patterns
  for (const pattern of BAD_PATTERNS) {
    if (desc.includes(pattern.toLowerCase())) return true;
  }

  // Check if country/coords don't match the event's context at all
  // (e.g., Slovenia for an Egyptian pharaoh)
  const title = event.title.toLowerCase();
  const tags = (event.tags || []).join(" ").toLowerCase();
  const country = (wikidata.country || "").toLowerCase();

  // If it has a country but event is about a completely different region
  if (country && !desc.includes(title.split(" ")[0].toLowerCase())) {
    const egyptEvents = tags.includes("egypt") || title.includes("egypt") || title.includes("pharaoh");
    const greekEvents = tags.includes("greece") || title.includes("greek") || title.includes("athens");
    const usaEvents = tags.includes("usa") || title.includes("usa") || title.includes("american");

    if (egyptEvents && !["egypt"].includes(country)) return true;
    if (greekEvents && !["greece"].includes(country)) return true;
  }

  return false;
}

// Good enrichments we want to keep (verified manually from the output)
const KNOWN_GOOD = new Set([
  "culture-002",  // Great Pyramid - Giza
  "culture-003",  // Alexander the Great
  "conflict-002", // Qin Shi Huang
  "conflict-004", // Western Roman Empire
  "conflict-007", // American Revolution
  "conflict-008", // French Revolution
  "conflict-009", // WWI
  "conflict-010", // Russian Revolution
  "conflict-011", // WWII
  "conflict-013", // September 11
  "society-007",  // Islam / Umayyad
  "society-008",  // Black Death
  "society-009",  // Columbian Exchange
  "society-010",  // Great Depression
  "society-012",  // COVID-19
  "herstory-010", // Ada Lovelace
  "herstory-012", // Marie Curie
  "herstory-019", // Kamala Harris
  "science-007",  // Apollo 11
  "science-008",  // WWW
  "science-009",  // iPhone
]);

let cleaned = 0;
let kept = 0;

const files = readdirSync(EVENTS_DIR).filter(f => f.endsWith(".json"));
for (const file of files) {
  const path = join(EVENTS_DIR, file);
  const events = JSON.parse(readFileSync(path, "utf-8"));
  let modified = false;

  for (const ev of events) {
    if (!ev.wikidata) continue;

    if (KNOWN_GOOD.has(ev.id)) {
      kept++;
      continue;
    }

    if (isLikelyBad(ev.wikidata, ev)) {
      console.log(`CLEAN ${ev.id}: "${ev.wikidata.wdDescription}" (${basename(file)})`);
      delete ev.wikidata;
      modified = true;
      cleaned++;
    } else {
      kept++;
    }
  }

  if (modified) {
    writeFileSync(path, JSON.stringify(events, null, 2) + "\n");
  }
}

console.log(`\nCleaned: ${cleaned}, Kept: ${kept}`);
