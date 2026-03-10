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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CosmicView({ theme = "dark", onBack }) {
  const containerRef = useRef(null);
  const stateRef = useRef(null);
  const fpsRef = useRef(null);
  const infoRef = useRef(null);

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
      frameId: null,
      worker: null,
      positions: new Float32Array(events.length * 3),
      settled: false,
      labelSprites: [],
      hoverLabel: null,
      stats: { fps: 0, frames: 0, lastTime: performance.now() },
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
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.15,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, events.length);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    // Initialize at origin — worker will provide positions
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
      color: isDark ? 0xc4aa6a : 0x8a7a5a,
      transparent: true,
      opacity: CONNECTION_OPACITY,
      depthWrite: false,
    });
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);
    S.lineMesh = lineMesh;

    // Pre-build link index pairs for fast position updates
    const linkIdToIdx = new Map();
    events.forEach((ev, i) => {
      if (ev._richId) linkIdToIdx.set(ev._richId, i);
    });
    const linkPairs = [];
    links.forEach(({ source, target }) => {
      const si = linkIdToIdx.get(source);
      const ti = linkIdToIdx.get(target);
      if (si !== undefined && ti !== undefined) {
        linkPairs.push(si, ti);
      }
    });

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

        // Update instanced mesh positions
        for (let i = 0; i < events.length; i++) {
          dummy.position.set(newPos[i * 3], newPos[i * 3 + 1], newPos[i * 3 + 2]);
          dummy.scale.setScalar(scales[i]);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;

        // Update connection lines
        if (linkPairs.length > 0) {
          const linePositions = new Float32Array(linkPairs.length * 3);
          for (let i = 0; i < linkPairs.length; i++) {
            const idx = linkPairs[i];
            linePositions[i * 3] = newPos[idx * 3];
            linePositions[i * 3 + 1] = newPos[idx * 3 + 1];
            linePositions[i * 3 + 2] = newPos[idx * 3 + 2];
          }
          lineMesh.geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(linePositions, 3)
          );
          lineMesh.geometry.attributes.position.needsUpdate = true;
        }

        // Update info overlay
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

    // Send events to worker
    worker.postMessage({
      type: "init",
      events: events.map(ev => ({
        id: ev.id,
        _richId: ev._richId,
        year: ev.year,
        layer: ev.layer,
        imp: ev.imp,
        related: ev.related,
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

      // Fly-to animation
      if (S.flyTarget) {
        S.spherical.radius += (S.flyTarget.radius - S.spherical.radius) * FLY_SPEED;
        S.spherical.theta += (S.flyTarget.theta - S.spherical.theta) * FLY_SPEED;
        S.spherical.phi += (S.flyTarget.phi - S.spherical.phi) * FLY_SPEED;
        S.lookAt.lerp(S.flyLookAt, FLY_SPEED);
        if (Math.abs(S.spherical.radius - S.flyTarget.radius) < 0.3) {
          S.flyTarget = null;
        }
        updateCameraFromSpherical(S);
      }

      // Gentle auto-rotation when idle
      if (!S.isDragging && !S.flyTarget) {
        S.spherical.theta += 0.0003;
        updateCameraFromSpherical(S);
      }

      // Raycasting for hover (every frame for responsiveness)
      S.raycaster.setFromCamera(S.mouse, camera);
      const hits = S.raycaster.intersectObject(mesh);
      if (hits.length > 0) {
        const idx = hits[0].instanceId;
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
          `;
          labelEl.style.display = "block";
          labelEl.style.borderLeft = `2px solid ${hexCol}44`;
          container.style.cursor = "pointer";
        }
        // Position label near mouse
        const rect = container.getBoundingClientRect();
        const mx = (S.mouse.x * 0.5 + 0.5) * rect.width;
        const my = (-S.mouse.y * 0.5 + 0.5) * rect.height;
        labelEl.style.left = `${Math.min(mx + 16, rect.width - 300)}px`;
        labelEl.style.top = `${Math.max(my - 40, 8)}px`;
      } else {
        if (S.hoveredIndex !== -1) {
          S.hoveredIndex = -1;
          labelEl.style.display = "none";
          container.style.cursor = "grab";
        }
      }

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    // ── Mouse controls ──
    function onWheel(e) {
      e.preventDefault();
      S.spherical.radius *= 1 + e.deltaY * 0.001;
      S.spherical.radius = Math.max(5, Math.min(300, S.spherical.radius));
      updateCameraFromSpherical(S);
    }

    function onPointerDown(e) {
      S.isDragging = true;
      S.dragStart.set(e.clientX, e.clientY);
      S.flyTarget = null;
      container.style.cursor = "grabbing";
    }

    function onPointerMove(e) {
      const rect = container.getBoundingClientRect();
      S.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (S.isDragging) {
        const dx = e.clientX - S.dragStart.x;
        const dy = e.clientY - S.dragStart.y;
        S.spherical.theta -= dx * 0.005;
        S.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, S.spherical.phi - dy * 0.005));
        S.dragStart.set(e.clientX, e.clientY);
        updateCameraFromSpherical(S);
      }
    }

    function onPointerUp() {
      S.isDragging = false;
      container.style.cursor = "grab";
    }

    function onDblClick(e) {
      const rect = container.getBoundingClientRect();
      S.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      S.raycaster.setFromCamera(S.mouse, camera);
      const hits = S.raycaster.intersectObject(mesh);

      if (hits.length > 0) {
        const idx = hits[0].instanceId;
        const pos = S.positions;
        const target = new THREE.Vector3(pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]);
        flyToPoint(S, target, 8 + scales[idx] * 15);
      }
    }

    const canvas = renderer.domElement;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    canvas.addEventListener("dblclick", onDblClick);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(S.frameId);
      worker.terminate();
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("dblclick", onDblClick);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (container.contains(labelEl)) container.removeChild(labelEl);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [events, links, colors, scales, isDark, layerColors]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* HUD: back button */}
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 8,
      }}>
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
      }}>
        --
      </div>

      {/* HUD: simulation status */}
      <div ref={infoRef} style={{
        position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 10, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.5)" : "rgba(80,70,50,0.5)",
        letterSpacing: 2,
        background: isDark ? "rgba(13,12,10,0.6)" : "rgba(245,240,232,0.6)",
        padding: "5px 14px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        INITIALIZING...
      </div>

      {/* HUD: controls */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 9, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.3)" : "rgba(80,70,50,0.3)",
        letterSpacing: 2, textAlign: "center",
        background: isDark ? "rgba(13,12,10,0.5)" : "rgba(245,240,232,0.5)",
        padding: "5px 14px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        DRAG TO ORBIT · SCROLL TO ZOOM · DOUBLE-CLICK TO FLY TO EVENT
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

function formatYear(y) {
  const a = Math.abs(y);
  const suffix = y < 0 ? " BCE" : y > 0 ? " CE" : "";
  if (a >= 1e9) return `${(a / 1e9).toFixed(1)}B${suffix}`;
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)}M${suffix}`;
  if (a >= 1e5) return `${(a / 1e3).toFixed(0)}K${suffix}`;
  if (a >= 1000) return `${(a / 1000).toFixed(1)}K${suffix}`;
  return `${a}${suffix}`;
}
