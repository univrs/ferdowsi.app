// TimelineView3D.jsx — 3D cosmic visualization of the timeline
import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function yearToX(year) {
  const now = 2026;
  const diff = now - year;
  if (diff <= 0) return 20;
  return 20 - Math.log10(diff + 1) * 2;
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

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT SPHERE
// ═══════════════════════════════════════════════════════════════════════════════
function EventSphere({ ev, position, color, size, onClick, isSelected }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const [hovered, setHovered] = useState(false);
  const idHash = typeof ev.id === "number" ? ev.id : 1;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const breath = 1 + Math.sin(t * 1.5 + idHash * 0.7) * 0.08;
    meshRef.current.scale.setScalar(hovered ? size * 1.6 : size * breath);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(size * 2.5 * (1 + Math.sin(t * 2 + idHash) * 0.15));
      glowRef.current.material.opacity = hovered ? 0.35 : 0.12 + Math.sin(t * 1.5 + idHash) * 0.05;
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(ev); }}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial
          color={hovered || isSelected ? "#ffffff" : color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.4}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      {hovered && (
        <Html center distanceFactor={15} style={{ pointerEvents: "none" }} position={[0, size * 2.5 + 0.5, 0]}>
          <div style={{
            background: "rgba(13,12,10,0.92)", border: `1px solid ${color}66`,
            borderRadius: 8, padding: "8px 14px", backdropFilter: "blur(8px)",
            whiteSpace: "nowrap", maxWidth: 280,
          }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, fontWeight: 600, color, letterSpacing: 2, marginBottom: 4 }}>
              {formatYear(ev.year)}
            </div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, fontWeight: 700, color: "#e8e0d4", lineHeight: 1.3 }}>
              {ev.title}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTION LINES between related events (imperative geometry)
// ═══════════════════════════════════════════════════════════════════════════════
function ConnectionLines({ events, positions }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const pts = [];
    events.forEach((ev, i) => {
      if (!ev.related) return;
      ev.related.forEach(relId => {
        const j = events.findIndex(e => e._richId === relId);
        if (j < 0 || !positions[i] || !positions[j]) return;
        pts.push(positions[i].clone(), positions[j].clone());
      });
    });
    if (pts.length > 0) {
      ref.current.geometry.setFromPoints(pts);
    }
  }, [events, positions]);

  return (
    <lineSegments ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial color="#6a5a4a" transparent opacity={0.06} depthWrite={false} />
    </lineSegments>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIME AXIS
// ═══════════════════════════════════════════════════════════════════════════════
function TimeAxis({ layerCount }) {
  const yBottom = -(layerCount * 1.8) / 2 - 1.5;

  const markers = [
    -13800000000, -4500000000, -500000000, -70000, -10000,
    -5000, -3000, -1000, -500, 0, 500, 1000, 1500, 1800, 1900, 2000, 2025,
  ];

  return (
    <group>
      {markers.map((year) => {
        const x = yearToX(year);
        return (
          <group key={year} position={[x, yBottom, 0]}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.02, 0.3, 0.02]} />
              <meshBasicMaterial color="#6a5a4a" transparent opacity={0.4} />
            </mesh>
            <Text
              position={[0, -0.4, 0]}
              fontSize={0.2}
              color="#6a5a4a"
              anchorX="center"
              anchorY="top"
            >
              {formatYear(year)}
            </Text>
          </group>
        );
      })}
      <mesh position={[(yearToX(-13800000000) + yearToX(2026)) / 2, yBottom, 0]}>
        <boxGeometry args={[yearToX(2026) - yearToX(-13800000000), 0.01, 0.01]} />
        <meshBasicMaterial color="#4a4030" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER LABELS
// ═══════════════════════════════════════════════════════════════════════════════
function LayerLabels({ layers, activeLayerIds, layerColors, xPosition }) {
  return (
    <group position={[xPosition - 1, 0, 0]}>
      {activeLayerIds.map((id, i) => {
        const lc = layerColors[id] || { color: "#9a8a7a" };
        const y = (i - (activeLayerIds.length - 1) / 2) * 1.8;
        const layer = layers.find(l => l.id === id);
        return (
          <Text
            key={id}
            position={[0, y, 0]}
            fontSize={0.22}
            color={lc.color}
            anchorX="right"
            anchorY="middle"
            maxWidth={4}
          >
            {layer?.label || id}
          </Text>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STARFIELD — imperative geometry (no declarative bufferAttribute)
// ═══════════════════════════════════════════════════════════════════════════════
function Stars3D({ count = 1200 }) {
  const ref = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 120;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    return arr;
  }, [count]);

  // Set geometry imperatively to avoid declarative bufferAttribute issues
  useEffect(() => {
    if (!ref.current) return;
    const geom = ref.current.geometry;
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  }, [positions]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.003;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry />
      <pointsMaterial size={0.08} color="#c4aa8a" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOW BEAM
// ═══════════════════════════════════════════════════════════════════════════════
function NowBeam({ layerCount }) {
  const ref = useRef();
  const x = yearToX(2026);
  const halfH = (layerCount * 1.8) / 2 + 1;

  useFrame((state) => {
    if (ref.current) {
      ref.current.material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.12;
    }
  });

  return (
    <mesh ref={ref} position={[x, 0, -0.1]}>
      <planeGeometry args={[0.04, halfH * 2]} />
      <meshBasicMaterial color="#8aaa6a" transparent opacity={0.25} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANE PLANES
// ═══════════════════════════════════════════════════════════════════════════════
function LanePlanes({ activeLayerIds, layerColors }) {
  const xMin = yearToX(-13800000000);
  const xMax = yearToX(2026);
  const width = xMax - xMin;
  const cx = (xMin + xMax) / 2;

  return (
    <group>
      {activeLayerIds.map((id, i) => {
        const lc = layerColors[id] || { color: "#9a8a7a" };
        const y = (i - (activeLayerIds.length - 1) / 2) * 1.8;
        return (
          <mesh key={id} position={[cx, y, -0.5]}>
            <planeGeometry args={[width, 0.01]} />
            <meshBasicMaterial color={lc.color} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN 3D VIEW
// ═══════════════════════════════════════════════════════════════════════════════
export default function TimelineView3D({
  events, layers, activeLayers, layerColors, theme,
  onSelectEvent, selectedEvent,
}) {
  const activeLayerIds = useMemo(
    () => layers.filter(l => activeLayers.has(l.id)).map(l => l.id),
    [layers, activeLayers]
  );

  const { positions, eventList } = useMemo(() => {
    const pos = [];
    const evts = [];
    events.forEach(ev => {
      if (!activeLayers.has(ev.layer)) return;
      const layerIdx = activeLayerIds.indexOf(ev.layer);
      if (layerIdx < 0) return;
      const x = yearToX(ev.year);
      const y = (layerIdx - (activeLayerIds.length - 1) / 2) * 1.8;
      const idHash = typeof ev.id === "number" ? ev.id : 1;
      const z = (ev.imp - 3) * 0.4 + (Math.sin(idHash * 7.3) * 0.3);
      pos.push(new THREE.Vector3(x, y, z));
      evts.push(ev);
    });
    return { positions: pos, eventList: evts };
  }, [events, activeLayers, activeLayerIds]);

  const isDark = theme === "dark";

  return (
    <Canvas
      style={{ width: "100%", height: "100%" }}
      camera={{ fov: 50, near: 0.1, far: 200, position: [12, 2, 14] }}
      gl={{ antialias: true }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={[isDark ? "#0d0c0a" : "#f5f0e8"]} />
      <fog attach="fog" args={[isDark ? "#0d0c0a" : "#f5f0e8", 25, 70]} />

      <ambientLight intensity={isDark ? 0.35 : 0.5} />
      <pointLight position={[20, 10, 10]} intensity={isDark ? 0.8 : 0.6} color={isDark ? "#c4aa6a" : "#8a7a5a"} />
      <pointLight position={[-10, -5, 5]} intensity={0.25} color="#6a8ab0" />

      <Stars3D />
      <TimeAxis layerCount={activeLayerIds.length} />
      <LayerLabels layers={layers} activeLayerIds={activeLayerIds} layerColors={layerColors} xPosition={yearToX(-13800000000)} />
      <LanePlanes activeLayerIds={activeLayerIds} layerColors={layerColors} />
      <NowBeam layerCount={activeLayerIds.length} />
      <ConnectionLines events={eventList} positions={positions} />

      {eventList.map((ev, i) => {
        const lc = layerColors[ev.layer] || { color: "#9a8a7a", accent: "#6a5a4a" };
        const size = 0.12 + ev.imp * 0.06;
        return (
          <EventSphere
            key={ev.id}
            ev={ev}
            position={[positions[i].x, positions[i].y, positions[i].z]}
            color={lc.color}
            size={size}
            onClick={onSelectEvent}
            isSelected={selectedEvent?.id === ev.id}
          />
        );
      })}

      <OrbitControls
        target={[8, 0, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        maxPolarAngle={Math.PI * 0.85}
      />
    </Canvas>
  );
}
