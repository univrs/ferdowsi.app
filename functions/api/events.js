// Cloudflare Pages Function: /api/events
// Serves enriched events filtered by viewport, layers, and zoom level
// Query params:
//   start   — viewport start year (default: -13800000000)
//   end     — viewport end year (default: 2026)
//   layers  — comma-separated layer IDs (default: all)
//   minImp  — minimum importance threshold 1-5 (default: 1)
//   limit   — max events returned (default: 200)
//   format  — "full" or "summary" (default: summary)

import cosmosEvents from "../../src/data/events/cosmos.json";
import earthEvents from "../../src/data/events/earth.json";
import lifeEvents from "../../src/data/events/life.json";
import societyEvents from "../../src/data/events/society.json";
import conflictEvents from "../../src/data/events/conflict.json";
import scienceEvents from "../../src/data/events/science.json";
import cultureEvents from "../../src/data/events/culture.json";
import philosophyEvents from "../../src/data/events/philosophy.json";
import herstoryEvents from "../../src/data/events/herstory.json";
import indigenousEvents from "../../src/data/events/indigenous.json";

const ALL_EVENTS = [
  ...cosmosEvents,
  ...earthEvents,
  ...lifeEvents,
  ...societyEvents,
  ...conflictEvents,
  ...scienceEvents,
  ...cultureEvents,
  ...philosophyEvents,
  ...herstoryEvents,
  ...indigenousEvents,
].sort((a, b) => a.year - b.year);

const ALL_LAYERS = [
  "herstory", "indigenous", "cosmos", "earth", "life",
  "society", "conflict", "science", "culture", "philosophy",
];

function summarize(ev) {
  return {
    id: ev.id,
    year: ev.year,
    month: ev.month || undefined,
    day: ev.day || undefined,
    precision: ev.precision,
    layer: ev.layer,
    importance: ev.importance,
    confidence: ev.confidence,
    title: ev.title,
    summary: ev.summary,
    tags: ev.tags,
  };
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const params = url.searchParams;

  const start = Number(params.get("start")) || -13_800_000_000;
  const end = Number(params.get("end")) || 2026;
  const layerParam = params.get("layers");
  const layers = layerParam
    ? new Set(layerParam.split(",").filter(l => ALL_LAYERS.includes(l)))
    : new Set(ALL_LAYERS);
  const minImp = Math.max(1, Math.min(5, Number(params.get("minImp")) || 1));
  const limit = Math.max(1, Math.min(500, Number(params.get("limit")) || 200));
  const format = params.get("format") === "full" ? "full" : "summary";

  let results = ALL_EVENTS.filter(ev =>
    ev.year >= start &&
    ev.year <= end &&
    layers.has(ev.layer) &&
    ev.importance >= minImp
  );

  // If too many results, prioritize by importance
  if (results.length > limit) {
    results.sort((a, b) => b.importance - a.importance || a.year - b.year);
    results = results.slice(0, limit);
    results.sort((a, b) => a.year - b.year);
  }

  const output = format === "full"
    ? results
    : results.map(summarize);

  return new Response(JSON.stringify({
    meta: {
      total: ALL_EVENTS.length,
      filtered: results.length,
      viewport: { start, end },
      layers: [...layers],
      minImp,
      format,
    },
    events: output,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
