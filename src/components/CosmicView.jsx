// CosmicView.jsx — Phase 2: Real events, force-directed layout via Web Worker
// GPU instanced rendering + physics simulation running off main thread

import { useRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { EVENTS_FLAT, LAYERS } from "../data/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const SPHERE_SEGMENTS = 8;
const BASE_SIZE = 0.25;
const FLY_SPEED = 0.06;
const CONNECTION_OPACITY = 0.12;

const LAYER_COLORS_DARK = {
  herstory:   new THREE.Color("#c9977a"),
  indigenous: new THREE.Color("#c4a85a"),
  cosmos:     new THREE.Color("#9a90b8"),
  earth:      new THREE.Color("#7aaa7e"),
  life:       new THREE.Color("#6a9a7a"),
  society:    new THREE.Color("#c4aa6a"),
  conflict:   new THREE.Color("#b87a6a"),
  science:    new THREE.Color("#6a8ab0"),
  culture:    new THREE.Color("#b88a9a"),
  philosophy: new THREE.Color("#9a8aaa"),
};

const LAYER_COLORS_LIGHT = {
  herstory:   new THREE.Color("#8a5238"),
  indigenous: new THREE.Color("#7a6520"),
  cosmos:     new THREE.Color("#5a4a7a"),
  earth:      new THREE.Color("#3a6a3e"),
  life:       new THREE.Color("#2a6a4a"),
  society:    new THREE.Color("#7a6a2a"),
  conflict:   new THREE.Color("#7a3a2a"),
  science:    new THREE.Color("#2a4a6a"),
  culture:    new THREE.Color("#6a3a4a"),
  philosophy: new THREE.Color("#5a4a6a"),
};

// CSS string versions for React modal
const CSS_COLORS_DARK = {
  herstory:   { color: "#c9977a", accent: "#9a6248" },
  indigenous: { color: "#c4a85a", accent: "#8a7530" },
  cosmos:     { color: "#9a90b8", accent: "#6a5a8a" },
  earth:      { color: "#7aaa7e", accent: "#4a7a4e" },
  life:       { color: "#6a9a7a", accent: "#3a7a5a" },
  society:    { color: "#c4aa6a", accent: "#8a7a3a" },
  conflict:   { color: "#b87a6a", accent: "#8a4a3a" },
  science:    { color: "#6a8ab0", accent: "#3a5a7a" },
  culture:    { color: "#b88a9a", accent: "#7a4a5a" },
  philosophy: { color: "#9a8aaa", accent: "#6a5a7a" },
};

const CSS_COLORS_LIGHT = {
  herstory:   { color: "#8a5238", accent: "#6a3a28" },
  indigenous: { color: "#7a6520", accent: "#5a4810" },
  cosmos:     { color: "#5a4a7a", accent: "#3a2a5a" },
  earth:      { color: "#3a6a3e", accent: "#2a4a2e" },
  life:       { color: "#2a6a4a", accent: "#1a4a3a" },
  society:    { color: "#7a6a2a", accent: "#5a4a1a" },
  conflict:   { color: "#7a3a2a", accent: "#5a2a1a" },
  science:    { color: "#2a4a6a", accent: "#1a3a5a" },
  culture:    { color: "#6a3a4a", accent: "#4a2a3a" },
  philosophy: { color: "#5a4a6a", accent: "#3a2a4a" },
};

const CONFIDENCE_BADGE = {
  established: { label: "Established", color: "#6a9a5a" },
  debated:     { label: "Debated",     color: "#c4aa4a" },
  legendary:   { label: "Legendary",   color: "#9a7aba" },
  approximate: { label: "Approximate", color: "#8a8a8a" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD LINK DATA from event relations
// ═══════════════════════════════════════════════════════════════════════════════
function buildLinks(events) {
  const links = [];
  const seen = new Set();
  events.forEach(ev => {
    if (!ev.related) return;
    ev.related.forEach(relId => {
      const key = [ev._richId, relId].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      links.push({ source: ev._richId, target: relId });
    });
  });
  return links;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COSMIC EVENT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function CosmicEventModal({ ev, events, isDark, onClose, onNavigate }) {
  const cssColors = isDark ? CSS_COLORS_DARK : CSS_COLORS_LIGHT;
  const lc = cssColors[ev.layer] || { color: "#9a8a7a", accent: "#6a5a4a" };
  const layerLabel = LAYERS.find(l => l.id === ev.layer)?.label || ev.layer;
  const badge = CONFIDENCE_BADGE[ev.confidence] || null;
  const isMobile = window.innerWidth < 768;

  const t = {
    text:       isDark ? "#e8e0d4"                   : "#2a2418",
    textMuted:  isDark ? "rgba(210,200,180,0.55)"    : "rgba(60,52,38,0.55)",
    border:     isDark ? "rgba(180,160,120,0.12)"    : "rgba(80,70,50,0.15)",
    cardBg:     isDark
      ? "linear-gradient(135deg,rgba(22,18,12,0.98),rgba(30,24,16,0.98))"
      : "linear-gradient(135deg,rgba(255,250,242,0.98),rgba(245,238,226,0.98))",
    overlay:    isDark ? "rgba(10,9,7,0.88)"         : "rgba(245,240,232,0.88)",
  };

  const relatedEvents = useMemo(() => {
    if (!ev.related || !events) return [];
    return ev.related
      .map(rid => events.find(e => e._richId === rid || String(e.id) === rid))
      .filter(Boolean);
  }, [ev, events]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: t.overlay, backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "cosmicFadeIn 0.2s ease-out",
        fontFamily: "'Share Tech Mono', monospace",
      }}
    >
      <style>{`
        @keyframes cosmicFadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Share+Tech+Mono&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 660, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto",
          background: t.cardBg,
          border: `1px solid ${lc.accent}44`, borderTop: `3px solid ${lc.accent}`,
          borderRadius: isMobile ? 10 : 16,
          padding: isMobile ? "24px 18px" : "40px 44px",
          boxShadow: `0 40px 120px rgba(0,0,0,0.5), 0 0 60px ${lc.accent}10`,
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: lc.color,
              background: `${lc.accent}15`, border: `1px solid ${lc.accent}33`,
              padding: "6px 16px", borderRadius: 6, letterSpacing: 2, textTransform: "uppercase",
            }}>{layerLabel}</span>
            {badge && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: badge.color,
                background: `${badge.color}18`, border: `1px solid ${badge.color}33`,
                padding: "4px 10px", borderRadius: 4, letterSpacing: 1,
              }}>{badge.label}</span>
            )}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: t.textMuted, letterSpacing: 1 }}>
            {formatYear(ev.year)}
            {ev.precision && <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>({ev.precision})</span>}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: isMobile ? 22 : 30, fontWeight: 900,
          color: t.text, marginBottom: isMobile ? 14 : 20, lineHeight: 1.3,
        }}>{ev.title}</h2>

        <div style={{ height: 2, background: `linear-gradient(90deg,${lc.accent}55,transparent)`, marginBottom: 24, borderRadius: 1 }} />

        {/* Image */}
        {ev.wikidata?.image && (
          <div style={{ marginBottom: 20, borderRadius: 10, overflow: "hidden", border: `1px solid ${t.border}`, maxHeight: 260 }}>
            <img
              src={ev.wikidata.image} alt={ev.title}
              style={{ width: "100%", height: 260, objectFit: "cover", display: "block" }}
              onError={e => { e.target.style.display = "none"; }}
            />
          </div>
        )}

        {ev.wikidata?.wdDescription && (
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 14, fontStyle: "italic" }}>
            {ev.wikidata.wdDescription}
          </div>
        )}

        {/* Body */}
        <p style={{
          fontFamily: "'Lora', serif",
          fontSize: 17, color: t.text, lineHeight: 2, marginBottom: 16, opacity: 0.85,
        }}>
          {ev.body || ev.desc}
        </p>

        {/* Sources */}
        {ev.sources && ev.sources.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
              Sources
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ev.sources.map((src, i) => (
                <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 13, color: lc.color, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6 }}
                >
                  {src.label} <span style={{ opacity: 0.5 }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {ev.tags && ev.tags.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
            {ev.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 12, fontWeight: 600, color: lc.accent,
                background: `${lc.accent}12`, border: `1px solid ${lc.accent}28`,
                padding: "5px 14px", borderRadius: 6, letterSpacing: 1.5,
              }}># {tag}</span>
            ))}
          </div>
        )}

        {/* Related events */}
        {relatedEvents.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.textMuted, letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
              Related Events
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {relatedEvents.map(rel => {
                const relLc = (isDark ? CSS_COLORS_DARK : CSS_COLORS_LIGHT)[rel.layer] || { color: "#9a8a7a", accent: "#6a5a4a" };
                return (
                  <button
                    key={rel.id}
                    onClick={() => onNavigate(rel)}
                    style={{
                      fontFamily: "'Lora', serif", fontSize: 14, color: t.text, textAlign: "left",
                      background: "transparent", border: `1px solid ${t.border}`,
                      padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: relLc.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{rel.title}</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                      {formatYear(rel.year)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Close */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 13, fontWeight: 700, letterSpacing: 2,
              color: t.textMuted, background: "transparent",
              border: `1.5px solid ${t.border}`,
              padding: "10px 24px", borderRadius: 6, cursor: "pointer",
            }}
          >ESC</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CosmicView({ theme = "dark", onBack, onSelectEvent }) {
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const fpsRef = useRef(null);
  const infoRef = useRef(null);
  // Ref so imperative handlers can call the React prop without stale closure
  const onSelectEventRef = useRef(null);
  onSelectEventRef.current = onSelectEvent;

  const isDark = theme === "dark";
  const layerColors = isDark ? LAYER_COLORS_DARK : LAYER_COLORS_LIGHT;

  // Prepare event data and links
  const { events, links, colors, scales } = useMemo(() => {
    const evts = EVENTS_FLAT;
    const lnks = buildLinks(evts);

    const cols = new Float32Array(evts.length * 3);
    const scls = new Float32Array(evts.length);

    evts.forEach((ev, i) => {
      const col = layerColors[ev.layer] || new THREE.Color("#9a8a7a");
      cols[i * 3] = col.r;
      cols[i * 3 + 1] = col.g;
      cols[i * 3 + 2] = col.b;
      scls[i] = BASE_SIZE * (0.6 + (ev.imp || 3) * 0.35);
    });

    return { events: evts, links: lnks, colors: cols, scales: scls };
  }, [layerColors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ── State ──
    const S = {
      renderer: null, scene: null, camera: null, mesh: null,
      lineMesh: null,
      mouse: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
      flyTarget: null, flyLookAt: null,
      isDragging: false, dragStart: new THREE.Vector2(),
      spherical: new THREE.Spherical(120, Math.PI / 2.5, 0.3),
      lookAt: new THREE.Vector3(0, 0, 0),
      hoveredIndex: -1,
      hoveredEvent: null,
      frameId: null,
      worker: null,
      positions: new Float32Array(events.length * 3),
      settled: false,
      labelSprites: [],
      hoverLabel: null,
      stats: { fps: 0, frames: 0, lastTime: performance.now() },
      // Click detection
      pointerDownX: 0, pointerDownY: 0,
      pointerCount: 0,
      // Touch pinch
      touchPinchDist: 0,
    };
    stateRef.current = S;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    S.renderer = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? "#0a0908" : "#f0ebe0");
    scene.fog = new THREE.FogExp2(isDark ? "#0a0908" : "#f0ebe0", 0.004);
    S.scene = scene;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(
      55, container.clientWidth / container.clientHeight, 0.1, 800
    );
    S.camera = camera;
    updateCameraFromSpherical(S);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(isDark ? 0x554433 : 0x998877, 0.7));
    const dir = new THREE.DirectionalLight(isDark ? 0xc4aa6a : 0x8a7a5a, 0.9);
    dir.position.set(50, 80, 60);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0x6a8ab0, 0.3);
    fill.position.set(-30, -20, 40);
    scene.add(fill);

    // ── Instanced Mesh for events ──
    const geo = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.15 });
    const mesh = new THREE.InstancedMesh(geo, mat, events.length);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < events.length; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    S.mesh = mesh;

    // ── Connection lines ──
    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true, opacity: 1.0, depthWrite: false,
    });
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);
    S.lineMesh = lineMesh;

    // Pre-build link index pairs
    const linkIdToIdx = new Map();
    events.forEach((ev, i) => { if (ev._richId) linkIdToIdx.set(ev._richId, i); });
    const linkPairs = [];
    links.forEach(({ source, target }) => {
      const si = linkIdToIdx.get(source);
      const ti = linkIdToIdx.get(target);
      if (si !== undefined && ti !== undefined) linkPairs.push(si, ti);
    });

    // Persistent edge color buffer (2 vertices × 3 floats per link)
    const numEdges = linkPairs.length / 2;
    const edgeColBuf = new Float32Array(linkPairs.length * 3);
    const BASE_ER = isDark ? 0.16 : 0.26, BASE_EG = isDark ? 0.13 : 0.21, BASE_EB = isDark ? 0.08 : 0.14;
    for (let i = 0; i < linkPairs.length; i++) {
      edgeColBuf[i * 3] = BASE_ER; edgeColBuf[i * 3 + 1] = BASE_EG; edgeColBuf[i * 3 + 2] = BASE_EB;
    }
    S.edgeColBuf = edgeColBuf;
    S.numEdges = numEdges;

    // ── Signal dots — travel along highlighted edges ──
    const MAX_SIG = 128;
    const sigPosBuf = new Float32Array(MAX_SIG * 3);
    const sigColBuf = new Float32Array(MAX_SIG * 3);
    const sigGeo = new THREE.BufferGeometry();
    sigGeo.setAttribute("position", new THREE.BufferAttribute(sigPosBuf, 3));
    sigGeo.setAttribute("color",    new THREE.BufferAttribute(sigColBuf,  3));
    sigGeo.setDrawRange(0, 0);
    const sigMat = new THREE.PointsMaterial({
      size: 3.0, vertexColors: true, transparent: true, opacity: 0.95,
      sizeAttenuation: true, depthWrite: false,
    });
    const sigPoints = new THREE.Points(sigGeo, sigMat);
    scene.add(sigPoints);
    S.sigPosBuf = sigPosBuf; S.sigColBuf = sigColBuf; S.sigGeo = sigGeo;
    S.hoverTime = 0;

    // ── Ambient stars ──
    const starCount = 2000;
    const starGeo2 = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 500;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 500;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    starGeo2.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat2 = new THREE.PointsMaterial({
      size: 0.25, color: isDark ? 0x6a5a4a : 0x9a8a7a,
      transparent: true, opacity: 0.35, sizeAttenuation: true, depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo2, starMat2));

    // ── Hover label (HTML overlay) ──
    const labelEl = document.createElement("div");
    labelEl.style.cssText = `
      position:absolute; pointer-events:none; z-index:20;
      font-family:'Share Tech Mono',monospace; padding:8px 14px;
      border-radius:8px; backdrop-filter:blur(10px); display:none;
      max-width:280px; transition: opacity 0.15s;
    `;
    labelEl.style.background = isDark ? "rgba(13,12,10,0.92)" : "rgba(245,240,232,0.92)";
    container.appendChild(labelEl);
    S.hoverLabel = labelEl;

    // ── Web Worker — force layout ──
    const worker = new Worker(
      new URL("../workers/forceLayout.js", import.meta.url),
      { type: "module" }
    );
    S.worker = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "tick") {
        const newPos = new Float32Array(msg.positions);
        S.positions = newPos;

        for (let i = 0; i < events.length; i++) {
          dummy.position.set(newPos[i * 3], newPos[i * 3 + 1], newPos[i * 3 + 2]);
          dummy.scale.setScalar(scales[i]);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;

        if (linkPairs.length > 0) {
          const linePositions = new Float32Array(linkPairs.length * 3);
          for (let i = 0; i < linkPairs.length; i++) {
            const idx = linkPairs[i];
            linePositions[i * 3] = newPos[idx * 3];
            linePositions[i * 3 + 1] = newPos[idx * 3 + 1];
            linePositions[i * 3 + 2] = newPos[idx * 3 + 2];
          }
          lineMesh.geometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
          lineMesh.geometry.attributes.position.needsUpdate = true;
          // Attach color buffer once (persists across position updates)
          if (!lineMesh.geometry.attributes.color) {
            lineMesh.geometry.setAttribute("color", new THREE.BufferAttribute(S.edgeColBuf, 3));
          }
        }

        if (infoRef.current) {
          const pct = Math.max(0, Math.min(100, (1 - msg.alpha) * 100));
          infoRef.current.textContent = msg.alpha > 0.01
            ? `SIMULATING... ${pct.toFixed(0)}%`
            : `${events.length} EVENTS · ${linkPairs.length / 2} CONNECTIONS`;
        }
      } else if (msg.type === "settled") {
        S.settled = true;
        if (infoRef.current) {
          infoRef.current.textContent = `${events.length} EVENTS · ${linkPairs.length / 2} CONNECTIONS · SETTLED`;
        }
      }
    };

    worker.postMessage({
      type: "init",
      events: events.map(ev => ({
        id: ev.id, _richId: ev._richId,
        year: ev.year, layer: ev.layer, imp: ev.imp, related: ev.related,
      })),
      eventLinks: links,
    });

    // ── Animation loop ──
    function animate() {
      S.frameId = requestAnimationFrame(animate);

      S.stats.frames++;
      const now = performance.now();
      if (now - S.stats.lastTime >= 1000) {
        S.stats.fps = S.stats.frames;
        S.stats.frames = 0;
        S.stats.lastTime = now;
        if (fpsRef.current) fpsRef.current.textContent = `${S.stats.fps} FPS`;
      }

      if (S.flyTarget) {
        S.spherical.radius += (S.flyTarget.radius - S.spherical.radius) * FLY_SPEED;
        S.spherical.theta += (S.flyTarget.theta - S.spherical.theta) * FLY_SPEED;
        S.spherical.phi += (S.flyTarget.phi - S.spherical.phi) * FLY_SPEED;
        S.lookAt.lerp(S.flyLookAt, FLY_SPEED);
        if (Math.abs(S.spherical.radius - S.flyTarget.radius) < 0.3) S.flyTarget = null;
        updateCameraFromSpherical(S);
      }

      if (!S.isDragging && !S.flyTarget) {
        S.spherical.theta += 0.0003;
        updateCameraFromSpherical(S);
      }

      // Sphere-based hover — works for small nodes at any camera distance
      S.raycaster.setFromCamera(S.mouse, camera);
      const hoverIdx = sphereRaycast(S.raycaster.ray, S.positions, scales, events.length);
      if (hoverIdx >= 0) {
        const idx = hoverIdx;
        S.hoveredEvent = events[idx] || null;
        if (idx !== S.hoveredIndex) {
          S.hoveredIndex = idx;
          const ev = events[idx];
          const col = layerColors[ev.layer] || new THREE.Color("#9a8a7a");
          const hexCol = `#${col.getHexString()}`;
          labelEl.innerHTML = `
            <div style="font-size:9px;font-weight:600;color:${hexCol};letter-spacing:2px;margin-bottom:3px">
              ${formatYear(ev.year)} · ${(ev.layer || "").toUpperCase()}
            </div>
            <div style="font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:${isDark ? "#e8e0d4" : "#2a2418"};line-height:1.3">
              ${ev.title}
            </div>
            ${ev.desc ? `<div style="font-size:10px;color:${isDark ? "rgba(210,200,180,0.6)" : "rgba(60,52,38,0.6)"};margin-top:4px;line-height:1.4">${ev.desc.slice(0, 120)}${ev.desc.length > 120 ? "..." : ""}</div>` : ""}
            <div style="font-size:9px;color:${hexCol};margin-top:6px;opacity:0.6;letter-spacing:1px">CLICK TO OPEN · DBL-CLICK TO FLY</div>
          `;
          labelEl.style.borderLeft = `2px solid ${hexCol}44`;
          labelEl.style.display = "block";
          container.style.cursor = "pointer";
        }
        // Position label near mouse
        const rect = container.getBoundingClientRect();
        const mx = (S.mouse.x * 0.5 + 0.5) * rect.width;
        const my = (-S.mouse.y * 0.5 + 0.5) * rect.height;
        labelEl.style.left = `${Math.min(mx + 16, rect.width - 300)}px`;
        labelEl.style.top = `${Math.max(my - 40, 8)}px`;
      } else {
        S.hoveredEvent = null;
        if (S.hoveredIndex !== -1) {
          S.hoveredIndex = -1;
          labelEl.style.display = "none";
          container.style.cursor = S.isDragging ? "grabbing" : "grab";
        }
      }

      // ── Edge highlight + signal dots ──
      if (lineMesh.geometry.attributes.color && S.numEdges > 0) {
        S.hoverTime += 0.022;
        const hovIdx = S.hoveredIndex;
        const pos = S.positions;
        const ecb = S.edgeColBuf;
        const spb = S.sigPosBuf; const scb = S.sigColBuf;
        const pulse = 0.55 + 0.45 * Math.sin(S.hoverTime * Math.PI * 2.5);
        let sigCount = 0;

        for (let e = 0; e < S.numEdges; e++) {
          const si = linkPairs[e * 2], ti = linkPairs[e * 2 + 1];
          const isConn = hovIdx >= 0 && (si === hovIdx || ti === hovIdx);
          const vi0 = e * 6, vi1 = e * 6 + 3; // vertex color offsets

          if (isConn) {
            const srcI = si === hovIdx ? si : ti;
            const tgtI = si === hovIdx ? ti : si;
            const col = layerColors[events[srcI]?.layer] || new THREE.Color(0.6, 0.6, 0.4);
            // Source vertex: bright; target vertex: dimmer — creates gradient away from node
            ecb[vi0]   = col.r * pulse;       ecb[vi0+1] = col.g * pulse;       ecb[vi0+2] = col.b * pulse;
            ecb[vi1]   = col.r * pulse * 0.4; ecb[vi1+1] = col.g * pulse * 0.4; ecb[vi1+2] = col.b * pulse * 0.4;
            // Signal dot traveling from source to target
            if (sigCount < 128) {
              const t = (S.hoverTime * 1.4) % 1.0;
              spb[sigCount*3]   = pos[srcI*3]   + (pos[tgtI*3]   - pos[srcI*3])   * t;
              spb[sigCount*3+1] = pos[srcI*3+1] + (pos[tgtI*3+1] - pos[srcI*3+1]) * t;
              spb[sigCount*3+2] = pos[srcI*3+2] + (pos[tgtI*3+2] - pos[srcI*3+2]) * t;
              const fade = Math.sin(t * Math.PI); // bright in middle, fade at ends
              scb[sigCount*3] = col.r + (1-col.r)*0.6*fade;
              scb[sigCount*3+1] = col.g + (1-col.g)*0.5*fade;
              scb[sigCount*3+2] = col.b + (1-col.b)*0.8*fade;
              sigCount++;
            }
          } else {
            ecb[vi0]=BASE_ER; ecb[vi0+1]=BASE_EG; ecb[vi0+2]=BASE_EB;
            ecb[vi1]=BASE_ER; ecb[vi1+1]=BASE_EG; ecb[vi1+2]=BASE_EB;
          }
        }
        lineMesh.geometry.attributes.color.needsUpdate = true;
        S.sigGeo.setDrawRange(0, sigCount);
        if (sigCount > 0) {
          S.sigGeo.attributes.position.needsUpdate = true;
          S.sigGeo.attributes.color.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    // ── Mouse / Pointer controls ──
    function onWheel(e) {
      e.preventDefault();
      S.spherical.radius *= 1 + e.deltaY * 0.001;
      S.spherical.radius = Math.max(5, Math.min(300, S.spherical.radius));
      updateCameraFromSpherical(S);
    }

    function onPointerDown(e) {
      S.pointerCount++;
      if (S.pointerCount === 1) {
        S.isDragging = true;
        S.dragStart.set(e.clientX, e.clientY);
        S.flyTarget = null;
        container.style.cursor = "grabbing";
      }
    }

    function onPointerMove(e) {
      const rect = container.getBoundingClientRect();
      S.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Only orbit for single pointer (ignore second finger)
      if (S.isDragging && S.pointerCount === 1) {
        const dx = e.clientX - S.dragStart.x;
        const dy = e.clientY - S.dragStart.y;
        S.spherical.theta -= dx * 0.005;
        S.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, S.spherical.phi - dy * 0.005));
        S.dragStart.set(e.clientX, e.clientY);
        updateCameraFromSpherical(S);
      }
    }

    function onPointerUp(e) {
      S.pointerCount = Math.max(0, S.pointerCount - 1);
      if (S.pointerCount === 0) {
        const wasDrag = Math.abs(e.clientX - S.dragStart.x) > 8 || Math.abs(e.clientY - S.dragStart.y) > 8;
        S.isDragging = false;
        container.style.cursor = "grab";

        const rect = container.getBoundingClientRect();
        const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const clickRay = new THREE.Raycaster();
        clickRay.setFromCamera(new THREE.Vector2(mx, my), camera);
        const hitIdx = sphereRaycast(clickRay.ray, S.positions, scales, events.length);

        if (!wasDrag && hitIdx >= 0) {
          const ev = events[hitIdx];
          if (ev) onSelectEventRef.current?.(ev);
        }
      }
    }

    function onPointerLeave() {
      S.pointerCount = 0;
      S.isDragging = false;
      container.style.cursor = "grab";
    }

    function onDblClick(e) {
      // Close modal if open (via ref since we're in imperative scope), then fly
      onSelectEventRef.current?.(null);
      const rect = container.getBoundingClientRect();
      S.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      S.raycaster.setFromCamera(S.mouse, camera);
      const flyIdx = sphereRaycast(S.raycaster.ray, S.positions, scales, events.length);
      if (flyIdx >= 0) {
        const pos = S.positions;
        const target = new THREE.Vector3(pos[flyIdx * 3], pos[flyIdx * 3 + 1], pos[flyIdx * 3 + 2]);
        flyToPoint(S, target, 8 + scales[flyIdx] * 15);
      }
    }

    const canvas = renderer.domElement;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("dblclick", onDblClick);

    // ── Touch: pinch-to-zoom (two fingers) ──
    // Pointer events already handle single-finger orbit; we add pinch on top.
    function onTouchStart(e) {
      if (e.touches.length === 2) {
        // Disable orbit drag while pinching
        S.isDragging = false;
        S.pointerCount = 0;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        S.touchPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2 && S.touchPinchDist > 0) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sc = S.touchPinchDist / dist;
        S.spherical.radius = Math.max(5, Math.min(300, S.spherical.radius * sc));
        updateCameraFromSpherical(S);
        S.touchPinchDist = dist;
      }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) S.touchPinchDist = 0;
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(S.frameId);
      worker.terminate();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("dblclick", onDblClick);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(labelEl)) container.removeChild(labelEl);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [events, links, colors, scales, isDark, layerColors]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* HUD: back button */}
      <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={onBack} style={{
          fontFamily: "'Share Tech Mono', monospace", fontSize: 11, fontWeight: 700,
          padding: "7px 14px", borderRadius: 5, cursor: "pointer", letterSpacing: 1.5,
          border: `1px solid ${isDark ? "rgba(180,160,120,0.3)" : "rgba(80,70,50,0.3)"}`,
          background: isDark ? "rgba(13,12,10,0.8)" : "rgba(245,240,232,0.8)",
          color: isDark ? "#e8e0d4" : "#2a2418",
          backdropFilter: "blur(10px)",
        }}>
          ← TIMELINE
        </button>
      </div>

      {/* HUD: FPS */}
      <div ref={fpsRef} style={{
        position: "absolute", top: 16, right: 16, zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 10, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.4)" : "rgba(80,70,50,0.4)",
        letterSpacing: 1.5,
        background: isDark ? "rgba(13,12,10,0.6)" : "rgba(245,240,232,0.6)",
        padding: "5px 10px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>--</div>

      {/* HUD: simulation status */}
      <div ref={infoRef} style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 10, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.5)" : "rgba(80,70,50,0.5)",
        letterSpacing: 2,
        background: isDark ? "rgba(13,12,10,0.6)" : "rgba(245,240,232,0.6)",
        padding: "5px 14px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>INITIALIZING...</div>

      {/* HUD: controls */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 9, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.3)" : "rgba(80,70,50,0.3)",
        letterSpacing: 2, textAlign: "center",
        background: isDark ? "rgba(13,12,10,0.5)" : "rgba(245,240,232,0.5)",
        padding: "5px 14px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        DRAG TO ORBIT · SCROLL/PINCH TO ZOOM · CLICK TO OPEN · DBL-CLICK TO FLY
      </div>

      {/* HUD: layer legend */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 2,
        background: isDark ? "rgba(13,12,10,0.65)" : "rgba(245,240,232,0.65)",
        padding: "7px 10px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        {LAYERS.map((layer) => {
          const col = layerColors[layer.id] || new THREE.Color("#9a8a7a");
          return (
            <div key={layer.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: `#${col.getHexString()}`, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Share Tech Mono', monospace", fontSize: 8, fontWeight: 600,
                color: isDark ? "rgba(200,180,140,0.45)" : "rgba(80,70,50,0.45)",
                letterSpacing: 0.8,
              }}>{layer.label}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function updateCameraFromSpherical(S) {
  const pos = new THREE.Vector3().setFromSpherical(S.spherical).add(S.lookAt);
  S.camera.position.copy(pos);
  S.camera.lookAt(S.lookAt);
}

function flyToPoint(S, target, distance) {
  const dir = new THREE.Vector3().copy(S.camera.position).sub(target).normalize();
  S.flyLookAt = target.clone();
  S.flyTarget = new THREE.Spherical().setFromVector3(dir.multiplyScalar(distance));
}

// Sphere-based raycast — replaces triangle intersection for tiny nodes.
// Finds the closest node whose sphere (visual scale + HIT_PAD world units) the ray passes through.
const _sSphere = new THREE.Sphere();
const _sTarget = new THREE.Vector3();
const HIT_PAD = 2.5; // world-unit padding — makes nodes much easier to click/hover

function sphereRaycast(ray, positions, scales, count) {
  let bestDist = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < count; i++) {
    _sSphere.center.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    _sSphere.radius = scales[i] + HIT_PAD;
    if (ray.intersectSphere(_sSphere, _sTarget)) {
      const d = ray.origin.distanceToSquared(_sTarget);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
  }
  return bestIdx;
}

function formatYear(y) {
  const a = Math.abs(y);
  const suffix = y < 0 ? " BCE" : y > 0 ? " CE" : "";
  if (a >= 1e9) return `${(a / 1e9).toFixed(1)}B${suffix}`;
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)}M${suffix}`;
  if (a >= 1e5) return `${(a / 1e3).toFixed(0)}K${suffix}`;
  if (a >= 1000) return `${(a / 1000).toFixed(1)}K${suffix}`;
  return `${a}${suffix}`;
}
