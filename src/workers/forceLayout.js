// forceLayout.js — Web Worker for force-directed 3D layout
// Runs physics simulation off the main thread so GPU rendering stays at 60fps
//
// Protocol:
//   Main → Worker: { type: "init", events, links }
//   Main → Worker: { type: "reheat" }  — restart simulation after filter change
//   Worker → Main: { type: "tick", positions: Float32Array, alpha }
//   Worker → Main: { type: "settled" }  — simulation cooled down

import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceX,
  forceY,
  forceZ,
} from "d3-force-3d";

let simulation = null;
let nodes = [];
let links = [];
let positionBuffer = null;

// Logarithmic time → X position (matches the timeline's deep time compression)
function yearToX(year) {
  const now = 2026;
  const diff = now - year;
  if (diff <= 0) return 100;
  // Spread across -100..100 range for good 3D spacing
  return 100 - Math.log10(diff + 1) * 10;
}

// Layer → Y band (gives vertical separation by category)
const LAYER_ORDER = [
  "herstory", "indigenous", "cosmos", "earth", "life",
  "society", "conflict", "science", "culture", "philosophy",
];
function layerToY(layer) {
  const idx = LAYER_ORDER.indexOf(layer);
  return (idx >= 0 ? idx : 5) * 8 - 40; // spread -40..40
}

self.onmessage = function (e) {
  const { type, events, eventLinks } = e.data;

  if (type === "init") {
    initSimulation(events, eventLinks);
  } else if (type === "reheat") {
    if (simulation) {
      simulation.alpha(0.8).restart();
    }
  }
};

function initSimulation(events, eventLinks) {
  // Build nodes with initial positions based on time + layer
  nodes = events.map((ev, i) => ({
    index: i,
    id: ev._richId || ev.id,
    x: yearToX(ev.year) + (Math.random() - 0.5) * 5,
    y: layerToY(ev.layer) + (Math.random() - 0.5) * 5,
    z: (ev.imp - 3) * 3 + (Math.random() - 0.5) * 5,
    // Store for forces
    _targetX: yearToX(ev.year),
    _targetY: layerToY(ev.layer),
    _imp: ev.imp || 3,
    _layer: ev.layer,
  }));

  // Build links from related event IDs
  const idToIndex = new Map();
  events.forEach((ev, i) => {
    if (ev._richId) idToIndex.set(ev._richId, i);
    idToIndex.set(String(ev.id), i);
  });

  links = [];
  if (eventLinks) {
    eventLinks.forEach(({ source, target }) => {
      const si = idToIndex.get(source);
      const ti = idToIndex.get(target);
      if (si !== undefined && ti !== undefined) {
        links.push({ source: si, target: ti });
      }
    });
  }

  positionBuffer = new Float32Array(nodes.length * 3);

  // Create simulation
  simulation = forceSimulation(nodes, 3)
    // Repulsion — nodes push each other apart
    .force("charge", forceManyBody()
      .strength((d) => -2 - d._imp * 1.5) // important events repel more
      .distanceMax(80)
    )
    // Links — related events attract
    .force("link", forceLink(links)
      .id((d) => d.index)
      .distance(15) // ideal distance between linked nodes
      .strength(0.4)
    )
    // Time axis constraint — gently pull toward chronological X position
    .force("timeX", forceX()
      .x((d) => d._targetX)
      .strength(0.06) // loose — allows clustering to override
    )
    // Layer constraint — gently pull toward layer Y band
    .force("layerY", forceY()
      .y((d) => d._targetY)
      .strength(0.03) // very loose — related cross-layer events can cluster
    )
    // Z centering — keep the graph roughly centered in depth
    .force("centerZ", forceZ()
      .z(0)
      .strength(0.01)
    )
    // Overall centering
    .force("center", forceCenter(0, 0, 0).strength(0.005))
    // Simulation parameters
    .alphaDecay(0.008) // slow cooldown — let clusters form properly
    .velocityDecay(0.3) // moderate damping
    .on("tick", onTick)
    .on("end", onEnd);
}

function onTick() {
  // Pack positions into typed array for efficient transfer
  for (let i = 0; i < nodes.length; i++) {
    positionBuffer[i * 3] = nodes[i].x;
    positionBuffer[i * 3 + 1] = nodes[i].y;
    positionBuffer[i * 3 + 2] = nodes[i].z;
  }

  self.postMessage({
    type: "tick",
    positions: positionBuffer.buffer,
    alpha: simulation.alpha(),
  }, [positionBuffer.buffer]);

  // Reallocate since we transferred ownership
  positionBuffer = new Float32Array(nodes.length * 3);
}

function onEnd() {
  self.postMessage({ type: "settled" });
}
