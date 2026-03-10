// CosmicView.jsx — Phase 1: GPU instanced point cloud proof-of-concept
// Renders 100K+ events as instanced spheres with fly-through camera
// Raw three.js for low-level GPU control (no R3F abstraction)

import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const TOTAL_POINTS = 100_000;
const SPHERE_SEGMENTS = 6; // low-poly for instancing perf
const BASE_SIZE = 0.04;
const FLY_SPEED = 0.08; // interpolation factor for camera fly-to
const CLUSTER_COUNT = 60; // number of natural clusters

// Layer colors — matches the 10 layers from the app
const LAYER_COLORS = [
  new THREE.Color("#c9977a"), // herstory
  new THREE.Color("#c4a85a"), // indigenous
  new THREE.Color("#9a90b8"), // cosmos
  new THREE.Color("#7aaa7e"), // earth
  new THREE.Color("#6a9a7a"), // life
  new THREE.Color("#c4aa6a"), // society
  new THREE.Color("#b87a6a"), // conflict
  new THREE.Color("#6a8ab0"), // science
  new THREE.Color("#b88a9a"), // culture
  new THREE.Color("#9a8aaa"), // philosophy
];

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE SYNTHETIC DATA — clustered distribution simulating real event density
// ═══════════════════════════════════════════════════════════════════════════════
function generateClusteredPoints(count) {
  // Create cluster centers — simulate dense periods of history
  const clusters = [];
  for (let i = 0; i < CLUSTER_COUNT; i++) {
    clusters.push({
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 200,
      radius: 5 + Math.random() * 25, // cluster spread
      layer: Math.floor(Math.random() * 10),
      weight: 0.3 + Math.random() * 0.7, // how many points attracted here
    });
  }

  // Normalize weights
  const totalWeight = clusters.reduce((s, c) => s + c.weight, 0);
  clusters.forEach(c => c.weight /= totalWeight);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const layerIds = new Uint8Array(count);

  for (let i = 0; i < count; i++) {
    // Pick a cluster (weighted random)
    let r = Math.random();
    let cluster = clusters[0];
    for (const c of clusters) {
      r -= c.weight;
      if (r <= 0) { cluster = c; break; }
    }

    // Gaussian offset from cluster center
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const rad = cluster.radius * Math.pow(Math.random(), 0.5); // sqrt for uniform volume
    const x = cluster.x + rad * Math.sin(phi) * Math.cos(theta);
    const y = cluster.y + rad * Math.sin(phi) * Math.sin(theta);
    const z = cluster.z + rad * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Layer — mostly from cluster, some random scatter
    const layer = Math.random() < 0.7 ? cluster.layer : Math.floor(Math.random() * 10);
    layerIds[i] = layer;
    const col = LAYER_COLORS[layer];
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    // Importance → scale (1-5, power-law distribution: most events are low importance)
    const imp = 1 + Math.floor(Math.pow(Math.random(), 2.5) * 5);
    scales[i] = BASE_SIZE * (0.5 + imp * 0.4);
  }

  return { positions, colors, scales, layerIds, clusters };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function CosmicView({ theme = "dark", onBack }) {
  const containerRef = useRef(null);
  const stateRef = useRef({
    renderer: null, scene: null, camera: null, mesh: null,
    mouse: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(),
    flyTarget: null, flyLookAt: null,
    isDragging: false, dragStart: new THREE.Vector2(),
    spherical: new THREE.Spherical(150, Math.PI / 2, 0),
    lookAt: new THREE.Vector3(0, 0, 0),
    hoveredIndex: -1,
    frameId: null,
    data: null,
    clock: new THREE.Clock(),
    stats: { fps: 0, frames: 0, lastTime: 0 },
  });
  const fpsRef = useRef(null);

  const isDark = theme === "dark";

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const S = stateRef.current;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    S.renderer = renderer;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? "#0a0908" : "#f0ebe0");
    scene.fog = new THREE.FogExp2(isDark ? "#0a0908" : "#f0ebe0", 0.003);
    S.scene = scene;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    S.camera = camera;
    // Position camera from spherical
    updateCameraFromSpherical(S);

    // ── Lighting ──
    scene.add(new THREE.AmbientLight(isDark ? 0x443322 : 0x887766, 0.6));
    const dirLight = new THREE.DirectionalLight(isDark ? 0xc4aa6a : 0x8a7a5a, 0.8);
    dirLight.position.set(50, 80, 60);
    scene.add(dirLight);

    // ── Generate data ──
    const data = generateClusteredPoints(TOTAL_POINTS);
    S.data = data;

    // ── Instanced Mesh ──
    const geo = new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.5,
      metalness: 0.15,
      vertexColors: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, TOTAL_POINTS);
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Per-instance color
    const colorAttr = new THREE.InstancedBufferAttribute(data.colors, 3);
    mesh.instanceColor = colorAttr;

    // Set transforms
    const dummy = new THREE.Object3D();
    for (let i = 0; i < TOTAL_POINTS; i++) {
      dummy.position.set(
        data.positions[i * 3],
        data.positions[i * 3 + 1],
        data.positions[i * 3 + 2]
      );
      dummy.scale.setScalar(data.scales[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    S.mesh = mesh;

    // ── Ambient particles (distant stars) ──
    const starCount = 3000;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 600;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 600;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 600;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.3,
      color: isDark ? 0x6a5a4a : 0x9a8a7a,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
      depthWrite: false,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Raycaster for hover ──
    S.raycaster.firstHitOnly = true;

    // ── Animation loop ──
    function animate() {
      S.frameId = requestAnimationFrame(animate);

      // FPS counter
      S.stats.frames++;
      const now = performance.now();
      if (now - S.stats.lastTime >= 1000) {
        S.stats.fps = S.stats.frames;
        S.stats.frames = 0;
        S.stats.lastTime = now;
        if (fpsRef.current) fpsRef.current.textContent = `${S.stats.fps} FPS | ${TOTAL_POINTS.toLocaleString()} instances`;
      }

      // Fly-to animation
      if (S.flyTarget) {
        S.spherical.radius += (S.flyTarget.radius - S.spherical.radius) * FLY_SPEED;
        S.spherical.theta += (S.flyTarget.theta - S.spherical.theta) * FLY_SPEED;
        S.spherical.phi += (S.flyTarget.phi - S.spherical.phi) * FLY_SPEED;
        S.lookAt.lerp(S.flyLookAt, FLY_SPEED);

        if (Math.abs(S.spherical.radius - S.flyTarget.radius) < 0.1) {
          S.flyTarget = null;
        }
        updateCameraFromSpherical(S);
      }

      // Gentle auto-rotation when idle
      if (!S.isDragging && !S.flyTarget) {
        S.spherical.theta += 0.0005;
        updateCameraFromSpherical(S);
      }

      renderer.render(scene, camera);
    }
    S.stats.lastTime = performance.now();
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
      S.spherical.radius = Math.max(5, Math.min(400, S.spherical.radius));
      updateCameraFromSpherical(S);
    }

    function onPointerDown(e) {
      S.isDragging = true;
      S.dragStart.set(e.clientX, e.clientY);
      S.flyTarget = null; // cancel fly-to on manual drag
    }

    function onPointerMove(e) {
      // Update mouse for raycasting
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
    }

    function onDblClick(e) {
      // Raycast to find clicked instance
      const rect = container.getBoundingClientRect();
      S.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      S.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      S.raycaster.setFromCamera(S.mouse, camera);
      const hits = S.raycaster.intersectObject(mesh);

      if (hits.length > 0) {
        const idx = hits[0].instanceId;
        const target = new THREE.Vector3(
          data.positions[idx * 3],
          data.positions[idx * 3 + 1],
          data.positions[idx * 3 + 2]
        );
        flyToPoint(S, target, 20);
      }
    }

    const canvas = renderer.domElement;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerleave", onPointerUp);
    canvas.addEventListener("dblclick", onDblClick);

    return () => {
      cancelAnimationFrame(S.frameId);
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
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isDark]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />

      {/* HUD overlay */}
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
          ← BACK
        </button>
      </div>

      {/* FPS + instance count */}
      <div ref={fpsRef} style={{
        position: "absolute", top: 16, right: 16, zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 11, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.5)" : "rgba(80,70,50,0.5)",
        letterSpacing: 1.5,
        background: isDark ? "rgba(13,12,10,0.6)" : "rgba(245,240,232,0.6)",
        padding: "6px 12px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        -- FPS
      </div>

      {/* Controls hint */}
      <div style={{
        position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        fontFamily: "'Share Tech Mono', monospace", fontSize: 10, fontWeight: 600,
        color: isDark ? "rgba(200,180,140,0.35)" : "rgba(80,70,50,0.35)",
        letterSpacing: 2, textAlign: "center",
        background: isDark ? "rgba(13,12,10,0.6)" : "rgba(245,240,232,0.6)",
        padding: "6px 16px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        DRAG TO ORBIT · SCROLL TO ZOOM · DOUBLE-CLICK TO FLY TO CLUSTER
      </div>

      {/* Layer legend */}
      <div style={{
        position: "absolute", bottom: 16, right: 16, zIndex: 10,
        display: "flex", flexDirection: "column", gap: 3,
        background: isDark ? "rgba(13,12,10,0.7)" : "rgba(245,240,232,0.7)",
        padding: "8px 12px", borderRadius: 5, backdropFilter: "blur(8px)",
      }}>
        {["HERSTORY", "INDIGENOUS", "COSMOS", "EARTH", "LIFE", "SOCIETY", "CONFLICT", "SCIENCE", "CULTURE", "PHILOSOPHY"].map((name, i) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: `#${LAYER_COLORS[i].getHexString()}` }} />
            <span style={{
              fontFamily: "'Share Tech Mono', monospace", fontSize: 8, fontWeight: 600,
              color: isDark ? "rgba(200,180,140,0.5)" : "rgba(80,70,50,0.5)",
              letterSpacing: 1,
            }}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function updateCameraFromSpherical(S) {
  const pos = new THREE.Vector3().setFromSpherical(S.spherical).add(S.lookAt);
  S.camera.position.copy(pos);
  S.camera.lookAt(S.lookAt);
}

function flyToPoint(S, target, distance) {
  // Compute spherical coords relative to target
  const dir = new THREE.Vector3().copy(S.camera.position).sub(target).normalize();
  S.flyLookAt = target.clone();
  S.flyTarget = new THREE.Spherical().setFromVector3(dir.multiplyScalar(distance));
}
