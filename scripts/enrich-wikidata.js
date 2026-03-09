#!/usr/bin/env node
// Wikidata Enrichment Pipeline for Simurgh's View
// Reads event JSON files, queries Wikidata SPARQL for images, descriptions,
// coordinates, and related entities, then writes enriched data back.
//
// Usage: node scripts/enrich-wikidata.js [--dry-run] [--layer cosmos] [--force]

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const EVENTS_DIR = join(import.meta.dirname, "..", "src", "data", "events");
const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "SimurghView/1.0 (https://ferdowsi.app; enrichment pipeline)";
const RATE_LIMIT_MS = 1200; // Wikidata asks for ≤1 req/sec

// ── CLI args ──
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const layerIdx = args.indexOf("--layer");
const LAYER_FILTER = layerIdx >= 0 ? args[layerIdx + 1] : null;

// ── Helpers ──
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sparqlQuery(query, timeoutMs = 15000) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(query)}&format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "application/sparql-results+json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SPARQL error ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function extractQid(event) {
  for (const src of event.sources || []) {
    if (src.qid) return src.qid;
    if (src.type === "wikidata" && src.url) {
      const m = src.url.match(/Q\d+/);
      if (m) return m[0];
    }
  }
  return null;
}

// ── SPARQL Queries ──

// Batch query for multiple QIDs at once (up to ~40 per batch)
function buildBatchQuery(qids) {
  const values = qids.map(q => `wd:${q}`).join(" ");
  return `
SELECT ?item ?itemLabel ?itemDescription ?image ?coords ?inception ?partOf ?partOfLabel ?country ?countryLabel WHERE {
  VALUES ?item { ${values} }
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P625 ?coords. }
  OPTIONAL { ?item wdt:P571 ?inception. }
  OPTIONAL { ?item wdt:P361 ?partOf. }
  OPTIONAL { ?item wdt:P17 ?country. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;
}

// Find related events for a given QID — lightweight query
function buildRelatedQuery(qid) {
  return `
SELECT DISTINCT ?related ?relatedLabel ?relatedDescription WHERE {
  wd:${qid} wdt:P527|wdt:P361|wdt:P155|wdt:P156|wdt:P1542|wdt:P828|wdt:P1478|wdt:P1479 ?related.
  ?related rdfs:label ?relatedLabel. FILTER(LANG(?relatedLabel) = "en")
  OPTIONAL { ?related schema:description ?relatedDescription. FILTER(LANG(?relatedDescription) = "en") }
}
LIMIT 8`;
}

// ── Main Pipeline ──

async function loadAllEvents() {
  const files = readdirSync(EVENTS_DIR).filter(f => f.endsWith(".json"));
  const allEvents = [];
  for (const file of files) {
    const layer = basename(file, ".json");
    if (LAYER_FILTER && layer !== LAYER_FILTER) continue;
    const events = JSON.parse(readFileSync(join(EVENTS_DIR, file), "utf-8"));
    allEvents.push({ file, layer, events });
  }
  return allEvents;
}

async function enrichBatch(events) {
  // Collect QIDs from events
  const qidMap = new Map(); // qid -> event ref
  for (const ev of events) {
    const qid = extractQid(ev);
    if (qid) qidMap.set(qid, ev);
  }

  if (qidMap.size === 0) return { enriched: 0, discovered: [] };

  const qids = [...qidMap.keys()];
  console.log(`  Querying Wikidata for ${qids.length} entities...`);

  // Batch query for metadata
  const query = buildBatchQuery(qids);
  const result = await sparqlQuery(query);
  await sleep(RATE_LIMIT_MS);

  let enriched = 0;
  for (const binding of result.results.bindings) {
    const qid = binding.item.value.split("/").pop();
    const ev = qidMap.get(qid);
    if (!ev) continue;

    // Initialize wikidata enrichment field
    if (!ev.wikidata) ev.wikidata = {};

    // Image
    if (binding.image?.value && !ev.wikidata.image) {
      ev.wikidata.image = binding.image.value;
      enriched++;
    }

    // Coordinates
    if (binding.coords?.value && !ev.wikidata.coords) {
      const m = binding.coords.value.match(/Point\(([^ ]+) ([^ ]+)\)/);
      if (m) {
        ev.wikidata.coords = { lon: parseFloat(m[1]), lat: parseFloat(m[2]) };
      }
    }

    // Description from Wikidata (if we don't have a body already or if it's short)
    if (binding.itemDescription?.value && !ev.wikidata.wdDescription) {
      ev.wikidata.wdDescription = binding.itemDescription.value;
    }

    // Country
    if (binding.countryLabel?.value && !ev.wikidata.country) {
      ev.wikidata.country = binding.countryLabel.value;
    }

    // Part-of
    if (binding.partOfLabel?.value && !ev.wikidata.partOf) {
      ev.wikidata.partOf = binding.partOfLabel.value;
    }
  }

  // Query for related events (one per QID, with rate limiting)
  const discovered = [];
  for (const qid of qids.slice(0, 5)) { // Limit related queries to avoid timeout
    const ev = qidMap.get(qid);
    try {
      const relQuery = buildRelatedQuery(qid);
      const relResult = await sparqlQuery(relQuery);
      await sleep(RATE_LIMIT_MS);

      const suggestions = [];
      for (const b of relResult.results.bindings) {
        const relQid = b.related.value.split("/").pop();
        if (relQid === qid) continue;
        const label = b.relatedLabel?.value;
        const desc = b.relatedDescription?.value;
        const date = b.date?.value;
        if (label && !label.startsWith("Q")) {
          suggestions.push({ qid: relQid, label, description: desc || "", date: date || null });
        }
      }
      if (suggestions.length > 0) {
        discovered.push({ sourceEvent: ev.id, sourceQid: qid, suggestions });
      }
    } catch (err) {
      console.log(`    Warning: related query for ${qid} failed: ${err.message}`);
    }
  }

  return { enriched, discovered };
}

async function run() {
  console.log("Simurgh's View — Wikidata Enrichment Pipeline");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  if (LAYER_FILTER) console.log(`Layer filter: ${LAYER_FILTER}`);
  console.log("");

  const layerFiles = await loadAllEvents();
  let totalEnriched = 0;
  const allDiscovered = [];

  for (const { file, layer, events } of layerFiles) {
    console.log(`[${layer}] Processing ${events.length} events from ${file}...`);

    const qidCount = events.filter(ev => extractQid(ev)).length;
    if (qidCount === 0) {
      console.log(`  No Wikidata QIDs found, skipping.`);
      continue;
    }
    console.log(`  Found ${qidCount} events with Wikidata QIDs.`);

    const { enriched, discovered } = await enrichBatch(events);
    totalEnriched += enriched;
    allDiscovered.push(...discovered);

    // Remove empty wikidata objects
    for (const ev of events) {
      if (ev.wikidata && Object.keys(ev.wikidata).length === 0) {
        delete ev.wikidata;
      }
    }

    if (!DRY_RUN && enriched > 0) {
      const outPath = join(EVENTS_DIR, file);
      writeFileSync(outPath, JSON.stringify(events, null, 2) + "\n");
      console.log(`  Wrote ${outPath}`);
    } else if (enriched > 0) {
      console.log(`  [DRY RUN] Would enrich ${enriched} fields in ${file}`);
    }

    console.log(`  Enriched ${enriched} fields.`);
    console.log("");
  }

  // Write discovered events report
  if (allDiscovered.length > 0) {
    const reportPath = join(EVENTS_DIR, "..", "wikidata-discoveries.json");
    const report = {
      generatedAt: new Date().toISOString(),
      description: "Related events discovered via Wikidata that could be added to the timeline",
      discoveries: allDiscovered,
    };
    if (!DRY_RUN) {
      writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
      console.log(`Wrote discovery report: ${reportPath}`);
    } else {
      console.log(`[DRY RUN] Would write ${allDiscovered.length} discovery groups`);
    }
  }

  console.log("");
  console.log("=== Summary ===");
  console.log(`Total fields enriched: ${totalEnriched}`);
  console.log(`Discovery groups: ${allDiscovered.length}`);
  for (const d of allDiscovered) {
    console.log(`  ${d.sourceEvent}: ${d.suggestions.length} related entities found`);
  }
}

run().catch(err => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
