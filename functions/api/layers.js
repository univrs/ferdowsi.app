// Cloudflare Pages Function: /api/layers
// Returns layer metadata with event counts

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

const LAYER_EVENTS = {
  cosmos: cosmosEvents,
  earth: earthEvents,
  life: lifeEvents,
  society: societyEvents,
  conflict: conflictEvents,
  science: scienceEvents,
  culture: cultureEvents,
  philosophy: philosophyEvents,
  herstory: herstoryEvents,
  indigenous: indigenousEvents,
};

const LAYER_META = [
  { id: "herstory",   label: "HERSTORY & WOMEN" },
  { id: "indigenous", label: "INDIGENOUS WISDOM" },
  { id: "cosmos",     label: "COSMOS & PHYSICS" },
  { id: "earth",      label: "EARTH & CLIMATE" },
  { id: "life",       label: "LIFE & BIOLOGY" },
  { id: "society",    label: "HUMAN & SOCIETY" },
  { id: "conflict",   label: "WAR & POLITICS" },
  { id: "science",    label: "SCIENCE & TECH" },
  { id: "culture",    label: "ARTS & CULTURE" },
  { id: "philosophy", label: "PHILOSOPHY & IDEAS" },
];

export async function onRequestGet() {
  const layers = LAYER_META.map(l => {
    const events = LAYER_EVENTS[l.id] || [];
    const years = events.map(e => e.year);
    return {
      ...l,
      eventCount: events.length,
      yearRange: events.length > 0
        ? { earliest: Math.min(...years), latest: Math.max(...years) }
        : null,
    };
  });

  const totalEvents = layers.reduce((sum, l) => sum + l.eventCount, 0);

  return new Response(JSON.stringify({ totalEvents, layers }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
