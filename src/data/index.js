// src/data/index.js
// Aggregates all event JSON files and exports unified data
// Future: replace static imports with API calls to Cloudflare Worker

import cosmosEvents from "./events/cosmos.json";
import earthEvents from "./events/earth.json";
import lifeEvents from "./events/life.json";
import societyEvents from "./events/society.json";
import conflictEvents from "./events/conflict.json";
import scienceEvents from "./events/science.json";
import cultureEvents from "./events/culture.json";
import philosophyEvents from "./events/philosophy.json";
import herstoryEvents from "./events/herstory.json";
import indigenousEvents from "./events/indigenous.json";

import { LAYERS, EPOCHS, PRECISION, CONFIDENCE } from "./schema.js";

// Merge all events into a single array, sorted by year
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

// Convert enriched JSON format to the flat format GoddessView expects
// (bridge layer — will be removed when GoddessView is updated to use rich format)
export const EVENTS_FLAT = ALL_EVENTS.map((ev, idx) => ({
  id: idx + 1,
  _richId: ev.id,
  year: ev.year,
  layer: ev.layer,
  imp: ev.importance,
  title: ev.title,
  desc: ev.summary,
  body: ev.body,
  tags: ev.tags,
  sources: ev.sources,
  related: ev.related,
  precision: ev.precision,
  confidence: ev.confidence,
  month: ev.month,
  day: ev.day,
  wikidata: ev.wikidata || null,
}));

// Full enriched events for components that support the rich format
export const EVENTS_RICH = ALL_EVENTS;

export { LAYERS, EPOCHS, PRECISION, CONFIDENCE };
