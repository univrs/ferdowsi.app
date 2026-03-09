// Cloudflare Pages Function: /api/event/:id
// Returns full enriched event by ID (e.g., /api/event/cosmos-001)

import cosmosEvents from "../../../src/data/events/cosmos.json";
import earthEvents from "../../../src/data/events/earth.json";
import lifeEvents from "../../../src/data/events/life.json";
import societyEvents from "../../../src/data/events/society.json";
import conflictEvents from "../../../src/data/events/conflict.json";
import scienceEvents from "../../../src/data/events/science.json";
import cultureEvents from "../../../src/data/events/culture.json";
import philosophyEvents from "../../../src/data/events/philosophy.json";
import herstoryEvents from "../../../src/data/events/herstory.json";
import indigenousEvents from "../../../src/data/events/indigenous.json";

const EVENT_MAP = new Map();
[
  ...cosmosEvents, ...earthEvents, ...lifeEvents,
  ...societyEvents, ...conflictEvents, ...scienceEvents,
  ...cultureEvents, ...philosophyEvents, ...herstoryEvents,
  ...indigenousEvents,
].forEach(ev => EVENT_MAP.set(ev.id, ev));

export async function onRequestGet(context) {
  const { id } = context.params;
  const ev = EVENT_MAP.get(id);

  if (!ev) {
    return new Response(JSON.stringify({ error: "Event not found", id }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve related events to summaries
  const related = (ev.related || []).map(rid => {
    const r = EVENT_MAP.get(rid);
    return r ? { id: r.id, title: r.title, year: r.year, layer: r.layer } : null;
  }).filter(Boolean);

  return new Response(JSON.stringify({
    ...ev,
    relatedEvents: related,
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
